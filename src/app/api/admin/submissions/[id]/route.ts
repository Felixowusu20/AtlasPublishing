import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { labelStatus, progressForStatus } from "@/lib/submission-utils";
import {
  apcPaymentEmailHtml,
  reviewFeedbackEmailHtml,
  sendEmail,
} from "@/lib/mail";
import { formatApcAmount } from "@/lib/apc";
import { ensureApcCheckout } from "@/lib/apc-checkout";
import { getAppBaseUrl } from "@/lib/app-url";
import { stripeConfigured } from "@/lib/stripe";
import type { SubmissionStatus } from "@/generated/prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      journal: true,
      payment: true,
      author: {
        select: { id: true, name: true, email: true, institution: true },
      },
      reviewer: { select: { id: true, name: true, email: true } },
      feedback: {
        orderBy: { createdAt: "desc" },
        include: {
          reviewer: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!submission) return jsonError("Not found", 404);
  if (submission.deletedAt) return jsonError("Not found", 404);
  return jsonOk({ submission });
}

const reviewSchema = z.object({
  status: z.enum([
    "TECHNICAL_CHECK",
    "UNDER_REVIEW",
    "MAJOR_REVISION",
    "MINOR_REVISION",
    "ACCEPTED",
    "REJECTED",
    "IN_PRODUCTION",
    "PUBLISHED",
  ]),
  message: z.string().min(10),
  privateNotes: z.string().optional(),
  actionRequired: z.string().optional().nullable(),
  assignToMe: z.boolean().optional(),
});

export async function POST(request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const { id } = await params;

  try {
    const body = reviewSchema.parse(await request.json());
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: { author: true, journal: true, payment: true },
    });
    if (!submission) return jsonError("Not found", 404);
    if (submission.deletedAt) {
      return jsonError("This submission is in the recycle bin", 400);
    }

    const status = body.status as SubmissionStatus;
    const progress = progressForStatus(status);

    // Production / publish statuses require APC cleared first
    if (
      (status === "IN_PRODUCTION" || status === "PUBLISHED") &&
      submission.apcPaymentStatus === "PENDING"
    ) {
      return jsonError(
        "APC payment is still pending. Wait for the author to pay, or waive the APC first.",
        400,
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const feedback = await tx.reviewFeedback.create({
        data: {
          submissionId: id,
          reviewerId: admin.sub,
          status,
          message: body.message,
          privateNotes: body.privateNotes,
        },
      });

      const defaultAction =
        body.actionRequired === undefined
          ? status === "MAJOR_REVISION" || status === "MINOR_REVISION"
            ? "Please revise your manuscript, then use Resubmit on your author dashboard to send the corrected file back for review."
            : status === "ACCEPTED"
              ? "Please pay the article processing charge to continue to production."
              : null
          : body.actionRequired;

      const sub = await tx.submission.update({
        where: { id },
        data: {
          status,
          progress,
          actionRequired: defaultAction,
          reviewerId:
            body.assignToMe === false ? submission.reviewerId : admin.sub,
        },
        include: {
          journal: true,
          payment: true,
          author: {
            select: { id: true, name: true, email: true, institution: true },
          },
          feedback: {
            orderBy: { createdAt: "desc" },
            include: {
              reviewer: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      await tx.notification.create({
        data: {
          userId: submission.authorId,
          submissionId: id,
          title: `Review update: ${labelStatus(status)}`,
          body: body.message.slice(0, 280),
        },
      });

      return { feedback, sub };
    });

    const base = getAppBaseUrl();
    const needsRevision =
      status === "MAJOR_REVISION" || status === "MINOR_REVISION";

    let latestSubmission = updated.sub;
    let emailSent = false;
    let checkoutUrl: string | null = null;
    let apcAmountLabel: string | null = null;

    // On accept: create Stripe Checkout and email the pay link
    if (status === "ACCEPTED") {
      try {
        if (!stripeConfigured()) {
          console.warn(
            "[accept-apc] STRIPE_SECRET_KEY missing — author must use Pay APC once keys are set",
          );
        }
        const checkout = await ensureApcCheckout({
          ...latestSubmission,
          author: {
            name: submission.author.name,
            email: submission.author.email,
          },
        });
        checkoutUrl = checkout.checkoutUrl;
        apcAmountLabel =
          checkout.amountCents > 0
            ? formatApcAmount(checkout.amountCents)
            : null;

        const refreshed = await prisma.submission.findUnique({
          where: { id },
          include: {
            journal: true,
            payment: true,
            author: {
              select: { id: true, name: true, email: true, institution: true },
            },
            feedback: {
              orderBy: { createdAt: "desc" },
              include: {
                reviewer: { select: { id: true, name: true, email: true } },
              },
            },
          },
        });
        if (refreshed) latestSubmission = refreshed;
      } catch (apcErr) {
        console.error("[accept-apc] checkout setup failed", apcErr);
      }
    }

    try {
      if (status === "ACCEPTED" && checkoutUrl && apcAmountLabel) {
        const mail = await sendEmail({
          to: submission.author.email,
          subject: `Accepted: pay APC for ${submission.manuscriptId}`,
          html: apcPaymentEmailHtml({
            authorName: submission.author.name,
            title: submission.title,
            manuscriptId: submission.manuscriptId,
            journalTitle: submission.journal.title,
            amountLabel: apcAmountLabel,
            checkoutUrl,
            submissionUrl: `${base}/submissions/${id}`,
          }),
          text: [
            `Your manuscript ${submission.manuscriptId} was accepted.`,
            `Please pay the APC (${apcAmountLabel}) to move into production:`,
            checkoutUrl,
            "",
            `Or open: ${base}/submissions/${id}`,
          ].join("\n"),
        });
        emailSent = mail.ok;
      } else {
        const mail = await sendEmail({
          to: submission.author.email,
          subject: `Review feedback: ${submission.manuscriptId} (${labelStatus(status)})`,
          html: reviewFeedbackEmailHtml({
            authorName: submission.author.name,
            title: submission.title,
            status: labelStatus(status),
            message: body.message,
            manuscriptId: submission.manuscriptId,
            submissionUrl: `${base}/submissions/${id}`,
            needsRevision,
          }),
          text: [
            `Review update for ${submission.manuscriptId}`,
            `Status: ${labelStatus(status)}`,
            "",
            body.message,
            "",
            `Open: ${base}/submissions/${id}`,
          ].join("\n"),
        });
        emailSent = mail.ok;
        if (mail.skipped) {
          console.warn(
            `[review-email] skipped (SMTP not configured) → ${submission.author.email}`,
          );
        }
      }
    } catch (mailErr) {
      console.error("[review-email] failed", mailErr);
    }

    return jsonOk({
      submission: latestSubmission,
      feedback: updated.feedback,
      emailSent,
      checkoutUrl,
      apcAmountLabel,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not send review feedback", 500);
  }
}
