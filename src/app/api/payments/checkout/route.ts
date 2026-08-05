import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { formatApcAmount, needsApcPayment } from "@/lib/apc";
import { markApcPaid, prepareApcPayment } from "@/lib/apc-checkout";
import {
  paystackConfigured,
  usdToPaystackAmount,
  verifyPaystackTransaction,
} from "@/lib/paystack";

/**
 * Author: prepare APC payment for the custom Nahda checkout (USD display).
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

    const body = z
      .object({ submissionId: z.string().min(1) })
      .parse(await request.json());

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
      return jsonOk({
        alreadyCleared: true,
        status: submission.apcPaymentStatus,
        amountLabel: submission.payment
          ? formatApcAmount(submission.payment.amountCents, "usd")
          : null,
      });
    }

    const prepared = await prepareApcPayment(submission);
    const cleared =
      prepared.status === "PAID" ||
      prepared.status === "NOT_REQUIRED" ||
      prepared.status === "WAIVED";
    return jsonOk({
      alreadyCleared: cleared,
      status: prepared.status,
      reference: prepared.reference ?? null,
      amountCents: prepared.amountCents,
      amountLabel: prepared.amountLabel,
    });
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
 * No webhook required — we verify the transaction reference with Paystack.
 *
 * Body: { submissionId, reference? }
 * If reference is omitted, uses the stored paystackReference.
 */
export async function PUT(request: Request) {
  const session = await requireUser(["AUTHOR"]);
  if (!session) return unauthorized();

  try {
    if (!paystackConfigured()) {
      return jsonError("Paystack is not configured", 503);
    }

    const body = z
      .object({
        submissionId: z.string().min(1),
        reference: z.string().min(1).optional(),
      })
      .parse(await request.json());

    const submission = await prisma.submission.findFirst({
      where: { id: body.submissionId, authorId: session.sub },
      include: { payment: true },
    });
    if (!submission) return jsonError("Submission not found", 404);

    if (!needsApcPayment(submission.apcPaymentStatus)) {
      return jsonOk({
        status: submission.apcPaymentStatus,
        paid: true,
      });
    }

    const reference =
      body.reference || submission.payment?.paystackReference || null;
    if (!reference) {
      return jsonError(
        "No Paystack reference found. Click Pay now first.",
        400,
      );
    }

    const verified = await verifyPaystackTransaction(reference);

    const meta =
      typeof verified.metadata === "object" && verified.metadata
        ? verified.metadata
        : {};
    const metaSubmissionId =
      typeof meta.submissionId === "string" ? meta.submissionId : null;
    if (metaSubmissionId && metaSubmissionId !== submission.id) {
      return jsonError("Payment does not match this manuscript", 400);
    }

    if (verified.status !== "success") {
      return jsonError(
        "Payment not recorded yet. Finish checkout, then click I’ve paid.",
        400,
      );
    }

    // Payment.amountCents is always USD; Paystack charges merchant currency after FX.
    if (submission.payment && verified.amount > 0) {
      const chargedCurrency = (verified.currency || "GHS").toUpperCase();
      const expectedAmount = usdToPaystackAmount(
        submission.payment.amountCents,
        chargedCurrency,
      );
      const ok =
        verified.amount === expectedAmount ||
        (chargedCurrency === "USD" &&
          verified.amount === submission.payment.amountCents);
      if (!ok) {
        const metaUsd =
          typeof meta.usdCents === "string" ? Number(meta.usdCents) : NaN;
        if (
          !Number.isFinite(metaUsd) ||
          metaUsd !== submission.payment.amountCents
        ) {
          // Allow ~1% FX rounding drift
          const drift = Math.abs(verified.amount - expectedAmount);
          if (drift > Math.max(100, expectedAmount * 0.01)) {
            return jsonError(
              "Paid amount does not match the APC for this manuscript",
              400,
            );
          }
        }
      }
    }

    const updated = await markApcPaid({
      submissionId: submission.id,
      reference: verified.reference,
      accessCode: submission.payment?.paystackAccessCode,
      customerEmail:
        verified.customer?.email ?? submission.payment?.customerEmail,
    });

    return jsonOk({
      status: updated?.apcPaymentStatus ?? "PAID",
      paid: true,
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
