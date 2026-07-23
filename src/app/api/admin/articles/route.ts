import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonCreated, jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { slugify } from "@/lib/submission-utils";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const articles = await prisma.publishedArticle.findMany({
    include: { journal: true },
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
    const article = await prisma.publishedArticle.create({
      data: {
        title: body.title,
        slug,
        doi: body.doi,
        authors: body.authors,
        affiliations: body.affiliations ?? [],
        journalId: body.journalId,
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : undefined,
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

export async function DELETE(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("Missing id");
  await prisma.publishedArticle.delete({ where: { id } });
  return jsonOk({ ok: true });
}
