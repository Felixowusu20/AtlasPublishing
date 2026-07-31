import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonCreated, jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { nextManuscriptId, progressForStatus } from "@/lib/submission-utils";
import { notifyAdmins } from "@/lib/notify-admins";
import { getAppBaseUrl } from "@/lib/app-url";
import {
  authorGreetingName,
  sendEmail,
  submissionAcknowledgementEmailHtml,
} from "@/lib/mail";

export async function GET() {
  const session = await requireUser(["AUTHOR"]);
  if (!session) return unauthorized();

  const submissions = await prisma.submission.findMany({
    where: { authorId: session.sub, deletedAt: null },
    include: {
      journal: true,
      payment: true,
      publishedArticle: {
        select: {
          id: true,
          slug: true,
          title: true,
          manuscriptUrl: true,
          publishedAt: true,
        },
      },
      feedback: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          reviewer: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return jsonOk({ submissions });
}

const schema = z.object({
  journalId: z.string(),
  articleType: z.string().min(1),
  title: z.string().min(5),
  abstract: z.string().min(20),
  keywords: z.array(z.string()).min(1),
  coverLetter: z.string().optional(),
  funding: z.string().optional(),
  conflictOfInterest: z.string().optional(),
  ethicsStatement: z.string().optional(),
  manuscriptUrl: z.string().optional(),
  manuscriptPublicId: z.string().optional(),
  authors: z
    .array(
      z.object({
        name: z.string(),
        email: z.string().email(),
        affiliation: z.string(),
        isCorresponding: z.boolean().optional(),
      }),
    )
    .optional(),
});

export async function POST(request: Request) {
  const session = await requireUser(["AUTHOR"]);
  if (!session) return unauthorized();

  try {
    const body = schema.parse(await request.json());
    const journal = await prisma.journal.findUnique({
      where: { id: body.journalId },
    });
    if (!journal || !journal.isActive) {
      return jsonError("Journal not found", 404);
    }

    const year = new Date().getFullYear();
    const count = await prisma.submission.count({
      where: { journalId: journal.id },
    });
    const manuscriptId = nextManuscriptId(journal.shortTitle, year, count + 1);

    const submission = await prisma.submission.create({
      data: {
        manuscriptId,
        title: body.title,
        abstract: body.abstract,
        keywords: body.keywords,
        articleType: body.articleType,
        journalId: journal.id,
        authorId: session.sub,
        status: "SUBMITTED",
        progress: progressForStatus("SUBMITTED"),
        coverLetter: body.coverLetter,
        funding: body.funding,
        conflictOfInterest: body.conflictOfInterest,
        ethicsStatement: body.ethicsStatement,
        manuscriptUrl: body.manuscriptUrl,
        manuscriptPublicId: body.manuscriptPublicId,
        authorsJson: body.authors ?? [],
      },
      include: { journal: true },
    });

    await prisma.notification.create({
      data: {
        userId: session.sub,
        submissionId: submission.id,
        title: "Manuscript submitted",
        body: `${manuscriptId} was received and is awaiting editorial screening.`,
      },
    });

    await notifyAdmins({
      submissionId: submission.id,
      title: "New manuscript submitted",
      body: `${session.name || "An author"} submitted “${submission.title}” (${manuscriptId}) to ${journal.shortTitle || journal.title}.`,
    });

    const base = getAppBaseUrl();
    const submissionUrl = `${base}/submissions/${submission.id}`;
    const authorEmail = session.email;
    const authorName = session.name || "Author";

    void sendEmail({
      to: authorEmail,
      subject: `Manuscript received: ${manuscriptId}`,
      html: submissionAcknowledgementEmailHtml({
        authorName,
        title: submission.title,
        manuscriptId,
        journalTitle: journal.title,
        submissionUrl,
      }),
      text: [
        `Dear ${authorGreetingName(authorName)},`,
        "",
        `Thank you for submitting your manuscript entitled “${submission.title}” to ${journal.title}.`,
        "",
        `Your manuscript has been received successfully.`,
        `Manuscript ID: ${manuscriptId}`,
        "",
        "Please use this manuscript ID in all future correspondence.",
        "",
        "Your submission will now undergo an initial technical and editorial screening to ensure that it meets the journal’s scope, formatting requirements, and ethical standards. Further stages of review will follow as appropriate. You will be notified by email once each stage has been completed.",
        "",
        `You can monitor the status of your manuscript here: ${submissionUrl}`,
        "",
        `Thank you for choosing ${journal.title}. We appreciate your contribution to scholarly research.`,
        "",
        "Kind regards,",
        "Editorial Office",
        journal.title,
        "Nahda Publications",
      ].join("\n"),
    }).catch((err) => console.error("[submission-ack-email]", err));

    return jsonCreated({ submission });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Submission failed", 500);
  }
}
