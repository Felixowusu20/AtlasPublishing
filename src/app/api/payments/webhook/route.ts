import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { markApcPaid } from "@/lib/apc-checkout";
import {
  getPaystackSecretKey,
  paystackConfigured,
  verifyPaystackTransaction,
} from "@/lib/paystack";
import {
  internalChargeMatches,
  isApcAlreadyCleared,
  metadataMatchesSubmission,
} from "@/lib/payment-verify";

function validSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  try {
    const expected = createHmac("sha512", getPaystackSecretKey())
      .update(rawBody)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Paystack webhook. Always re-verifies the transaction with Paystack.
 * Duplicate events are ignored once the APC is already marked paid.
 */
export async function POST(request: Request) {
  if (!paystackConfigured()) {
    return jsonError("Paystack is not configured", 503);
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  if (!validSignature(rawBody, signature)) {
    return jsonError("Invalid signature", 401);
  }

  let payload: {
    event?: string;
    data?: { reference?: string; status?: string };
  };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return jsonError("Invalid payload", 400);
  }

  const reference = payload.data?.reference;
  if (!reference) return jsonOk({ received: true });

  if (
    payload.event &&
    payload.event !== "charge.success" &&
    payload.event !== "transaction.success"
  ) {
    return jsonOk({ received: true, ignored: true });
  }

  try {
    const verified = await verifyPaystackTransaction(reference);
    if (verified.status !== "success") {
      return jsonOk({ received: true, paid: false });
    }

    const payment = await prisma.payment.findUnique({
      where: { paystackReference: verified.reference },
      include: { submission: true },
    });
    if (!payment) {
      return jsonOk({ received: true, unknown: true });
    }

    if (isApcAlreadyCleared(payment.status)) {
      return jsonOk({ received: true, duplicate: true, paid: true });
    }

    if (!metadataMatchesSubmission(verified.metadata, payment.submissionId)) {
      return jsonError("Payment does not match this manuscript", 400);
    }

    const ok = internalChargeMatches({
      verifiedAmount: verified.amount,
      verifiedCurrency: verified.currency,
      usdCents: payment.amountCents,
      storedInternalAmount: payment.internalAmount,
      storedInternalCurrency: payment.internalCurrency,
    });
    if (!ok) {
      console.error("[payments/webhook] amount mismatch", verified.reference);
      return jsonError("Paid amount does not match the APC", 400);
    }

    await markApcPaid({
      submissionId: payment.submissionId,
      reference: verified.reference,
      accessCode: payment.paystackAccessCode,
      customerEmail: verified.customer?.email ?? payment.customerEmail,
    });

    return jsonOk({ received: true, paid: true });
  } catch (err) {
    console.error("[payments/webhook]", err);
    return jsonError("Could not process webhook", 500);
  }
}
