import { formatMetric } from "@/components/article-metrics";
import { HeroSlider } from "@/components/hero-slider";
import { HomeCatalog } from "@/components/home-catalog";
import { prisma } from "@/lib/db";
import { resolveArticleIssue } from "@/lib/issues";
import { resolvePublishedPdfUrl } from "@/lib/submission-utils";

export const dynamic = "force-dynamic";

type HomeStats = {
  articleCount: number;
  journalCount: number;
  totalViews: number;
  totalDownloads: number;
};

async function getHomeData() {
  try {
    const [articles, announcements, journals, metrics, journalCount] =
      await Promise.all([
        prisma.publishedArticle.findMany({
          where: { isActive: true, deletedAt: null },
          include: {
            journal: true,
            submission: { select: { manuscriptUrl: true } },
          },
          orderBy: { publishedAt: "desc" },
          take: 4,
        }),
        prisma.announcement.findMany({
          where: { isActive: true },
          orderBy: { publishedAt: "desc" },
          take: 5,
        }),
        prisma.journal.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
          take: 6,
        }),
        prisma.publishedArticle.aggregate({
          where: { isActive: true, deletedAt: null },
          _count: true,
          _sum: { views: true, downloads: true },
        }),
        prisma.journal.count({ where: { isActive: true } }),
      ]);

    const stats: HomeStats = {
      articleCount: metrics._count,
      journalCount,
      totalViews: metrics._sum.views ?? 0,
      totalDownloads: metrics._sum.downloads ?? 0,
    };

    return { articles, announcements, journals, stats };
  } catch {
    return {
      articles: [],
      announcements: [],
      journals: [],
      stats: null as HomeStats | null,
    };
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { articles, announcements, journals, stats } = await getHomeData();
  const { q: initialQuery = "" } = await searchParams;

  return (
    <div className="max-w-[100%] overflow-x-clip">
      <HeroSlider />

      {stats && (
        <section className="border-b border-[var(--line)] bg-white">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden px-4 py-7 sm:grid-cols-4 sm:px-6">
            {(
              [
                ["Published articles", stats.articleCount],
                ["Active journals", stats.journalCount],
                ["Article views", stats.totalViews],
                ["PDF downloads", stats.totalDownloads],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="px-4 py-2 text-center sm:py-0">
                <dd className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-3xl">
                  {formatMetric(value)}
                </dd>
                <dt className="mt-1 text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                  {label}
                </dt>
              </div>
            ))}
          </dl>
        </section>
      )}

      <HomeCatalog
        initialQuery={initialQuery}
        articles={articles.map((article) => {
          const numbered = resolveArticleIssue({
            volume: article.volume,
            issue: article.issue,
            publishedAt: article.publishedAt,
            frequency: article.journal.frequency,
            foundedYear: article.journal.foundedYear,
          });
          return {
          id: article.id,
          slug: article.slug,
          title: article.title,
          authors: article.authors,
          abstract: article.abstract,
          articleType: article.articleType,
          openAccess: article.openAccess,
          doi: article.doi,
          publishedAt: article.publishedAt.toISOString().slice(0, 10),
          journalTitle: article.journal.title,
          journalSlug: article.journal.slug,
          volume: numbered.volume,
          issue: numbered.issue,
          views: article.views,
          downloads: article.downloads,
          keywords: article.keywords,
          hasPdf: Boolean(
            resolvePublishedPdfUrl(
              article.manuscriptUrl,
              article.submission?.manuscriptUrl,
            ),
          ),
        };
        })}
        announcements={announcements.map((item) => ({
          id: item.id,
          title: item.title,
          summary: item.summary,
          href: item.href,
          publishedAt: item.publishedAt.toISOString().slice(0, 10),
        }))}
        journals={journals.map((journal) => ({
          id: journal.id,
          slug: journal.slug,
          title: journal.title,
          shortTitle: journal.shortTitle,
          openAccess: journal.openAccess,
          doiPrefix: journal.doiPrefix,
          coverImageUrl: journal.coverImageUrl,
          coverColor: journal.coverColor,
          description: journal.description,
          subjects: journal.subjects,
        }))}
      />
    </div>
  );
}
