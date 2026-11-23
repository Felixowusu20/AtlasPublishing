import { prisma } from "@/lib/db";
import { jsonOk } from "@/lib/api";

export async function GET() {
  try {
    const stories = await prisma.newsStory.findMany({
      where: { isActive: true },
      orderBy: { publishedAt: "desc" },
      take: 40,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        imageUrl: true,
        publisher: true,
        topics: true,
        publishedAt: true,
      },
    });
    return jsonOk({ stories });
  } catch (err) {
    console.error(err);
    return jsonOk({ stories: [] });
  }
}
