import { z } from "zod";
import { prisma, prismaFailureMessage } from "@/lib/db";
import { jsonCreated, jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireUser } from "@/lib/session";
import {
  manuscriptIdPrefix,
  maxManuscriptSeq,
  nextManuscriptId,
  progressForStatus,
} from "@/lib/submission-utils";
import { notifyAdmins } from "@/lib/notify-admins";
import { getAppBaseUrl } from "@/lib/app-url";
import {
  authorGreetingName,
  sendEmailToAll,
  submissionAcknowledgementEmailHtml,
} from "@/lib/mail";
import { withCustomerPayment } from "@/lib/payment-dto";
import {
  jointAuthorGreeting,
  notifyAuthorContacts,
} from "@/lib/author-contacts";

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

  return jsonOk({
    submissions: submissions.map((s) => withCustomerPayment(s)),
  });
}

const authorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  affiliation: z.string().min(1),
  orcid: z.string().optional(),
  isCorresponding: z.boolean().optional(),
});

const schema = z.object({
  journalId: z.string().min(1),
  articleType: z.string().min(1),
  title: z.string().min(5),
  abstract: z.string().min(20),
  keywords: z.array(z.string().min(1)).min(1),
  coverLetter: z.string().optional(),
  funding: z.string().optional(),
  conflictOfInterest: z.string().optional(),
  ethicsStatement: z.string().optional(),
  manuscriptUrl: z.string().optional(),
  manuscriptPublicId: z.string().optional(),
  authors: z.array(authorSchema).optional(),
});

async function allocateManuscriptId(shortTitle: string, journalId: string) {
  const year = new Date().getFullYear();
  const prefix = manuscriptIdPrefix(shortTitle);
  const existing = await prisma.submission.findMany({
    where: {
      journalId,
      manuscriptId: { startsWith: `${prefix}-${year}-` },
    },
    select: { manuscriptId: true },
  });
  const nextSeq =
    maxManuscriptSeq(
      existing.map((row) => row.manuscriptId),
      shortTitle,
      year,
    ) + 1;
  return nextManuscriptId(shortTitle, year, nextSeq);
}

export async function POST(request: Request) {
  const session = await requireUser(["AUTHOR"]);
  if (!session) {
    return unauthorized(
      "Please sign in with an author account to submit a manuscript.",
    );
  }

  try {
    const body = schema.parse(await request.json());
    const author = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, email: true, name: true },
    });
    if (!author) {
      return unauthorized(
        "Your session is no longer valid. Please sign out, sign in again, and retry.",
      );
    }

    const journal = await prisma.journal.findUnique({
      where: { id: body.journalId },
    });
    if (!journal || !journal.isActive) {
      return jsonError("Journal not found", 404);
    }

    let submission = null;
    let manuscriptId = "";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      manuscriptId = await allocateManuscriptId(
        journal.shortTitle,
        journal.id,
      );
      try {
        submission = await prisma.submission.create({
          data: {
            manuscriptId,
            title: body.title,
            abstract: body.abstract,
            keywords: body.keywords,
            articleType: body.articleType,
            journalId: journal.id,
            authorId: author.id,
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
        break;
      } catch (err) {
        const code =
          err && typeof err === "object" && "code" in err
            ? String((err as { code?: string }).code)
            : "";
        if (code === "P2002" && attempt < 4) continue;
        throw err;
      }
    }

    if (!submission) {
      return jsonError(
        "Could not create the submission. Please try again.",
        500,
      );
    }

    try {
      await prisma.notification.create({
        data: {
          userId: author.id,
          submissionId: submission.id,
          title: "Manuscript submitted",
          body: `${manuscriptId} was received and is awaiting editorial screening.`,
        },
      });
    } catch (err) {
      console.error("[submission-notification]", err);
    }

    try {
      await notifyAdmins({
        submissionId: submission.id,
        title: "New manuscript submitted",
        body: `${author.name || "An author"} submitted “${submission.title}” (${manuscriptId}) to ${journal.shortTitle || journal.title}.`,
      });
    } catch (err) {
      console.error("[submission-admin-notify]", err);
    }

    const base = getAppBaseUrl();
    const submissionUrl = `${base}/submissions/${submission.id}`;
    const contacts = notifyAuthorContacts({
      authorsJson: body.authors,
      fallback: { name: author.name, email: author.email },
    });
    const greeting = jointAuthorGreeting(contacts);
    const recipientEmails = contacts.map((c) => c.email);

    const mail = await sendEmailToAll(recipientEmails, {
      subject: `Manuscript received: ${manuscriptId}`,
      html: submissionAcknowledgementEmailHtml({
        authorName: greeting,
        title: submission.title,
        manuscriptId,
        journalTitle: journal.title,
        submissionUrl,
      }),
      text: [
        `Dear ${authorGreetingName(greeting)},`,
        "",
        `Thank you for submitting your manuscript entitled “${submission.title}” to ${journal.title}.`,
        "",
        `Your manuscript has been received successfully.`,
        `Manuscript ID: ${manuscriptId}`,
        "",
        "Please use this manuscript ID in all future correspondence.",
        "",
        "Your submission will now undergo an initial technical check and editorial screening to ensure that it meets the journal’s scope, formatting requirements, and ethical standards. Further stages of peer review and production will follow as appropriate. You will be communicated with by email as each stage is completed.",
        "",
        `You can also monitor the status of your manuscript here: ${submissionUrl}`,
        "",
        `Thank you for choosing ${journal.title}. We appreciate your contribution to scholarly research.`,
        "",
        "Kind regards,",
        "Editorial Office",
        journal.title,
        "Nahda Publications",
      ].join("\n"),
    });
    if (!mail.ok) {
      console.error(
        `[submission-ack-email] to=${recipientEmails.join(",")} skipped=${mail.skipped} sent=${mail.sent}`,
      );
    }

    return jsonCreated({ submission });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[submission-create]", err);
    return jsonError(
      prismaFailureMessage(err, "Submission failed. Please try again."),
      500,
    );
  }
}
