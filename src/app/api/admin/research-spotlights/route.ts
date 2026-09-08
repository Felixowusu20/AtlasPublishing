import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonCreated, jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const spotlights = await prisma.researchSpotlight.findMany({
    include: {
      article: {
        select: {
          id: true,
          slug: true,
          title: true,
          coverImageUrl: true,
          journal: { select: { title: true, shortTitle: true } },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return jsonOk({ spotlights });
}

const schema = z.object({
  title: z.string().min(2),
  summary: z.string().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  logoPublicId: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  imagePublicId: z.string().optional().nullable(),
  articleId: z.string().min(1).optional().nullable(),
  externalHref: z.string().optional().nullable(),
  ctaLabel: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function POST(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const body = schema.parse(await request.json());
    if (!body.logoUrl && !body.imageUrl && !body.articleId) {
      return jsonError("Add a logo, image, or link a published article");
    }
    const spotlight = await prisma.researchSpotlight.create({
      data: {
        title: body.title,
        summary: body.summary || null,
        logoUrl: body.logoUrl || null,
        logoPublicId: body.logoPublicId || null,
        imageUrl: body.imageUrl || null,
        imagePublicId: body.imagePublicId || null,
        articleId: body.articleId || null,
        externalHref: body.externalHref || null,
        ctaLabel: body.ctaLabel || null,
        sortOrder: body.sortOrder ?? 0,
        isActive: body.isActive ?? true,
      },
    });
    return jsonCreated({ spotlight });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not create spotlight", 500);
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const raw = await request.json();
    const id = z.string().min(1).parse(raw.id);
    const rest = { ...(raw as Record<string, unknown>) };
    delete rest.id;
    const data = schema.partial().parse(rest);
    if (Object.keys(data).length === 0) {
      return jsonError("No fields to update");
    }
    const spotlight = await prisma.researchSpotlight.update({
      where: { id },
      data: {
        ...data,
        summary: data.summary === undefined ? undefined : data.summary || null,
        logoUrl: data.logoUrl === undefined ? undefined : data.logoUrl || null,
        logoPublicId:
          data.logoPublicId === undefined ? undefined : data.logoPublicId || null,
        imageUrl:
          data.imageUrl === undefined ? undefined : data.imageUrl || null,
        imagePublicId:
          data.imagePublicId === undefined
            ? undefined
            : data.imagePublicId || null,
        articleId:
          data.articleId === undefined ? undefined : data.articleId || null,
        externalHref:
          data.externalHref === undefined
            ? undefined
            : data.externalHref || null,
        ctaLabel:
          data.ctaLabel === undefined ? undefined : data.ctaLabel || null,
      },
    });
    return jsonOk({ spotlight });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not update spotlight", 500);
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("Missing id");
  await prisma.researchSpotlight.delete({ where: { id } });
  return jsonOk({ ok: true });
}
