import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonCreated, jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { ensureCmsDefaults, isCmsPageSlug } from "@/lib/cms";

const createSchema = z.object({
  slug: z.enum(["about", "terms", "privacy"]),
  imageUrl: z.string().url(),
  imagePublicId: z.string().optional(),
  caption: z.string().optional(),
  alt: z.string().optional(),
});

export async function POST(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const body = createSchema.parse(await request.json());
    if (!isCmsPageSlug(body.slug)) return jsonError("Invalid page slug");

    await ensureCmsDefaults();
    const page = await prisma.cmsPage.findUnique({ where: { slug: body.slug } });
    if (!page) return jsonError("Page not found", 404);

    const max = await prisma.cmsPageImage.aggregate({
      where: { pageId: page.id },
      _max: { sortOrder: true },
    });

    const image = await prisma.cmsPageImage.create({
      data: {
        pageId: page.id,
        imageUrl: body.imageUrl,
        imagePublicId: body.imagePublicId,
        caption: body.caption,
        alt: body.alt,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
    return jsonCreated({ image });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not add image", 500);
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("Missing id");

  await prisma.cmsPageImage.delete({ where: { id } });
  return jsonOk({ ok: true });
}

const patchSchema = z.object({
  id: z.string().min(1),
  caption: z.string().nullable().optional(),
  alt: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const body = patchSchema.parse(await request.json());
    const image = await prisma.cmsPageImage.update({
      where: { id: body.id },
      data: {
        caption: body.caption === undefined ? undefined : body.caption,
        alt: body.alt === undefined ? undefined : body.alt,
        sortOrder: body.sortOrder,
      },
    });
    return jsonOk({ image });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not update image", 500);
  }
}
