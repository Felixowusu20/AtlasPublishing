import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { labelStatus, progressForStatus } from "@/lib/submission-utils";
import { parseApcAmountCents } from "@/lib/apc";
import {
  apcPaymentEmailHtml,
  reviewFeedbackEmailHtml,
  sendEmail,
} from "@/lib/mail";
import { ensureApcCheckout } from "@/lib/apc-checkout";
import { apcPayPageUrl } from "@/lib/payment-link";
import { getAppBaseUrl } from "@/lib/app-url";
import { formatCustomerUsd } from "@/lib/payment-currency";
import { paystackConfigured } from "@/lib/paystack";
import type { SubmissionStatus } from "@/generated/prisma/client";
import { withAdminPayment } from "@/lib/payment-dto";
import {
  reviewFileDownloadPath,
} from "@/lib/review-file";
import { signReviewFileToken } from "@/lib/review-file-token";

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
  return jsonOk({ submission: withAdminPayment(submission) });
}

const reviewSchema = z
  .object({
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
    message: z.string().max(20000).optional().default(""),
    privateNotes: z.string().optional(),
    actionRequired: z.string().optional().nullable(),
    assignToMe: z.boolean().optional(),
    fileUrl: z.string().url().optional(),
    filePublicId: z.string().max(400).optional(),
    fileName: z.string().max(260).optional(),
    fileBytes: z.number().int().nonnegative().optional(),
    fileResourceType: z.enum(["image", "raw", "auto", "video"]).optional(),
  })
  .superRefine((value, ctx) => {
    const comment = value.message.trim();
    if (value.fileUrl) return;
    if (comment.length < 10) {
      ctx.addIssue({
        code: "custom",
        message: "Write a message of at least 10 characters, or attach a review file.",
        path: ["message"],
      });
    }
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
    const comment = body.message.trim();
    const storedMessage =
      comment ||
      (body.fileName
        ? `Review file attached: ${body.fileName}`
        : "Review file attached.");
    const notificationBody = comment
      ? comment.slice(0, 280)
      : body.fileName
        ? `A review file is ready to download: ${body.fileName}`
        : storedMessage.slice(0, 280);

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
          message: storedMessage,
          privateNotes: body.privateNotes,
          fileUrl: body.fileUrl,
          filePublicId: body.filePublicId,
          fileName: body.fileName,
          fileBytes:
            body.fileBytes != null && body.fileBytes <= 2_147_483_647
              ? body.fileBytes
              : undefined,
          fileResourceType: body.fileResourceType,
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
          body: notificationBody,
        },
      });

      return { feedback, sub };
    });

    const base = getAppBaseUrl();
    const needsRevision =
      status === "MAJOR_REVISION" || status === "MINOR_REVISION";
    const reviewFile =
      updated.feedback.fileUrl && updated.feedback.fileName
        ? {
            name: updated.feedback.fileName,
            href: `${base}${reviewFileDownloadPath(
              id,
              updated.feedback.id,
              signReviewFileToken(updated.feedback.id),
            )}`,
          }
        : null;

    let latestSubmission = updated.sub;
    let emailSent = false;
    let checkoutUrl: string | null = null;
    let apcAmountLabel: string | null = null;

    // On accept: create Paystack Checkout and email the pay link
    if (status === "ACCEPTED") {
      try {
        if (!paystackConfigured()) {
          console.warn(
            "[accept-apc] PAYSTACK_SECRET_KEY missing — author must use Pay APC once keys are set",
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
          checkout.amountCents > 0 ? checkout.amountLabel : null;

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
        // Still mark APC pending so author can pay from the submission page once currency works
        try {
          await prisma.submission.update({
            where: { id },
            data: {
              apcPaymentStatus: "PENDING",
              actionRequired:
                "Please pay the article processing charge using the payment link in your email.",
            },
          });
        } catch (pendingErr) {
          console.error("[accept-apc] could not set PENDING", pendingErr);
        }
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
            reviewFile,
          }),
          text: [
            `Your manuscript ${submission.manuscriptId} was accepted.`,
            `Please pay the APC (${apcAmountLabel}) using this payment link:`,
            checkoutUrl,
            ...(reviewFile
              ? ["", `Download the review file (${reviewFile.name}):`, reviewFile.href]
              : []),
          ].join("\n"),
        });
        emailSent = mail.ok;
      } else if (
        status === "ACCEPTED" &&
        latestSubmission.apcPaymentStatus === "PENDING"
      ) {
        const payUrl = checkoutUrl || (await apcPayPageUrl(id));
        const amount =
          apcAmountLabel ??
          formatCustomerUsd(
            parseApcAmountCents(submission.journal.apc, {
              openAccess: submission.journal.openAccess,
            }),
          );
        const mail = await sendEmail({
          to: submission.author.email,
          subject: `Accepted: pay APC for ${submission.manuscriptId}`,
          html: apcPaymentEmailHtml({
            authorName: submission.author.name,
            title: submission.title,
            manuscriptId: submission.manuscriptId,
            journalTitle: submission.journal.title,
            amountLabel: amount,
            checkoutUrl: payUrl,
            reviewFile,
          }),
          text: [
            `Your manuscript ${submission.manuscriptId} was accepted.`,
            `Please pay the APC (${amount}) using this payment link:`,
            payUrl,
            ...(reviewFile
              ? ["", `Download the review file (${reviewFile.name}):`, reviewFile.href]
              : []),
          ].join("\n"),
        });
        emailSent = mail.ok;
      } else if (
        status === "ACCEPTED" &&
        (latestSubmission.apcPaymentStatus === "NOT_REQUIRED" ||
          latestSubmission.apcPaymentStatus === "WAIVED" ||
          latestSubmission.apcPaymentStatus === "PAID")
      ) {
        const mail = await sendEmail({
          to: submission.author.email,
          subject: `Accepted: ${submission.manuscriptId} is in production`,
          html: reviewFeedbackEmailHtml({
            authorName: submission.author.name,
            title: submission.title,
            status: "Accepted — in production",
            message:
              comment ||
              "Your manuscript was accepted and does not require further APC payment. It is now in production.",
            manuscriptId: submission.manuscriptId,
            submissionUrl: `${base}/submissions/${id}`,
            reviewFile,
          }),
          text: [
            `Your manuscript ${submission.manuscriptId} was accepted and is in production.`,
            `${base}/submissions/${id}`,
            ...(reviewFile
              ? ["", `Download the review file (${reviewFile.name}):`, reviewFile.href]
              : []),
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
            message: comment,
            manuscriptId: submission.manuscriptId,
            submissionUrl: `${base}/submissions/${id}`,
            needsRevision,
            reviewFile,
          }),
          text: [
            `Review update for ${submission.manuscriptId}`,
            `Status: ${labelStatus(status)}`,
            "",
            comment || storedMessage,
            ...(reviewFile
              ? ["", `Download the review file (${reviewFile.name}):`, reviewFile.href]
              : []),
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
      submission: withAdminPayment(latestSubmission),
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
