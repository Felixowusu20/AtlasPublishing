import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import {
  CMS_PAGE_SLUGS,
  ensureCmsDefaults,
  isCmsPageSlug,
} from "@/lib/cms";

export async function GET() {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  await ensureCmsDefaults();
  const pages = await prisma.cmsPage.findMany({
    include: { images: { orderBy: { sortOrder: "asc" } } },
    orderBy: { slug: "asc" },
  });
  return jsonOk({ pages, slugs: CMS_PAGE_SLUGS });
}

const patchSchema = z.object({
  slug: z.enum(["about", "terms", "privacy"]),
  title: z.string().min(2).optional(),
  subtitle: z.string().nullable().optional(),
  body: z.string().min(20).optional(),
  heroImageUrl: z.string().url().nullable().optional(),
  heroImagePublicId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const body = patchSchema.parse(await request.json());
    if (!isCmsPageSlug(body.slug)) {
      return jsonError("Invalid page slug");
    }

    await ensureCmsDefaults();
    const page = await prisma.cmsPage.update({
      where: { slug: body.slug },
      data: {
        title: body.title,
        subtitle: body.subtitle === undefined ? undefined : body.subtitle,
        body: body.body,
        heroImageUrl:
          body.heroImageUrl === undefined ? undefined : body.heroImageUrl,
        heroImagePublicId:
          body.heroImagePublicId === undefined
            ? undefined
            : body.heroImagePublicId,
        isActive: body.isActive,
      },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
    return jsonOk({ page });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error(err);
    return jsonError("Could not update page", 500);
  }
}
