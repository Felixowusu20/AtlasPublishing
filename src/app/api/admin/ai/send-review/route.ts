import { z } from "zod";
import {
  reportToPlainMessage,
  type AiReviewReport,
  type ReviewDecisionStatus,
} from "@/lib/ai/review-report";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { getAppBaseUrl } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import { reviewFeedbackEmailHtml, sendEmailToAll } from "@/lib/mail";
import { requireAdmin } from "@/lib/session";
import { labelStatus, progressForStatus } from "@/lib/submission-utils";
import type { SubmissionStatus } from "@/generated/prisma/client";

const statusEnum = z.enum([
  "TECHNICAL_CHECK",
  "UNDER_REVIEW",
  "MAJOR_REVISION",
  "MINOR_REVISION",
  "ACCEPTED",
  "REJECTED",
]);

const bodySchema = z.object({
  submissionId: z.string().min(1),
  emails: z.array(z.string().email()).min(1),
  status: statusEnum,
  report: z.object({
    id: z.string(),
    createdAt: z.string(),
    manuscriptId: z.string(),
    title: z.string(),
    journalTitle: z.string(),
    authorName: z.string(),
    authorEmail: z.string(),
    coAuthorEmails: z.array(z.string()),
    fileName: z.string().nullable(),
    providerNote: z.string(),
    overallSummary: z.string(),
    recommendedStatus: z.string(),
    sections: z.array(
      z.object({
        toolId: z.string(),
        title: z.string(),
        stageLabel: z.string(),
        summary: z.string(),
        checks: z.array(z.string()),
        findings: z.array(z.string()),
        editorNote: z.string(),
      }),
    ),
    closingNote: z.string(),
  }),
});

/**
 * Apply the selected review status, store the AI report as feedback,
 * and email the chosen author addresses.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    const body = bodySchema.parse(await request.json());
    const status = body.status as ReviewDecisionStatus;
    const report = body.report as AiReviewReport;
    const message = reportToPlainMessage(report);

    const submission = await prisma.submission.findFirst({
      where: { id: body.submissionId, deletedAt: null },
      include: {
        author: { select: { id: true, name: true, email: true } },
        journal: { select: { title: true } },
      },
    });
    if (!submission) return jsonError("Submission not found", 404);

    const prismaStatus = status as SubmissionStatus;
    const progress = progressForStatus(prismaStatus);
    const actionRequired =
      status === "MAJOR_REVISION" || status === "MINOR_REVISION"
        ? "Please revise your manuscript, then use Resubmit on your author dashboard to send the corrected file back for review."
        : status === "ACCEPTED"
          ? "Please pay the article processing charge to continue to production."
          : null;

    await prisma.$transaction(async (tx) => {
      await tx.reviewFeedback.create({
        data: {
          submissionId: submission.id,
          reviewerId: admin.sub,
          status: prismaStatus,
          message,
          privateNotes: `Generated via Nahda AI Assist (${report.id})`,
        },
      });

      await tx.submission.update({
        where: { id: submission.id },
        data: {
          status: prismaStatus,
          progress,
          actionRequired,
          reviewerId: admin.sub,
        },
      });

      await tx.notification.create({
        data: {
          userId: submission.authorId,
          submissionId: submission.id,
          title: `Review update: ${labelStatus(prismaStatus)}`,
          body: report.overallSummary.slice(0, 280),
        },
      });
    });

    const base = getAppBaseUrl();
    const needsRevision =
      status === "MAJOR_REVISION" || status === "MINOR_REVISION";
    const html = reviewFeedbackEmailHtml({
      authorName: submission.author.name,
      title: submission.title,
      status: labelStatus(prismaStatus),
      message,
      manuscriptId: submission.manuscriptId,
      submissionUrl: `${base}/dashboard`,
      needsRevision,
    });

    const mail = await sendEmailToAll(body.emails, {
      subject: `Editorial update: ${submission.manuscriptId} — ${labelStatus(prismaStatus)}`,
      html,
      text: message,
    });

    return jsonOk({
      ok: true,
      status: prismaStatus,
      emailed: mail.ok,
      skipped: mail.skipped,
      recipients: body.emails,
      sentCount: mail.sent,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[admin ai send-review]", err);
    return jsonError("Could not send AI review", 500);
  }
}
