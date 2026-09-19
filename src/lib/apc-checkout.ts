import { prisma } from "@/lib/db";
import { parseApcAmountCents } from "@/lib/apc";
import { formatCustomerUsd } from "@/lib/payment-currency";
import { apcPayPageUrl } from "@/lib/payment-link";
import { progressForStatus } from "@/lib/submission-utils";
import { notifyAdmins } from "@/lib/notify-admins";
import { apcReceiptEmailHtml, sendEmail } from "@/lib/mail";
import { isApcAlreadyCleared } from "@/lib/payment-verify";
import {
  journalPaymentAlias,
  makePaypalPaymentReference,
} from "@/lib/paypal";
import { getAppBaseUrl } from "@/lib/app-url";
import type { Journal, Payment, Submission } from "@/generated/prisma/client";

type SubmissionWithJournal = Submission & {
  journal: Journal;
  payment?: Payment | null;
  author?: { email: string; name: string };
};

export type PreparedApcPayment = {
  amountCents: number;
  amountLabel: string;
  status: string;
  paymentId: string | null;
  reference: string | null;
  authorEmail: string | null;
  payment: Payment | null;
  journalAlias: string;
};

/**
 * When an admin changes a journal APC, update every unpaid payment for that
 * journal so checkout, receipts, and emails use the new USD amount.
 */
export async function syncPendingApcFromJournal(journal: Journal): Promise<void> {
  const usdCents = parseApcAmountCents(journal.apc, {
    openAccess: journal.openAccess,
  });
  const amountLabel = formatCustomerUsd(usdCents);

  if (usdCents <= 0) {
    await prisma.$transaction([
      prisma.payment.updateMany({
        where: {
          status: "PENDING",
          submission: { journalId: journal.id },
        },
        data: {
          amountCents: 0,
          currency: "usd",
          status: "NOT_REQUIRED",
          paidAt: null,
          internalAmount: 0,
          internalCurrency: "USD",
          exchangeRate: 1,
        },
      }),
      prisma.submission.updateMany({
        where: {
          journalId: journal.id,
          apcPaymentStatus: "PENDING",
        },
        data: {
          apcPaymentStatus: "NOT_REQUIRED",
          actionRequired: null,
        },
      }),
    ]);
    return;
  }

  await prisma.$transaction([
    prisma.payment.updateMany({
      where: {
        status: { in: ["PENDING", "NOT_REQUIRED"] },
        submission: { journalId: journal.id },
      },
      data: {
        amountCents: usdCents,
        currency: "usd",
        status: "PENDING",
        paidAt: null,
        waivedAt: null,
        internalAmount: usdCents,
        internalCurrency: "USD",
        exchangeRate: 1,
      },
    }),
    prisma.submission.updateMany({
      where: {
        journalId: journal.id,
        apcPaymentStatus: { in: ["PENDING", "NOT_REQUIRED"] },
        status: { in: ["ACCEPTED", "IN_PRODUCTION"] },
      },
      data: {
        apcPaymentStatus: "PENDING",
        status: "ACCEPTED",
        progress: progressForStatus("ACCEPTED"),
        actionRequired: `Please pay the article processing charge (${amountLabel}) via PayPal to continue to production.`,
      },
    }),
  ]);
}

/**
 * Create/update the Payment row from the trusted journal APC (USD).
 * Stores a PayPal payment reference (reuses paystackReference column).
 */
export async function prepareApcPayment(
  submission: SubmissionWithJournal,
): Promise<PreparedApcPayment> {
  const journalAlias = journalPaymentAlias(submission.journal);

  if (
    submission.payment?.status === "PAID" ||
    submission.payment?.status === "WAIVED" ||
    submission.apcPaymentStatus === "PAID" ||
    submission.apcPaymentStatus === "WAIVED"
  ) {
    const cents = submission.payment?.amountCents ?? 0;
    return {
      amountCents: cents,
      amountLabel: formatCustomerUsd(cents),
      status: submission.payment?.status ?? submission.apcPaymentStatus ?? "PAID",
      paymentId: submission.payment?.id ?? null,
      reference: submission.payment?.paystackReference ?? null,
      authorEmail: submission.author?.email ?? null,
      payment: submission.payment ?? null,
      journalAlias,
    };
  }

  const usdCents = parseApcAmountCents(submission.journal.apc, {
    openAccess: submission.journal.openAccess,
  });
  const displayCurrency = "usd";
  const amountLabel = formatCustomerUsd(usdCents);

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
          internalAmount: 0,
          internalCurrency: "USD",
          exchangeRate: 1,
        },
        update: {
          amountCents: 0,
          currency: displayCurrency,
          status: "NOT_REQUIRED",
          paidAt: null,
          internalAmount: 0,
          internalCurrency: "USD",
          exchangeRate: 1,
        },
      }),
    ]);
    return {
      amountCents: 0,
      amountLabel: formatCustomerUsd(0),
      status: "NOT_REQUIRED",
      paymentId: null,
      reference: null,
      authorEmail: submission.author?.email ?? null,
      payment: null,
      journalAlias,
    };
  }

  const reference = makePaypalPaymentReference({
    journalAlias,
    manuscriptId: submission.manuscriptId,
  });
  const email = submission.author?.email?.trim() || null;

  const payment = await prisma.payment.upsert({
    where: { submissionId: submission.id },
    create: {
      submissionId: submission.id,
      amountCents: usdCents,
      currency: displayCurrency,
      status: "PENDING",
      paystackReference: reference,
      customerEmail: email,
      internalAmount: usdCents,
      internalCurrency: "USD",
      exchangeRate: 1,
    },
    update: {
      amountCents: usdCents,
      currency: displayCurrency,
      status: "PENDING",
      paidAt: null,
      waivedAt: null,
      paystackReference: reference,
      customerEmail: email,
      internalAmount: usdCents,
      internalCurrency: "USD",
      exchangeRate: 1,
    },
  });

  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      apcPaymentStatus: "PENDING",
      apcPaidAt: null,
      status: "ACCEPTED",
      progress: progressForStatus("ACCEPTED"),
      actionRequired: `Please pay the article processing charge (${amountLabel}) via PayPal to continue to production. Use reference ${reference}.`,
    },
  });

  return {
    amountCents: usdCents,
    amountLabel,
    status: "PENDING",
    paymentId: payment.id,
    reference,
    authorEmail: email,
    payment,
    journalAlias,
  };
}

/** Link authors to our PayPal APC instructions page. */
export async function ensureApcCheckout(
  submission: SubmissionWithJournal,
): Promise<{
  checkoutUrl: string;
  accessCode?: string | null;
  reference?: string | null;
  amountCents: number;
  amountLabel: string;
  status: string;
  paymentId: string | null;
  journalAlias: string;
}> {
  const prepared = await prepareApcPayment(submission);
  return {
    checkoutUrl: await apcPayPageUrl(submission.id),
    accessCode: null,
    reference: prepared.reference,
    amountCents: prepared.amountCents,
    amountLabel: prepared.amountLabel,
    status: prepared.status,
    paymentId: prepared.paymentId,
    journalAlias: prepared.journalAlias,
  };
}

export function nahdaReceiptNumber(manuscriptId: string, paidAt: Date) {
  return `NPR-${manuscriptId.replace(/[^A-Za-z0-9]/g, "").slice(0, 12)}-${paidAt.getTime().toString(36).toUpperCase()}`;
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

  if (isApcAlreadyCleared(submission.apcPaymentStatus)) {
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

  const journalUsdCents = parseApcAmountCents(submission.journal.apc, {
    openAccess: submission.journal.openAccess,
  });
  const amountCents =
    submission.payment?.amountCents && submission.payment.amountCents > 0
      ? submission.payment.amountCents
      : journalUsdCents;
  const amountLabel = formatCustomerUsd(amountCents);
  const currency = "usd";
  const authorReceiptEmail =
    (opts.customerEmail ?? "").trim() || submission.author.email;
  const alias = journalPaymentAlias(submission.journal);
  const reference =
    opts.reference ||
    submission.payment?.paystackReference ||
    makePaypalPaymentReference({
      journalAlias: alias,
      manuscriptId: submission.manuscriptId,
    });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.payment.upsert({
      where: { submissionId: opts.submissionId },
      create: {
        submissionId: opts.submissionId,
        amountCents,
        currency,
        status: "PAID",
        paystackReference: reference,
        paystackAccessCode: opts.accessCode ?? undefined,
        customerEmail: authorReceiptEmail,
        receiptUrl: opts.receiptUrl ?? undefined,
        paidAt: new Date(),
        internalAmount: amountCents,
        internalCurrency: "USD",
        exchangeRate: 1,
      },
      update: {
        status: "PAID",
        amountCents,
        currency,
        paystackReference: reference,
        paystackAccessCode: opts.accessCode ?? undefined,
        customerEmail: authorReceiptEmail,
        receiptUrl: opts.receiptUrl ?? undefined,
        paidAt: new Date(),
        internalAmount: amountCents,
        internalCurrency: "USD",
        exchangeRate: 1,
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
        body: `Your PayPal payment of ${amountLabel} has been received. Your manuscript is now in production.`,
      },
    });

    return sub;
  });

  const base = getAppBaseUrl();
  const paidAt = updated.payment?.paidAt ?? new Date();
  const receiptNumber = nahdaReceiptNumber(updated.manuscriptId, paidAt);

  try {
    // Always send the official Nahda receipt to the submitting author account.
    const mail = await sendEmail({
      to: submission.author.email,
      subject: `Nahda Publications receipt: ${updated.manuscriptId} — ${amountLabel}`,
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
        reference,
        receiptNumber,
        submissionUrl: `${base}/dashboard`,
      }),
      text: [
        `Nahda Publications — APC payment receipt`,
        ``,
        `Receipt: ${receiptNumber}`,
        `Status: PAID`,
        `Amount paid: ${amountLabel}`,
        `Currency: USD`,
        `Method: PayPal (Nahda Publications)`,
        `Merchant: Nahda Publications`,
        `Journal: ${updated.journal.title}`,
        `Manuscript: ${updated.manuscriptId}`,
        `Title: ${updated.title}`,
        `Paid on: ${paidAt.toISOString()}`,
        `Reference: ${reference}`,
        ``,
        `Your manuscript is now in production.`,
        `${base}/dashboard`,
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
        `[apc-receipt] sent Nahda USD receipt to submitting author ${submission.author.email}`,
      );
    }
  } catch (err) {
    console.error("[apc-receipt] email failed", err);
  }

  void notifyAdmins({
    submissionId: updated.id,
    title: "APC payment received",
    body: `${updated.author.name} paid ${amountLabel} APC (PayPal) for “${updated.title}” (${updated.manuscriptId}). Ready for production.`,
  }).catch((err) => console.error("[notify-admins apc]", err));

  return updated;
}
