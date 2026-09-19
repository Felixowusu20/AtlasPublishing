import { prisma } from "@/lib/db";
import { jsonOk } from "@/lib/api";
import { parseGoalTabLinks } from "@/lib/home-cms-defaults";

export async function GET() {
  try {
    const [tabs, section] = await Promise.all([
      prisma.homeGoalTab.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.homeSection.findUnique({ where: { key: "goals" } }),
    ]);
    return jsonOk({
      section,
      tabs: tabs.map((tab) => ({
        ...tab,
        links: parseGoalTabLinks(tab.links),
      })),
    });
  } catch (err) {
    console.error(err);
    return jsonOk({ tabs: [], section: null });
  }
}
