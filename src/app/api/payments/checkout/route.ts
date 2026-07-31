import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { formatApcAmount, needsApcPayment } from "@/lib/apc";
import { ensureApcCheckout, markApcPaid } from "@/lib/apc-checkout";
import { getStripe, stripeConfigured } from "@/lib/stripe";

/**
 * Author: create or resume Stripe Checkout for an accepted manuscript APC.
 */
export async function POST(request: Request) {
  const session = await requireUser(["AUTHOR"]);
  if (!session) return unauthorized();

  try {
    if (!stripeConfigured()) {
      return jsonError(
        "Stripe is not configured. Contact the editorial office.",
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
        checkoutUrl: null,
        amountLabel: submission.payment
          ? formatApcAmount(submission.payment.amountCents)
          : null,
      });
    }

    const checkout = await ensureApcCheckout(submission);
    return jsonOk({
      alreadyCleared: false,
      status: checkout.status,
      checkoutUrl: checkout.checkoutUrl,
      amountCents: checkout.amountCents,
      amountLabel: formatApcAmount(checkout.amountCents),
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
 * Author: confirm payment after Stripe success redirect.
 * No webhook required — we ask Stripe if the Checkout Session is paid.
 *
 * Body: { submissionId, sessionId? }
 * If sessionId is omitted, uses the stored stripeCheckoutSessionId.
 */
export async function PUT(request: Request) {
  const session = await requireUser(["AUTHOR"]);
  if (!session) return unauthorized();

  try {
    if (!stripeConfigured()) {
      return jsonError("Stripe is not configured", 503);
    }

    const body = z
      .object({
        submissionId: z.string().min(1),
        sessionId: z.string().min(1).optional(),
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

    const sessionId =
      body.sessionId || submission.payment?.stripeCheckoutSessionId || null;
    if (!sessionId) {
      return jsonError(
        "No checkout session found. Click Pay now first.",
        400,
      );
    }

    const stripe = getStripe();
    const checkout = await stripe.checkout.sessions.retrieve(sessionId);

    if (
      checkout.metadata?.submissionId &&
      checkout.metadata.submissionId !== submission.id
    ) {
      return jsonError("Checkout session does not match this manuscript", 400);
    }

    if (checkout.payment_status !== "paid") {
      return jsonError(
        "Payment not recorded yet. Finish checkout, then click I’ve paid.",
        400,
      );
    }

    const paymentIntentId =
      typeof checkout.payment_intent === "string"
        ? checkout.payment_intent
        : checkout.payment_intent?.id ?? null;

    const updated = await markApcPaid({
      submissionId: submission.id,
      sessionId: checkout.id,
      paymentIntentId,
      customerEmail: checkout.customer_details?.email ?? checkout.customer_email,
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
