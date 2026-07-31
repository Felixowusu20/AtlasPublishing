import { prisma } from "@/lib/db";
import {
  formatApcAmount,
  parseApcAmountCents,
} from "@/lib/apc";
import { appBaseUrl, getStripe } from "@/lib/stripe";
import { progressForStatus } from "@/lib/submission-utils";
import type { Journal, Payment, Submission } from "@/generated/prisma/client";

type SubmissionWithJournal = Submission & {
  journal: Journal;
  payment?: Payment | null;
  author?: { email: string; name: string };
};

/**
 * After accept: create/update Payment row and a Stripe Checkout Session.
 * If APC is $0, marks NOT_REQUIRED and moves the paper to IN_PRODUCTION.
 */
export async function ensureApcCheckout(
  submission: SubmissionWithJournal,
): Promise<{
  checkoutUrl: string | null;
  amountCents: number;
  status: string;
  paymentId: string | null;
}> {
  const amountCents = parseApcAmountCents(submission.journal.apc, {
    openAccess: submission.journal.openAccess,
  });

  if (amountCents <= 0) {
    await prisma.$transaction([
      prisma.submission.update({
        where: { id: submission.id },
        data: {
          apcPaymentStatus: "NOT_REQUIRED",
          apcPaidAt: null,
          status: "IN_PRODUCTION",
          progress: progressForStatus("IN_PRODUCTION"),
          actionRequired: null,
        },
      }),
      prisma.payment.upsert({
        where: { submissionId: submission.id },
        create: {
          submissionId: submission.id,
          amountCents: 0,
          currency: "usd",
          status: "NOT_REQUIRED",
        },
        update: {
          amountCents: 0,
          status: "NOT_REQUIRED",
          paidAt: null,
        },
      }),
    ]);
    return {
      checkoutUrl: null,
      amountCents: 0,
      status: "NOT_REQUIRED",
      paymentId: null,
    };
  }

  const stripe = getStripe();
  const base = appBaseUrl();
  const amountLabel = formatApcAmount(amountCents);

  const payment = await prisma.payment.upsert({
    where: { submissionId: submission.id },
    create: {
      submissionId: submission.id,
      amountCents,
      currency: "usd",
      status: "PENDING",
    },
    update: {
      amountCents,
      currency: "usd",
      status: "PENDING",
      paidAt: null,
      waivedAt: null,
    },
  });

  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      apcPaymentStatus: "PENDING",
      apcPaidAt: null,
      actionRequired: `Please pay the article processing charge (${amountLabel}) to continue to production.`,
    },
  });

  if (payment.stripeCheckoutSessionId) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(
        payment.stripeCheckoutSessionId,
      );
      if (
        existing.status === "open" &&
        typeof existing.url === "string" &&
        existing.url
      ) {
        return {
          checkoutUrl: existing.url,
          amountCents,
          status: "PENDING",
          paymentId: payment.id,
        };
      }
    } catch {
      // create a fresh session below
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: submission.author?.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: `APC: ${submission.journal.shortTitle || submission.journal.title}`,
            description: `${submission.manuscriptId}: ${submission.title}`.slice(
              0,
              500,
            ),
          },
        },
      },
    ],
    metadata: {
      submissionId: submission.id,
      manuscriptId: submission.manuscriptId,
      paymentId: payment.id,
    },
    success_url: `${base}/submissions/${submission.id}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/submissions/${submission.id}?payment=cancelled`,
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  if (!session.url) {
    throw new Error("Stripe Checkout Session was created without a URL");
  }

  return {
    checkoutUrl: session.url,
    amountCents,
    status: "PENDING",
    paymentId: payment.id,
  };
}

/** Mark APC paid and move the manuscript to IN_PRODUCTION (publish queue). */
export async function markApcPaid(opts: {
  submissionId: string;
  sessionId?: string | null;
  paymentIntentId?: string | null;
  customerEmail?: string | null;
  receiptUrl?: string | null;
}) {
  const submission = await prisma.submission.findUnique({
    where: { id: opts.submissionId },
    include: { author: true, journal: true, payment: true },
  });
  if (!submission) return null;

  if (
    submission.apcPaymentStatus === "PAID" ||
    submission.apcPaymentStatus === "WAIVED" ||
    submission.apcPaymentStatus === "NOT_REQUIRED"
  ) {
    if (submission.status === "ACCEPTED") {
      return prisma.submission.update({
        where: { id: submission.id },
        data: {
          status: "IN_PRODUCTION",
          progress: progressForStatus("IN_PRODUCTION"),
          actionRequired: null,
        },
        include: { author: true, journal: true, payment: true },
      });
    }
    return submission;
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.payment.upsert({
      where: { submissionId: opts.submissionId },
      create: {
        submissionId: opts.submissionId,
        amountCents: submission.payment?.amountCents ?? 0,
        currency: "usd",
        status: "PAID",
        stripeCheckoutSessionId: opts.sessionId ?? undefined,
        stripePaymentIntentId: opts.paymentIntentId ?? undefined,
        stripeCustomerEmail: opts.customerEmail ?? undefined,
        receiptUrl: opts.receiptUrl ?? undefined,
        paidAt: new Date(),
      },
      update: {
        status: "PAID",
        stripeCheckoutSessionId: opts.sessionId ?? undefined,
        stripePaymentIntentId: opts.paymentIntentId ?? undefined,
        stripeCustomerEmail: opts.customerEmail ?? undefined,
        receiptUrl: opts.receiptUrl ?? undefined,
        paidAt: new Date(),
      },
    });

    const sub = await tx.submission.update({
      where: { id: opts.submissionId },
      data: {
        apcPaymentStatus: "PAID",
        apcPaidAt: new Date(),
        status: "IN_PRODUCTION",
        progress: progressForStatus("IN_PRODUCTION"),
        actionRequired: null,
      },
      include: { author: true, journal: true, payment: true },
    });

    await tx.notification.create({
      data: {
        userId: sub.authorId,
        submissionId: sub.id,
        title: "Payment received",
        body: `Payment for “${sub.title}” was received. Your manuscript is now in production.`,
      },
    });

    return sub;
  });

  return updated;
}
