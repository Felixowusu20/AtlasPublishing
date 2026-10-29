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
import { getAppBaseUrl } from "@/lib/app-url";
import { notifyAdmins } from "@/lib/notify-admins";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  manuscriptUrl: z.string().url(),
  manuscriptPublicId: z.string().optional(),
  coverLetter: z.string().optional(),
  manuscriptFileName: z.string().min(1).max(260).optional(),
  responseFileUrl: z.string().url(),
  responseFilePublicId: z.string().optional(),
  responseFileName: z.string().min(1).max(260),
  responseFileBytes: z.number().int().nonnegative().optional(),
  responseFileResourceType: z.string().max(32).optional(),
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
          reviewerId: session.sub,
          status: "UNDER_REVIEW",
          message: `Author response to reviewers: ${body.responseFileName}`,
          fileUrl: body.responseFileUrl,
          filePublicId: body.responseFilePublicId,
          fileName: body.responseFileName,
          fileBytes:
            body.responseFileBytes != null &&
            body.responseFileBytes <= 2_147_483_647
              ? body.responseFileBytes
              : undefined,
          fileResourceType: body.responseFileResourceType,
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
          manuscriptFileName: body.manuscriptFileName,
          responseFileUrl: body.responseFileUrl,
          responseFilePublicId: body.responseFilePublicId,
          responseFileName: body.responseFileName,
          responseFileBytes:
            body.responseFileBytes != null &&
            body.responseFileBytes <= 2_147_483_647
              ? body.responseFileBytes
              : undefined,
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

    await notifyAdmins({
      submissionId: id,
      extraUserIds: submission.reviewerId ? [submission.reviewerId] : [],
      title: "Author resubmitted a manuscript",
      body: `${submission.author.name} resubmitted “${submission.title}” (${submission.manuscriptId}).`,
    });

    const base = getAppBaseUrl();

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
