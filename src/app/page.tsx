import { HeroSlider } from "@/components/hero-slider";
import { HomeCatalog } from "@/components/home-catalog";
import {
  ResearchSpotlights,
  type ResearchSpotlightCard,
} from "@/components/research-spotlights";
import { prisma } from "@/lib/db";
import { resolveArticleIssue } from "@/lib/issues";
import { resolvePublishedPdfUrl } from "@/lib/submission-utils";

export const dynamic = "force-dynamic";

async function getHomeData() {
  try {
    const [articles, announcements, journals, spotlights] = await Promise.all([
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
      prisma.researchSpotlight.findMany({
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
      }),
    ]);

    const researchCards: ResearchSpotlightCard[] = spotlights.map((item) => {
      const articleLive =
        item.article &&
        item.article.isActive &&
        item.article.deletedAt == null
          ? item.article
          : null;
      return {
        id: item.id,
        title: item.title,
        summary: item.summary,
        logoUrl: item.logoUrl,
        imageUrl:
          item.imageUrl || articleLive?.coverImageUrl || item.logoUrl || null,
        articleTitle: articleLive?.title ?? null,
        href: articleLive
          ? `/articles/${articleLive.slug}`
          : item.externalHref || null,
        ctaLabel: item.ctaLabel || (articleLive ? "Read article" : null),
      };
    });

    return { articles, announcements, journals, researchCards };
  } catch {
    return {
      articles: [],
      announcements: [],
      journals: [],
      researchCards: [] as ResearchSpotlightCard[],
    };
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { articles, announcements, journals, researchCards } =
    await getHomeData();
  const { q: initialQuery = "" } = await searchParams;

  return (
    <div className="max-w-[100%] overflow-x-clip">
      <HeroSlider />

      <ResearchSpotlights initialItems={researchCards} />

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
          coverColor: journal.coverColor,
          coverImageUrl: journal.coverImageUrl,
          description: journal.description,
          subjects: journal.subjects,
        }))}
      />
    </div>
  );
}
