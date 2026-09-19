import { prisma } from "@/lib/db";
import { jsonOk } from "@/lib/api";

export async function GET() {
  try {
    const [platforms, section] = await Promise.all([
      prisma.indexedPlatform.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.homeSection.findUnique({ where: { key: "indexed" } }),
    ]);
    return jsonOk({ platforms, section });
  } catch (err) {
    console.error(err);
    return jsonOk({ platforms: [], section: null });
  }
}
