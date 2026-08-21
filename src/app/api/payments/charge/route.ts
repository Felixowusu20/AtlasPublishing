import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireUser } from "@/lib/session";
import {
  markApcPaid,
  nahdaReceiptNumber,
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
  verifyPaystackTransactionSafe,
  type PaystackChargeData,
} from "@/lib/paystack";
import {
  NAHDA_MERCHANT_NAME,
  OTP_ACCOUNT_PROMPT,
  cardholderChargeMessage,
  otpVerificationError,
  otpVerificationFailedMessage,
} from "@/lib/payment-display";
import { CUSTOMER_CURRENCY, formatCustomerUsd } from "@/lib/payment-currency";
import { resolveApcPayLink } from "@/lib/payment-link";
import {
  mapPaystackAuthStatus,
  type ChargeAuthPhase,
} from "@/lib/paystack-charge-status";

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

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapChargeResponse(
  data: PaystackChargeData,
  amountLabel: string | null | undefined,
  phase: ChargeAuthPhase,
) {
  const mapped = mapPaystackAuthStatus(data, phase);
  const raw =
    phase === "start"
      ? data.display_text || data.message || data.gateway_response || null
      : data.gateway_response || data.message || data.display_text || null;
  const failed = ["failed", "reversed", "abandoned"].includes(mapped.status);
  const message =
    phase === "auth" || phase === "check"
      ? failed
        ? otpVerificationFailedMessage(raw)
        : otpVerificationError(raw)
      : cardholderChargeMessage({
          message: raw,
          status: mapped.status,
          amountLabel,
        });
  return {
    reference: data.reference,
    status: mapped.status,
    message: mapped.paid ? null : message,
    bankHint: data.display_text || null,
    authUrl: data.url || null,
    paid: mapped.paid,
    currency: CUSTOMER_CURRENCY,
    merchant: NAHDA_MERCHANT_NAME,
  };
}

function amountLabelFor(payment: { amountCents: number } | null | undefined) {
  if (!payment) return null;
  return formatCustomerUsd(payment.amountCents);
}

function confirmationPayload(
  submission: {
    manuscriptId: string;
    author: { email: string };
    payment: { amountCents: number; paidAt: Date | null } | null;
  },
  reference: string,
) {
  const paidAt = submission.payment?.paidAt ?? new Date();
  const amountCents = submission.payment?.amountCents ?? 0;
  return {
    paid: true as const,
    status: "success" as const,
    reference,
    amountLabel: formatCustomerUsd(amountCents),
    currency: CUSTOMER_CURRENCY,
    merchant: NAHDA_MERCHANT_NAME,
    receiptNumber: nahdaReceiptNumber(submission.manuscriptId, paidAt),
    paidAtLabel: paidAt.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    emailSentTo: submission.author.email,
  };
}

async function loadPayableSubmission(raw: {
  submissionId?: string;
  token?: string;
}) {
  if (raw.token) {
    const fromLink = await resolveApcPayLink(raw.token);
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

async function settlePayment(opts: {
  submissionId: string;
  reference: string;
  authorEmail: string;
  attempts?: number;
}): Promise<
  | ReturnType<typeof confirmationPayload>
  | { paid: false; status: string; reference: string }
> {
  const attempts = Math.max(1, opts.attempts ?? 1);
  let lastStatus = "pending";

  for (let i = 0; i < attempts; i++) {
    const verified = await verifyPaystackTransactionSafe(opts.reference);
    if (verified?.status === "success") {
      const updated = await markApcPaid({
        submissionId: opts.submissionId,
        reference: verified.reference || opts.reference,
        customerEmail: opts.authorEmail,
      });
      if (updated) {
        return confirmationPayload(updated, verified.reference || opts.reference);
      }
    }
    lastStatus = (verified?.status || lastStatus).toLowerCase();
    if (lastStatus === "failed" || lastStatus === "reversed") {
      return { paid: false, status: lastStatus, reference: opts.reference };
    }
    if (i < attempts - 1) await wait(500);
  }

  return { paid: false, status: lastStatus, reference: opts.reference };
}

async function referenceForContinue(
  payment: { id: string; paystackReference: string | null } | null,
  bodyReference: string,
) {
  if (!payment) return bodyReference;
  const stored = payment.paystackReference;
  if (!stored) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { paystackReference: bodyReference },
    });
    return bodyReference;
  }
  if (stored === bodyReference) return bodyReference;
  const prefix = `nahda_${payment.id.slice(0, 12)}_`;
  if (bodyReference.startsWith(prefix) || stored.startsWith(prefix)) {
    return bodyReference;
  }
  return null;
}

/**
 * Custom Nahda checkout — charge via Paystack Charge API.
 * The author never sees Paystack's hosted checkout (no GHS popup).
 */
export async function POST(request: Request) {
  let resumeReference: string | null = null;
  let settleCtx: { submissionId: string; authorEmail: string } | null = null;
  let action = "charge";
  try {
    if (!paystackConfigured()) {
      return jsonError(
        "Paystack is not configured. Contact the editorial office.",
        503,
      );
    }

    const raw = await request.json();
    action = typeof raw?.action === "string" ? raw.action : "charge";
    const loaded = await loadPayableSubmission({
      submissionId: typeof raw?.submissionId === "string" ? raw.submissionId : "",
      token: typeof raw?.token === "string" ? raw.token : undefined,
    });
    if ("error" in loaded) return loaded.error;
    const { submission } = loaded;
    resumeReference = submission.payment?.paystackReference ?? null;
    settleCtx = {
      submissionId: submission.id,
      authorEmail: submission.author.email.trim(),
    };

    if (
      submission.apcPaymentStatus === "PAID" ||
      submission.apcPaymentStatus === "WAIVED"
    ) {
      return jsonOk({
        alreadyCleared: true,
        apcStatus: submission.apcPaymentStatus,
        ...confirmationPayload(submission, resumeReference || submission.id),
      });
    }

    if (
      submission.status !== "ACCEPTED" &&
      submission.status !== "IN_PRODUCTION"
    ) {
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
      const reference = await referenceForContinue(
        submission.payment,
        body.reference,
      );
      if (!reference) {
        return jsonError("Payment reference mismatch", 400);
      }
      resumeReference = reference;

      let data: PaystackChargeData;
      const phase: ChargeAuthPhase = body.action === "check" ? "check" : "auth";
      switch (body.action) {
        case "pin":
          if (!body.pin) return jsonError("PIN is required");
          data = await submitPaystackPin({
            reference,
            pin: body.pin,
          });
          break;
        case "otp":
          if (!body.otp) return jsonError("OTP is required");
          data = await submitPaystackOtp({
            reference,
            otp: body.otp,
          });
          break;
        case "birthday":
          if (!body.birthday) return jsonError("Birthday is required");
          data = await submitPaystackBirthday({
            reference,
            birthday: body.birthday,
          });
          break;
        case "phone":
          if (!body.phone) return jsonError("Phone is required");
          data = await submitPaystackPhone({
            reference,
            phone: body.phone,
          });
          break;
        case "check":
          try {
            data = await checkPaystackCharge(reference);
          } catch {
            data = { reference, status: "pending" };
          }
          break;
        default:
          return jsonError("Unknown action");
      }

      const mapped = mapChargeResponse(
        data,
        amountLabelFor(submission.payment),
        phase,
      );
      const shouldSettle =
        mapped.paid ||
        body.action === "check" ||
        mapped.status === "pending" ||
        mapped.status === "ongoing";
      if (shouldSettle) {
        const settled = await settlePayment({
          submissionId: submission.id,
          reference: mapped.reference || reference,
          authorEmail,
          attempts: mapped.paid || body.action === "otp" ? 5 : 1,
        });
        if (settled.paid) {
          return jsonOk({
            ...mapped,
            ...settled,
            paid: true,
            status: "success",
            authUrl: null,
          });
        }
      }

      return jsonOk({
        ...mapped,
        paid: false,
        reference: mapped.reference || reference,
        amountLabel: amountLabelFor(submission.payment),
      });
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
        resumeReference = reference;
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

    const reference = data.reference || resumeReference || prepared.reference;
    resumeReference = reference;
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paystackReference: reference,
        internalAmount: data.chargedAmount,
        internalCurrency: data.chargedCurrency,
      },
    });

    const mapped = mapChargeResponse(data, prepared.amountLabel, "start");
    if (mapped.paid) {
      const done = await settlePayment({
        submissionId: submission.id,
        reference,
        authorEmail,
        attempts: 5,
      });
      if (done.paid) {
        return jsonOk({
          ...mapped,
          ...done,
          reference,
          amountLabel: prepared.amountLabel,
          currency: CUSTOMER_CURRENCY,
          merchant: NAHDA_MERCHANT_NAME,
        });
      }
    }

    return jsonOk({
      ...mapped,
      paid: false,
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
    if (/authorization was abandoned/i.test(raw) && settleCtx && resumeReference) {
      const done = await settlePayment({
        ...settleCtx,
        reference: resumeReference,
        attempts: 2,
      });
      if (done.paid) {
        return jsonOk({
          ...done,
          authUrl: null,
          message: null,
        });
      }
      return jsonOk({
        status: action === "otp" ? "send_otp" : "abandoned",
        reference: resumeReference,
        message:
          action === "otp"
            ? otpVerificationError(raw) || OTP_ACCOUNT_PROMPT
            : cardholderChargeMessage({ message: raw }) || raw,
        authUrl: null,
        paid: false,
        currency: CUSTOMER_CURRENCY,
        merchant: NAHDA_MERCHANT_NAME,
      });
    }
    const userMessage = /currency not supported/i.test(raw)
      ? "Payment could not be completed. Please try again or contact the editorial office."
      : cardholderChargeMessage({ message: raw }) || raw;
    return jsonError(userMessage, 500);
  }
}
