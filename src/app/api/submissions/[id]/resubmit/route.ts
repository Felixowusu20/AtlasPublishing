import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { progressForStatus } from "@/lib/submission-utils";
import {
  resubmissionEmailHtml,
  reviewerResubmissionNoticeHtml,
  sendEmail,
} from "@/lib/mail";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  manuscriptUrl: z.string().url(),
  manuscriptPublicId: z.string().optional(),
  coverLetter: z.string().optional(),
  responseToReviewers: z.string().min(3),
});

/** Author resubmits a revised manuscript after major/minor revision. */
export async function POST(request: Request, { params }: Params) {
  const session = await requireUser(["AUTHOR"]);
  if (!session) return unauthorized();
  const { id } = await params;

  try {
    const body = schema.parse(await request.json());
    const submission = await prisma.submission.findFirst({
      where: { id, authorId: session.sub },
      include: {
        author: true,
        reviewer: { select: { id: true, name: true, email: true } },
        journal: true,
      },
    });

    if (!submission) return jsonError("Not found", 404);

    if (
      submission.status !== "MAJOR_REVISION" &&
      submission.status !== "MINOR_REVISION" &&
      submission.status !== "UNDER_REVIEW" &&
      submission.status !== "TECHNICAL_CHECK"
    ) {
      return jsonError(
        "Resubmit is only available while the manuscript is in review or a revision has been requested.",
        400,
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.reviewFeedback.create({
        data: {
          submissionId: id,
          reviewerId: submission.reviewerId ?? session.sub,
          status: "UNDER_REVIEW",
          message: `Author response to reviewers:\n\n${body.responseToReviewers}`,
        },
      });

      const sub = await tx.submission.update({
        where: { id },
        data: {
          status: "UNDER_REVIEW",
          progress: progressForStatus("UNDER_REVIEW"),
          actionRequired: null,
          manuscriptUrl: body.manuscriptUrl,
          manuscriptPublicId: body.manuscriptPublicId,
          coverLetter: body.coverLetter ?? submission.coverLetter,
        },
        include: {
          journal: true,
          feedback: {
            orderBy: { createdAt: "desc" },
            include: {
              reviewer: { select: { id: true, name: true } },
            },
          },
        },
      });

      await tx.notification.create({
        data: {
          userId: session.sub,
          submissionId: id,
          title: "Resubmission received",
          body: `${submission.manuscriptId} is back under review.`,
        },
      });

      return sub;
    });

    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    try {
      await sendEmail({
        to: submission.author.email,
        subject: `Resubmission received: ${submission.manuscriptId}`,
        html: resubmissionEmailHtml({
          authorName: submission.author.name,
          title: submission.title,
          manuscriptId: submission.manuscriptId,
          submissionUrl: `${base}/submissions/${id}`,
        }),
      });
    } catch (err) {
      console.error("[resubmit-email] author", err);
    }

    if (submission.reviewer?.email) {
      try {
        await sendEmail({
          to: submission.reviewer.email,
          subject: `Author resubmitted ${submission.manuscriptId}`,
          html: reviewerResubmissionNoticeHtml({
            reviewerName: submission.reviewer.name,
            authorName: submission.author.name,
            title: submission.title,
            manuscriptId: submission.manuscriptId,
            adminUrl: `${base}/admin/submissions/${id}`,
          }),
        });
      } catch (err) {
        console.error("[resubmit-email] reviewer", err);
      }
    }

    return jsonOk({ submission: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Resubmission failed", 500);
  }
}
