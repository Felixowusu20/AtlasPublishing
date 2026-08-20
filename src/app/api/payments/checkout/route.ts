import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { needsApcPayment } from "@/lib/apc";
import { markApcPaid, prepareApcPayment } from "@/lib/apc-checkout";
import {
  paystackConfigured,
  verifyPaystackTransaction,
} from "@/lib/paystack";
import {
  CUSTOMER_CURRENCY,
  formatCustomerUsd,
} from "@/lib/payment-currency";
import {
  customerCheckoutRequestSchema,
  toCustomerCheckoutResponse,
  toCustomerPayment,
} from "@/lib/payment-dto";
import {
  internalChargeMatches,
  isApcAlreadyCleared,
  metadataMatchesSubmission,
} from "@/lib/payment-verify";

const confirmSchema = z.object({
  submissionId: z.string().min(1),
  reference: z.string().min(1).optional(),
});

/**
 * Author: prepare APC payment for the Nahda checkout popup (USD display).
 * Does not open Paystack hosted checkout.
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

    const body = customerCheckoutRequestSchema.parse(await request.json());

    const submission = await prisma.submission.findFirst({
      where: { id: body.submissionId, authorId: session.sub },
      include: {
        journal: true,
        author: { select: { name: true, email: true } },
        payment: true,
      },
    });

    if (!submission) return jsonError("Submission not found", 404);

    if (submission.status !== "ACCEPTED") {
      return jsonError(
        "APC payment is only available after your manuscript is accepted.",
        400,
      );
    }

    if (!needsApcPayment(submission.apcPaymentStatus)) {
      const customer = toCustomerPayment(submission.payment);
      return jsonOk({
        alreadyCleared: true,
        status: submission.apcPaymentStatus,
        currency: CUSTOMER_CURRENCY,
        amount: customer?.amount ?? 0,
        amountLabel:
          customer?.amountLabel ??
          (submission.payment
            ? formatCustomerUsd(submission.payment.amountCents)
            : null),
        paymentId: customer?.paymentId ?? null,
      });
    }

    const prepared = await prepareApcPayment(submission);
    const payment = prepared.payment ?? {
      id: prepared.paymentId ?? "none",
      amountCents: prepared.amountCents,
      status: prepared.status,
    };
    return jsonOk(
      toCustomerCheckoutResponse({
        payment,
        productName: submission.title,
        alreadyCleared: isApcAlreadyCleared(prepared.status),
      }),
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[payments/checkout]", err);
    return jsonError(
      err instanceof Error ? err.message : "Could not start checkout",
      500,
    );
  }
}

/**
 * Author: confirm payment after Paystack success redirect.
 * Verifies with Paystack server-side. Customer response is USD only.
 */
export async function PUT(request: Request) {
  const session = await requireUser(["AUTHOR"]);
  if (!session) return unauthorized();

  try {
    if (!paystackConfigured()) {
      return jsonError("Paystack is not configured", 503);
    }

    const body = confirmSchema.parse(await request.json());

    const submission = await prisma.submission.findFirst({
      where: { id: body.submissionId, authorId: session.sub },
      include: { payment: true, journal: true },
    });
    if (!submission) return jsonError("Submission not found", 404);

    if (!needsApcPayment(submission.apcPaymentStatus)) {
      const customer = toCustomerPayment(submission.payment);
      return jsonOk({
        status: submission.apcPaymentStatus,
        paid: true,
        currency: CUSTOMER_CURRENCY,
        amount: customer?.amount ?? 0,
        amountLabel: customer?.amountLabel ?? formatCustomerUsd(0),
      });
    }

    const reference =
      (typeof body.reference === "string" ? body.reference : null) ||
      submission.payment?.paystackReference ||
      null;
    if (!reference) {
      return jsonError(
        "No payment to confirm yet. Start checkout from this page first.",
        400,
      );
    }

    const verified = await verifyPaystackTransaction(reference);

    if (!metadataMatchesSubmission(verified.metadata, submission.id)) {
      return jsonError("Payment does not match this manuscript", 400);
    }

    if (verified.status !== "success") {
      return jsonError(
        "Payment not recorded yet. Finish checkout, then return to this page.",
        400,
      );
    }

    if (submission.payment && verified.amount > 0) {
      const ok = internalChargeMatches({
        verifiedAmount: verified.amount,
        verifiedCurrency: verified.currency,
        usdCents: submission.payment.amountCents,
        storedInternalAmount: submission.payment.internalAmount,
        storedInternalCurrency: submission.payment.internalCurrency,
      });
      if (!ok) {
        return jsonError(
          "Paid amount does not match the APC for this manuscript",
          400,
        );
      }
    }

    const updated = await markApcPaid({
      submissionId: submission.id,
      reference: verified.reference,
      accessCode: submission.payment?.paystackAccessCode,
      customerEmail:
        verified.customer?.email ?? submission.payment?.customerEmail,
    });

    const paidPayment = updated?.payment ?? submission.payment;
    const customer = toCustomerPayment(paidPayment);

    return jsonOk({
      status: updated?.apcPaymentStatus ?? "PAID",
      paid: true,
      currency: CUSTOMER_CURRENCY,
      amount: customer?.amount ?? 0,
      amountLabel:
        customer?.amountLabel ??
        formatCustomerUsd(paidPayment?.amountCents ?? 0),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[payments/confirm]", err);
    return jsonError(
      err instanceof Error ? err.message : "Could not confirm payment",
      500,
    );
  }
}
