import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonCreated, jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { slugify } from "@/lib/submission-utils";
import { allocateNextAtlasDoi, normalizeDoi } from "@/lib/doi";
import { trashPublishedArticle } from "@/lib/recycle-bin";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const articles = await prisma.publishedArticle.findMany({
    where: { deletedAt: null },
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
 * Move a published article to the recycle bin (soft-delete).
 * If it came from a submission, revert that submission to IN_PRODUCTION.
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
    const result = await prisma.$transaction(async (tx) => {
      return trashPublishedArticle(tx, {
        articleId: id,
        deletedById: admin.sub,
        forEdit,
      });
    });

    if (!result) return jsonError("Article not found", 404);

    const submissionId = result.submissionId;
    return jsonOk({
      ok: true,
      recycled: true,
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
