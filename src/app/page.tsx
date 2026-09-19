import { HeroSlider } from "@/components/hero-slider";
import { HomeCatalog } from "@/components/home-catalog";
import { HomeRecentArticles } from "@/components/home-recent-articles";
import {
  ResearchSpotlights,
  type ResearchSpotlightCard,
} from "@/components/research-spotlights";
import { resolveArticlePreviewImage } from "@/lib/article-preview-image";
import { prisma } from "@/lib/db";
import { parseGoalTabLinks } from "@/lib/home-cms-defaults";
import { resolveArticleIssue } from "@/lib/issues";
import { resolvePublishedPdfUrl } from "@/lib/submission-utils";

export const dynamic = "force-dynamic";

async function getHomeData() {
  try {
    const [
      articles,
      announcements,
      journals,
      spotlights,
      goalTabs,
      goalsSection,
      indexedPlatforms,
      indexedSection,
    ] = await Promise.all([
      prisma.publishedArticle.findMany({
        where: { isActive: true, deletedAt: null },
        include: {
          journal: true,
          submission: {
            select: {
              manuscriptUrl: true,
              productionBody: true,
              productionFigures: true,
            },
          },
        },
        orderBy: { publishedAt: "desc" },
        take: 8,
      }),
      prisma.announcement.findMany({
        where: { isActive: true },
        orderBy: { publishedAt: "desc" },
        take: 8,
      }),
      prisma.journal.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        take: 9,
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
      prisma.homeGoalTab
        .findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        })
        .catch(() => []),
      prisma.homeSection
        .findUnique({ where: { key: "goals" } })
        .catch(() => null),
      prisma.indexedPlatform
        .findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        })
        .catch(() => []),
      prisma.homeSection
        .findUnique({ where: { key: "indexed" } })
        .catch(() => null),
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

    return {
      articles,
      announcements,
      journals,
      researchCards,
      goalTabs,
      goalsSection,
      indexedPlatforms,
      indexedSection,
    };
  } catch {
    return {
      articles: [],
      announcements: [],
      journals: [],
      researchCards: [] as ResearchSpotlightCard[],
      goalTabs: [],
      goalsSection: null,
      indexedPlatforms: [],
      indexedSection: null,
    };
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const {
    articles,
    announcements,
    journals,
    researchCards,
    goalTabs,
    goalsSection,
    indexedPlatforms,
    indexedSection,
  } = await getHomeData();
  const { q: initialQuery = "" } = await searchParams;

  const mappedArticles = articles.map((article) => {
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
      imageUrl: resolveArticlePreviewImage({
        slug: article.slug,
        productionFigures: article.submission?.productionFigures,
        productionBody: article.submission?.productionBody,
        coverImageUrl: article.coverImageUrl,
        journalCoverImageUrl: article.journal.coverImageUrl,
      }),
    };
  });

  const recentFeatured = mappedArticles.slice(0, 3);

  const mappedGoalTabs = goalTabs.map((tab) => ({
    key: tab.key,
    label: tab.label,
    title: tab.title,
    body: tab.body,
    story: tab.story ?? "",
    imageUrl: tab.imageUrl,
    imageAlt: tab.imageAlt ?? tab.label,
    imageCaption: tab.imageCaption ?? "",
    links: parseGoalTabLinks(tab.links),
    sortOrder: tab.sortOrder,
    id: tab.id,
  }));

  return (
    <div className="max-w-[100%] overflow-x-clip">
      <HeroSlider />

      <HomeRecentArticles
        articles={recentFeatured}
        platforms={indexedPlatforms.map((p) => ({
          id: p.id,
          name: p.name,
          blurb: p.blurb,
          href: p.href,
          logoUrl: p.logoUrl,
        }))}
        indexedSection={
          indexedSection
            ? {
                eyebrow: indexedSection.eyebrow,
                title: indexedSection.title,
                body: indexedSection.body,
              }
            : null
        }
      />

      <ResearchSpotlights initialItems={researchCards} />

      <HomeCatalog
        initialQuery={initialQuery}
        articles={mappedArticles}
        excludeArticleIds={recentFeatured.map((a) => a.id)}
        goalTabs={mappedGoalTabs}
        goalsSection={
          goalsSection
            ? {
                eyebrow: goalsSection.eyebrow ?? "",
                title: goalsSection.title,
                body: goalsSection.body ?? "",
              }
            : null
        }
        announcements={announcements.map((item) => ({
          id: item.id,
          title: item.title,
          summary: item.summary,
          href: item.href,
          publishedAt: item.publishedAt.toISOString().slice(0, 10),
          imageUrl: item.imageUrl,
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
