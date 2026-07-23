import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { labelStatus, progressForStatus } from "@/lib/submission-utils";
import { reviewFeedbackEmailHtml, sendEmail } from "@/lib/mail";
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
      include: { author: true, journal: true },
    });
    if (!submission) return jsonError("Not found", 404);

    const status = body.status as SubmissionStatus;
    const progress = progressForStatus(status);

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

      const sub = await tx.submission.update({
        where: { id },
        data: {
          status,
          progress,
          actionRequired:
            body.actionRequired === undefined
              ? status === "MAJOR_REVISION" || status === "MINOR_REVISION"
                ? "Please revise and resubmit based on reviewer feedback."
                : null
              : body.actionRequired,
          reviewerId:
            body.assignToMe === false
              ? submission.reviewerId
              : admin.sub,
        },
        include: {
          journal: true,
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

    void sendEmail({
      to: submission.author.email,
      subject: `Review update for ${submission.manuscriptId}`,
      html: reviewFeedbackEmailHtml({
        authorName: submission.author.name,
        title: submission.title,
        status: labelStatus(status),
        message: body.message,
        manuscriptId: submission.manuscriptId,
      }),
    });

    return jsonOk({
      submission: updated.sub,
      feedback: updated.feedback,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not send review feedback", 500);
  }
}
