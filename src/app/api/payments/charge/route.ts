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
  chargePaystackCard,
  checkPaystackCharge,
  makePaystackReference,
  paystackConfigured,
  resolvePaystackCharge,
  submitPaystackBirthday,
  submitPaystackOtp,
  submitPaystackPhone,
  submitPaystackPin,
  verifyPaystackTransaction,
  type PaystackChargeData,
} from "@/lib/paystack";

const cardSchema = z.object({
  number: z.string().min(12).max(23),
  cvv: z.string().min(3).max(4),
  expiryMonth: z.string().min(1).max(2),
  expiryYear: z.string().min(2).max(4),
});

const startSchema = z.object({
  submissionId: z.string().min(1),
  action: z.literal("charge"),
  card: cardSchema,
});

const continueSchema = z.object({
  submissionId: z.string().min(1),
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
    message: data.display_text || data.message || data.gateway_response || null,
    authUrl: data.url || null,
    paid: status === "success",
  };
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
 * Custom Nahda checkout — charge card via Paystack Charge API (no hosted popup).
 * Card details are forwarded to Paystack only and never stored.
 */
export async function POST(request: Request) {
  const session = await requireUser(["AUTHOR"]);
  if (!session) return unauthorized();

  try {
    if (!paystackConfigured()) {
      return jsonError(
        "Paystack is not configured. Contact the editorial office.",
        503,
      );
    }

    const raw = await request.json();
    const action = typeof raw?.action === "string" ? raw.action : "charge";

    const submission = await prisma.submission.findFirst({
      where: {
        id: String(raw?.submissionId ?? ""),
        authorId: session.sub,
      },
      include: {
        journal: true,
        author: { select: { name: true, email: true } },
        payment: true,
      },
    });

    if (!submission) return jsonError("Submission not found", 404);

    if (!needsApcPayment(submission.apcPaymentStatus)) {
      return jsonOk({
        paid: true,
        status: "success",
        alreadyCleared: true,
        apcStatus: submission.apcPaymentStatus,
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

    // —— Continue auth (PIN / OTP / birthday / phone / poll) ——
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

    // —— Start card charge ——
    const body = startSchema.parse(raw);
    const prepared = await prepareApcPayment(submission);

    if (prepared.status === "PAID" || prepared.status === "NOT_REQUIRED") {
      return jsonOk({
        paid: true,
        status: "success",
        alreadyCleared: true,
        amountLabel: prepared.amountLabel,
      });
    }

    if (!prepared.reference || !prepared.paymentId) {
      return jsonError("Could not prepare payment", 500);
    }

    // Fresh reference for each charge attempt (Paystack refs are one-shot)
    const reference = makePaystackReference(prepared.paymentId);
    await prisma.payment.update({
      where: { id: prepared.paymentId },
      data: { paystackReference: reference },
    });

    const chargeMeta = resolvePaystackCharge(prepared.amountCents);
    // Prefer merchant settlement currency (GHS on this account) for the actual charge
    const chargedAmount =
      prepared.chargedAmount > 0 ? prepared.chargedAmount : chargeMeta.amount;
    const chargedCurrency =
      prepared.chargedCurrency || chargeMeta.currency || "GHS";

    const data = await chargePaystackCard({
      email: paystackNotifyEmail(authorEmail),
      amount: chargedAmount,
      currency: chargedCurrency,
      reference,
      card: {
        number: body.card.number,
        cvv: body.card.cvv,
        expiry_month: body.card.expiryMonth,
        expiry_year: body.card.expiryYear,
      },
      metadata: {
        submissionId: submission.id,
        manuscriptId: submission.manuscriptId,
        paymentId: prepared.paymentId,
        apcUsd: prepared.amountLabel,
        authorEmail,
        usdCents: String(prepared.amountCents),
      },
    });

    const mapped = mapChargeResponse(data);
    if (mapped.paid) {
      const done = await finalizeIfPaid({
        submissionId: submission.id,
        reference,
        authorEmail,
      });
      return jsonOk({
        ...mapped,
        ...done,
        amountLabel: prepared.amountLabel,
      });
    }

    return jsonOk({
      ...mapped,
      amountLabel: prepared.amountLabel,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[payments/charge]", err);
    return jsonError(
      err instanceof Error ? err.message : "Payment could not be completed",
      500,
    );
  }
}
