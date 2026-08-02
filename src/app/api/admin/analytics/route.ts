import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

/** Aggregate views / downloads / trends for the admin analytics overview. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    const where = { deletedAt: null as Date | null, isActive: true };

    const [totals, articles, journals] = await Promise.all([
      prisma.publishedArticle.aggregate({
        where,
        _count: true,
        _sum: { views: true, downloads: true, citations: true },
      }),
      prisma.publishedArticle.findMany({
        where,
        select: {
          id: true,
          slug: true,
          title: true,
          doi: true,
          views: true,
          downloads: true,
          citations: true,
          publishedAt: true,
          journalId: true,
          journal: { select: { id: true, shortTitle: true, title: true } },
        },
        orderBy: { publishedAt: "desc" },
      }),
      prisma.journal.findMany({
        where: { isActive: true },
        select: { id: true, shortTitle: true, title: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    const topViews = [...articles]
      .sort((a, b) => b.views - a.views)
      .slice(0, 8)
      .map((a) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        doi: a.doi,
        views: a.views,
        downloads: a.downloads,
        journal: { shortTitle: a.journal.shortTitle },
      }));

    const topDownloads = [...articles]
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 8)
      .map((a) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        doi: a.doi,
        views: a.views,
        downloads: a.downloads,
        journal: { shortTitle: a.journal.shortTitle },
      }));

    const byJournal = journals.map((j) => {
      const rows = articles.filter((a) => a.journalId === j.id);
      return {
        id: j.id,
        shortTitle: j.shortTitle,
        title: j.title,
        articles: rows.length,
        views: rows.reduce((s, a) => s + a.views, 0),
        downloads: rows.reduce((s, a) => s + a.downloads, 0),
      };
    });

    // Last 6 calendar months of publishes + engagement
    const now = new Date();
    const months: {
      key: string;
      label: string;
      published: number;
      views: number;
      downloads: number;
    }[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString(undefined, {
        month: "short",
        year: "2-digit",
      });
      const inMonth = articles.filter((a) => {
        const p = a.publishedAt;
        return (
          p.getFullYear() === d.getFullYear() && p.getMonth() === d.getMonth()
        );
      });
      months.push({
        key,
        label,
        published: inMonth.length,
        views: inMonth.reduce((s, a) => s + a.views, 0),
        downloads: inMonth.reduce((s, a) => s + a.downloads, 0),
      });
    }

    const engagement = topViews.slice(0, 6).map((a) => ({
      id: a.id,
      label: a.title.length > 28 ? `${a.title.slice(0, 28)}…` : a.title,
      fullTitle: a.title,
      slug: a.slug,
      views: a.views,
      downloads: a.downloads,
    }));

    return jsonOk({
      totals: {
        articles: totals._count,
        views: totals._sum.views ?? 0,
        downloads: totals._sum.downloads ?? 0,
        citations: totals._sum.citations ?? 0,
      },
      topViews,
      topDownloads,
      byJournal,
      months,
      engagement,
    });
  } catch (err) {
    console.error("[admin analytics]", err);
    return jsonError("Could not load analytics", 500);
  }
}
