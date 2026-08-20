import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { needsApcPayment } from "@/lib/apc";
import {
  markApcPaid,
  paystackNotifyEmail,
  prepareApcPayment,
} from "@/lib/apc-checkout";
import {
  chargePaystackInSupportedCurrency,
  checkPaystackCharge,
  paystackConfigured,
  submitPaystackBirthday,
  submitPaystackOtp,
  submitPaystackPhone,
  submitPaystackPin,
  verifyPaystackTransaction,
  type PaystackChargeData,
} from "@/lib/paystack";
import {
  NAHDA_MERCHANT_NAME,
  sanitizeCardholderMessage,
} from "@/lib/payment-display";
import { CUSTOMER_CURRENCY } from "@/lib/payment-currency";
import { verifyApcPayToken } from "@/lib/payment-link";

const cardSchema = z.object({
  number: z.string().min(12).max(23),
  cvv: z.string().min(3).max(4),
  expiryMonth: z.string().min(1).max(2),
  expiryYear: z.string().min(2).max(4),
});

const startSchema = z.object({
  submissionId: z.string().min(1),
  token: z.string().min(1).optional(),
  action: z.literal("charge"),
  card: cardSchema,
});

const continueSchema = z.object({
  submissionId: z.string().min(1),
  token: z.string().min(1).optional(),
  action: z.enum(["pin", "otp", "birthday", "phone", "check"]),
  reference: z.string().min(1),
  pin: z.string().min(4).max(4).optional(),
  otp: z.string().min(4).max(10).optional(),
  birthday: z.string().min(8).max(12).optional(),
  phone: z.string().min(7).max(20).optional(),
});

function mapChargeResponse(data: PaystackChargeData) {
  const status = (data.status || "").toLowerCase();
  return {
    reference: data.reference,
    status,
    message: sanitizeCardholderMessage(
      data.display_text || data.message || data.gateway_response || null,
    ),
    authUrl: data.url || null,
    paid: status === "success",
    currency: CUSTOMER_CURRENCY,
    merchant: NAHDA_MERCHANT_NAME,
  };
}

async function loadPayableSubmission(raw: {
  submissionId?: string;
  token?: string;
}) {
  if (raw.token) {
    const fromLink = await verifyApcPayToken(raw.token);
    if (!fromLink) {
      return {
        error: jsonError("This payment link is invalid or has expired.", 401),
      };
    }
    const submission = await prisma.submission.findFirst({
      where: { id: fromLink.submissionId },
      include: {
        journal: true,
        author: { select: { name: true, email: true } },
        payment: true,
      },
    });
    if (!submission) return { error: jsonError("Submission not found", 404) };
    return { submission };
  }

  const session = await requireUser(["AUTHOR"]);
  if (!session) return { error: unauthorized() };
  if (!raw.submissionId) return { error: jsonError("Missing payment", 400) };

  const submission = await prisma.submission.findFirst({
    where: { id: raw.submissionId, authorId: session.sub },
    include: {
      journal: true,
      author: { select: { name: true, email: true } },
      payment: true,
    },
  });
  if (!submission) return { error: jsonError("Submission not found", 404) };
  return { submission };
}

async function finalizeIfPaid(opts: {
  submissionId: string;
  reference: string;
  authorEmail: string;
}) {
  const verified = await verifyPaystackTransaction(opts.reference);
  if (verified.status !== "success") {
    return { paid: false as const, status: verified.status };
  }

  await markApcPaid({
    submissionId: opts.submissionId,
    reference: verified.reference,
    customerEmail: opts.authorEmail,
  });

  return { paid: true as const, status: "success" };
}

/**
 * Custom Nahda checkout — charge via Paystack Charge API.
 * The author never sees Paystack's hosted checkout (no GHS popup).
 */
export async function POST(request: Request) {
  try {
    if (!paystackConfigured()) {
      return jsonError(
        "Paystack is not configured. Contact the editorial office.",
        503,
      );
    }

    const raw = await request.json();
    const action = typeof raw?.action === "string" ? raw.action : "charge";
    const loaded = await loadPayableSubmission({
      submissionId: typeof raw?.submissionId === "string" ? raw.submissionId : "",
      token: typeof raw?.token === "string" ? raw.token : undefined,
    });
    if ("error" in loaded) return loaded.error;
    const { submission } = loaded;

    if (!needsApcPayment(submission.apcPaymentStatus)) {
      return jsonOk({
        paid: true,
        status: "success",
        alreadyCleared: true,
        apcStatus: submission.apcPaymentStatus,
        currency: CUSTOMER_CURRENCY,
      });
    }

    if (submission.status !== "ACCEPTED") {
      return jsonError(
        "APC payment is only available after your manuscript is accepted.",
        400,
      );
    }

    const authorEmail = submission.author.email.trim();
    if (!authorEmail) {
      return jsonError("Author email is required to pay", 400);
    }

    if (action !== "charge") {
      const body = continueSchema.parse(raw);
      if (submission.payment?.paystackReference !== body.reference) {
        return jsonError("Payment reference mismatch", 400);
      }

      let data: PaystackChargeData;
      switch (body.action) {
        case "pin":
          if (!body.pin) return jsonError("PIN is required");
          data = await submitPaystackPin({
            reference: body.reference,
            pin: body.pin,
          });
          break;
        case "otp":
          if (!body.otp) return jsonError("OTP is required");
          data = await submitPaystackOtp({
            reference: body.reference,
            otp: body.otp,
          });
          break;
        case "birthday":
          if (!body.birthday) return jsonError("Birthday is required");
          data = await submitPaystackBirthday({
            reference: body.reference,
            birthday: body.birthday,
          });
          break;
        case "phone":
          if (!body.phone) return jsonError("Phone is required");
          data = await submitPaystackPhone({
            reference: body.reference,
            phone: body.phone,
          });
          break;
        case "check":
          data = await checkPaystackCharge(body.reference);
          break;
        default:
          return jsonError("Unknown action");
      }

      const mapped = mapChargeResponse(data);
      if (mapped.paid) {
        const done = await finalizeIfPaid({
          submissionId: submission.id,
          reference: body.reference,
          authorEmail,
        });
        return jsonOk({ ...mapped, ...done });
      }

      return jsonOk(mapped);
    }

    const body = startSchema.parse(raw);
    const prepared = await prepareApcPayment(submission);

    if (prepared.status === "PAID" || prepared.status === "NOT_REQUIRED") {
      return jsonOk({
        paid: true,
        status: "success",
        alreadyCleared: true,
        amountLabel: prepared.amountLabel,
        currency: CUSTOMER_CURRENCY,
        merchant: NAHDA_MERCHANT_NAME,
      });
    }

    const paymentId = prepared.paymentId;
    if (!prepared.reference || !paymentId) {
      return jsonError("Could not prepare payment", 500);
    }

    const data = await chargePaystackInSupportedCurrency({
      email: paystackNotifyEmail(authorEmail),
      usdCents: prepared.amountCents,
      paymentId,
      persistReference: async (reference) => {
        await prisma.payment.update({
          where: { id: paymentId },
          data: { paystackReference: reference },
        });
      },
      card: {
        number: body.card.number,
        cvv: body.card.cvv,
        expiry_month: body.card.expiryMonth,
        expiry_year: body.card.expiryYear,
      },
      metadata: {
        submissionId: submission.id,
        manuscriptId: submission.manuscriptId,
        paymentId,
        authorEmail,
        usdCents: String(prepared.amountCents),
        merchant: NAHDA_MERCHANT_NAME,
      },
    });

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paystackReference: data.reference,
        internalAmount: data.chargedAmount,
        internalCurrency: data.chargedCurrency,
      },
    });

    const mapped = mapChargeResponse(data);
    const reference = mapped.reference || data.reference;
    if (mapped.paid) {
      const done = await finalizeIfPaid({
        submissionId: submission.id,
        reference,
        authorEmail,
      });
      return jsonOk({
        ...mapped,
        ...done,
        reference,
        amountLabel: prepared.amountLabel,
        currency: CUSTOMER_CURRENCY,
        merchant: NAHDA_MERCHANT_NAME,
      });
    }

    return jsonOk({
      ...mapped,
      reference,
      amountLabel: prepared.amountLabel,
      currency: CUSTOMER_CURRENCY,
      merchant: NAHDA_MERCHANT_NAME,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[payments/charge]", err);
    const raw =
      err instanceof Error ? err.message : "Payment could not be completed";
    const userMessage = /currency not supported/i.test(raw)
      ? "Payment could not be completed. Please try again or contact the editorial office."
      : raw;
    return jsonError(userMessage, 500);
  }
}
