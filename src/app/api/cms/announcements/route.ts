import { prisma } from "@/lib/db";
import { jsonOk } from "@/lib/api";

export async function GET() {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { publishedAt: "desc" },
      take: 20,
    });
    return jsonOk({ announcements });
  } catch (err) {
    console.error(err);
    return jsonOk({ announcements: [] });
  }
}
