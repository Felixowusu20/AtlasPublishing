import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonCreated, jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { nextManuscriptId, progressForStatus } from "@/lib/submission-utils";

export async function GET() {
  const session = await requireUser(["AUTHOR"]);
  if (!session) return unauthorized();

  const submissions = await prisma.submission.findMany({
    where: { authorId: session.sub },
    include: {
      journal: true,
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

    return jsonCreated({ submission });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Submission failed", 500);
  }
}
