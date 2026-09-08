import { prisma } from "@/lib/db";
import { jsonOk } from "@/lib/api";

export async function GET() {
  try {
    const spotlights = await prisma.researchSpotlight.findMany({
      where: { isActive: true },
      include: {
        article: {
          select: {
            slug: true,
            title: true,
            coverImageUrl: true,
            isActive: true,
            deletedAt: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    const items = spotlights.map((item) => {
      const articleLive =
        item.article &&
        item.article.isActive &&
        item.article.deletedAt == null
          ? item.article
          : null;
      const href = articleLive
        ? `/articles/${articleLive.slug}`
        : item.externalHref || null;
      const imageUrl =
        item.imageUrl || articleLive?.coverImageUrl || item.logoUrl || null;
      return {
        id: item.id,
        title: item.title,
        summary: item.summary,
        logoUrl: item.logoUrl,
        imageUrl,
        articleTitle: articleLive?.title ?? null,
        href,
        ctaLabel: item.ctaLabel || (articleLive ? "Read article" : null),
      };
    });

    return jsonOk({ spotlights: items });
  } catch (err) {
    console.error(err);
    return jsonOk({ spotlights: [] });
  }
}
