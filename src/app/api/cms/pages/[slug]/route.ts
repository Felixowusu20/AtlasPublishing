import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureCmsDefaults, isCmsPageSlug } from "@/lib/cms";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  if (!isCmsPageSlug(slug)) {
    return jsonError("Unknown page", 404);
  }

  try {
    await ensureCmsDefaults();
    const page = await prisma.cmsPage.findFirst({
      where: { slug, isActive: true },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
    if (!page) return jsonError("Page not found", 404);
    return jsonOk({ page });
  } catch (err) {
    console.error(err);
    return jsonError("Could not load page", 500);
  }
}
