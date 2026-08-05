import { prisma } from "@/lib/db";
import {
  formatApcAmount,
  parseApcAmountCents,
} from "@/lib/apc";
import {
  appBaseUrl,
  getMerchantCurrencies,
  makePaystackReference,
  resolvePaystackCharge,
  usdToPaystackAmount,
  verifyPaystackTransaction,
} from "@/lib/paystack";
import { progressForStatus } from "@/lib/submission-utils";
import { notifyAdmins } from "@/lib/notify-admins";
import { apcReceiptEmailHtml, sendEmail } from "@/lib/mail";
import type { Journal, Payment, Submission } from "@/generated/prisma/client";

type SubmissionWithJournal = Submission & {
  journal: Journal;
  payment?: Payment | null;
  author?: { email: string; name: string };
};

/**
 * After accept: create/update Payment row for custom Nahda checkout (Paystack Charge).
 * If APC is $0, marks NOT_REQUIRED and moves the paper to IN_PRODUCTION.
 * Does not open Paystack's hosted popup — authors pay on our branded form.
 */
export async function prepareApcPayment(
  submission: SubmissionWithJournal,
): Promise<{
  amountCents: number;
  amountLabel: string;
  status: string;
  paymentId: string | null;
  reference: string | null;
  authorEmail: string | null;
  chargedAmount: number;
  chargedCurrency: string;
}> {
  const usdCents = parseApcAmountCents(submission.journal.apc, {
    openAccess: submission.journal.openAccess,
  });
  // Author-facing label always USD; gateway charge uses merchant settlement currency
  const display = resolvePaystackCharge(usdCents);
  const merchantCurrencies = await getMerchantCurrencies();
  const gatewayCurrency = (
    merchantCurrencies.find((c) => c !== "USD") ||
    merchantCurrencies[0] ||
    "GHS"
  ).toUpperCase();
  const gatewayAmount = usdToPaystackAmount(usdCents, gatewayCurrency);
  const displayCurrency = "usd";

  if (usdCents <= 0) {
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
          currency: displayCurrency,
          status: "NOT_REQUIRED",
        },
        update: {
          amountCents: 0,
          currency: displayCurrency,
          status: "NOT_REQUIRED",
          paidAt: null,
        },
      }),
    ]);
    return {
      amountCents: 0,
      amountLabel: formatApcAmount(0, "usd"),
      status: "NOT_REQUIRED",
      paymentId: null,
      reference: null,
      authorEmail: submission.author?.email ?? null,
      chargedAmount: 0,
      chargedCurrency: gatewayCurrency,
    };
  }

  const amountLabel = display.label;

  const payment = await prisma.payment.upsert({
    where: { submissionId: submission.id },
    create: {
      submissionId: submission.id,
      amountCents: usdCents,
      currency: displayCurrency,
      status: "PENDING",
    },
    update: {
      amountCents: usdCents,
      currency: displayCurrency,
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
      status: "ACCEPTED",
      progress: progressForStatus("ACCEPTED"),
      actionRequired: `Please pay the article processing charge (${amountLabel}) to continue to production.`,
    },
  });

  if (payment.paystackReference) {
    try {
      const existing = await verifyPaystackTransaction(payment.paystackReference);
      if (existing.status === "success") {
        await markApcPaid({
          submissionId: submission.id,
          reference: existing.reference,
          accessCode: payment.paystackAccessCode,
          customerEmail: submission.author?.email,
        });
        return {
          amountCents: usdCents,
          amountLabel,
          status: "PAID",
          paymentId: payment.id,
          reference: existing.reference,
          authorEmail: submission.author?.email ?? null,
          chargedAmount: gatewayAmount,
          chargedCurrency: gatewayCurrency,
        };
      }
    } catch {
      // Fresh charge below
    }
  }

  const email = submission.author?.email?.trim() || null;
  const reference = makePaystackReference(payment.id);

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      paystackReference: reference,
      paystackAccessCode: null,
      customerEmail: email,
      amountCents: usdCents,
      currency: displayCurrency,
    },
  });

  return {
    amountCents: usdCents,
    amountLabel,
    status: "PENDING",
    paymentId: payment.id,
    reference,
    authorEmail: email,
    chargedAmount: gatewayAmount,
    chargedCurrency: gatewayCurrency,
  };
}

/** @deprecated Prefer prepareApcPayment — kept for any lingering popup callers. */
export async function ensureApcCheckout(
  submission: SubmissionWithJournal,
): Promise<{
  checkoutUrl: string | null;
  accessCode?: string | null;
  reference?: string | null;
  amountCents: number;
  amountLabel: string;
  status: string;
  paymentId: string | null;
}> {
  const prepared = await prepareApcPayment(submission);
  return {
    checkoutUrl: null,
    accessCode: null,
    reference: prepared.reference,
    amountCents: prepared.amountCents,
    amountLabel: prepared.amountLabel,
    status: prepared.status,
    paymentId: prepared.paymentId,
  };
}

/** Inbox for Paystack’s own notices (authors get Nahda receipt instead). */
export function paystackNotifyEmail(authorEmail: string): string {
  return (
    (process.env.PAYSTACK_RECEIPT_INBOX ?? "").trim() ||
    (process.env.SMTP_FROM ?? "")
      .replace(/^.*<([^>]+)>.*$/, "$1")
      .trim() ||
    (process.env.SMTP_USER ?? "").trim() ||
    authorEmail
  );
}

/** Mark APC paid and move the manuscript to IN_PRODUCTION (publish queue). */
export async function markApcPaid(opts: {
  submissionId: string;
  reference?: string | null;
  accessCode?: string | null;
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

  // USD amount from journal APC (admin panel). Prefer stored checkout amount when set.
  const journalUsdCents = parseApcAmountCents(submission.journal.apc, {
    openAccess: submission.journal.openAccess,
  });
  const amountCents =
    submission.payment?.amountCents && submission.payment.amountCents > 0
      ? submission.payment.amountCents
      : journalUsdCents;
  const amountLabel = formatApcAmount(amountCents, "usd");
  const currency = "usd";
  const authorReceiptEmail = submission.author.email;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.payment.upsert({
      where: { submissionId: opts.submissionId },
      create: {
        submissionId: opts.submissionId,
        amountCents,
        currency,
        status: "PAID",
        paystackReference: opts.reference ?? undefined,
        paystackAccessCode: opts.accessCode ?? undefined,
        customerEmail: authorReceiptEmail,
        receiptUrl: opts.receiptUrl ?? undefined,
        paidAt: new Date(),
      },
      update: {
        status: "PAID",
        amountCents,
        currency,
        paystackReference: opts.reference ?? undefined,
        paystackAccessCode: opts.accessCode ?? undefined,
        customerEmail: authorReceiptEmail,
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
        body: `Payment of ${amountLabel} USD for “${sub.title}” was received. Your manuscript is now in production.`,
      },
    });

    return sub;
  });

  const base = appBaseUrl();
  const paidAt = updated.payment?.paidAt ?? new Date();
  const receiptNumber = `NPR-${updated.manuscriptId.replace(/[^A-Za-z0-9]/g, "").slice(0, 12)}-${paidAt.getTime().toString(36).toUpperCase()}`;

  try {
    const mail = await sendEmail({
      to: updated.author.email,
      subject: `Nahda Publications receipt: ${updated.manuscriptId} — ${amountLabel} USD`,
      html: apcReceiptEmailHtml({
        authorName: updated.author.name,
        title: updated.title,
        manuscriptId: updated.manuscriptId,
        journalTitle: updated.journal.title,
        amountLabel,
        paidAtLabel: paidAt.toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
        reference: opts.reference ?? updated.payment?.paystackReference,
        receiptNumber,
        submissionUrl: `${base}/submissions/${updated.id}`,
      }),
      text: [
        `Nahda Publications — APC payment receipt`,
        ``,
        `Receipt: ${receiptNumber}`,
        `Status: PAID`,
        `Amount paid (USD): ${amountLabel}`,
        `Journal: ${updated.journal.title}`,
        `Manuscript: ${updated.manuscriptId}`,
        `Title: ${updated.title}`,
        `Paid on: ${paidAt.toISOString()}`,
        opts.reference ? `Reference: ${opts.reference}` : "",
        ``,
        `Your manuscript is now in production.`,
        `${base}/submissions/${updated.id}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });
    if (mail.skipped) {
      console.warn(
        "[apc-receipt] SMTP not configured — Nahda receipt was not emailed",
      );
    } else if (!mail.ok) {
      console.error("[apc-receipt] send failed", mail.error);
    } else {
      console.info(
        `[apc-receipt] sent Nahda USD receipt to ${updated.author.email}`,
      );
    }
  } catch (err) {
    console.error("[apc-receipt] email failed", err);
  }

  void notifyAdmins({
    submissionId: updated.id,
    title: "APC payment received",
    body: `${updated.author.name} paid ${amountLabel} USD APC for “${updated.title}” (${updated.manuscriptId}). Ready for production.`,
  }).catch((err) => console.error("[notify-admins apc]", err));

  return updated;
}
