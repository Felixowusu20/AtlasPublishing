import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonCreated, jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { progressForStatus, slugify } from "@/lib/submission-utils";
import { allocateNextAtlasDoi, normalizeDoi } from "@/lib/doi";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const articles = await prisma.publishedArticle.findMany({
    include: {
      journal: true,
      submission: {
        select: {
          id: true,
          manuscriptId: true,
          status: true,
          author: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { publishedAt: "desc" },
  });
  return jsonOk({ articles });
}

const schema = z.object({
  title: z.string().min(2),
  slug: z.string().optional(),
  doi: z.string().optional(),
  authors: z.array(z.string()).min(1),
  affiliations: z.array(z.string()).optional(),
  journalId: z.string(),
  publishedAt: z.string().datetime().optional(),
  volume: z.string().optional(),
  issue: z.string().optional(),
  pages: z.string().optional(),
  articleType: z.string().min(1),
  openAccess: z.boolean().optional(),
  license: z.string().optional(),
  abstract: z.string().min(10),
  keywords: z.array(z.string()).optional(),
  coverImageUrl: z.string().optional(),
  coverImagePublicId: z.string().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function POST(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const body = schema.parse(await request.json());
    const slug = body.slug?.trim() || slugify(body.title);

    const journal = await prisma.journal.findUnique({
      where: { id: body.journalId },
    });
    if (!journal) return jsonError("Journal not found", 404);

    const publishedAt = body.publishedAt ? new Date(body.publishedAt) : new Date();
    let doi = body.doi?.trim() ? normalizeDoi(body.doi) : null;
    if (!doi) {
      doi = await allocateNextAtlasDoi(prisma, journal, publishedAt.getFullYear());
    }

    const article = await prisma.publishedArticle.create({
      data: {
        title: body.title,
        slug,
        doi,
        authors: body.authors,
        affiliations: body.affiliations ?? [],
        journalId: body.journalId,
        publishedAt,
        volume: body.volume,
        issue: body.issue,
        pages: body.pages,
        articleType: body.articleType,
        openAccess: body.openAccess ?? true,
        license: body.license,
        abstract: body.abstract,
        keywords: body.keywords ?? [],
        coverImageUrl: body.coverImageUrl,
        coverImagePublicId: body.coverImagePublicId,
        isFeatured: body.isFeatured ?? false,
        isActive: body.isActive ?? true,
      },
      include: { journal: true },
    });
    return jsonCreated({ article });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not create article", 500);
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const raw = await request.json();
    const id = z.string().parse(raw.id);
    const data = schema.partial().parse(raw);
    const article = await prisma.publishedArticle.update({
      where: { id },
      data: {
        ...data,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
      },
      include: { journal: true },
    });
    return jsonOk({ article });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not update article", 500);
  }
}

/**
 * Delete a published article from the public site.
 * If it came from a submission, revert that submission to IN_PRODUCTION so
 * the author no longer sees a published / downloadable article.
 * Pass ?edit=1 to return the submissionId for opening Full manuscripts.
 */
export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const forEdit = searchParams.get("edit") === "1";
  if (!id) return jsonError("Missing id");

  try {
    const article = await prisma.publishedArticle.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        submissionId: true,
        submission: {
          select: {
            id: true,
            authorId: true,
            manuscriptId: true,
            title: true,
          },
        },
      },
    });

    if (!article) return jsonError("Article not found", 404);

    const submissionId = article.submissionId;
    const submission = article.submission;

    await prisma.$transaction(async (tx) => {
      await tx.publishedArticle.delete({ where: { id: article.id } });

      if (submissionId) {
        await tx.submission.update({
          where: { id: submissionId },
          data: {
            status: "IN_PRODUCTION",
            progress: progressForStatus("IN_PRODUCTION"),
            // Keep productionBody / figures so Edit can continue the manuscript
          },
        });

        if (submission) {
          await tx.notification.create({
            data: {
              userId: submission.authorId,
              submissionId: submission.id,
              title: forEdit
                ? "Article returned to editing"
                : "Published article removed",
              body: forEdit
                ? `“${submission.title}” (${submission.manuscriptId}) was unpublished so editors can revise the full manuscript. It is no longer live on Atlas.`
                : `“${submission.title}” (${submission.manuscriptId}) was removed from Atlas and is no longer available to download.`,
            },
          });
        }
      }
    });

    return jsonOk({
      ok: true,
      submissionId: submissionId ?? null,
      editUrl: submissionId
        ? `/admin/manuscripts?id=${submissionId}`
        : null,
    });
  } catch (err) {
    console.error("[admin articles DELETE]", err);
    return jsonError("Could not delete article", 500);
  }
}
