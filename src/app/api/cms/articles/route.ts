import { prisma } from "@/lib/db";
import { jsonOk } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get("featured") === "1";
    const limit = Math.min(Number(searchParams.get("limit") ?? "12") || 12, 50);

    const articles = await prisma.publishedArticle.findMany({
      where: {
        isActive: true,
        ...(featured ? { isFeatured: true } : {}),
      },
      include: { journal: true },
      orderBy: { publishedAt: "desc" },
      take: limit,
    });

    return jsonOk({ articles });
  } catch (err) {
    console.error(err);
    return jsonOk({ articles: [] });
  }
}
