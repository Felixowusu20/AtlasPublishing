import { prisma } from "@/lib/db";
import { slugify } from "@/lib/submission-utils";
import {
  getFreeNewsDetails,
  listFreeNews,
  NAHDA_NEWS_TOPICS,
  type FreeNewsArticle,
} from "@/lib/freenews";

const SOURCE = "freenews";
const PER_TOPIC = 3;
const MAX_DETAILS = 14;
const HERO_COUNT = 4;

function newsPath(slug: string) {
  return `/news/${slug}`;
}

function summaryFrom(article: FreeNewsArticle) {
  const text = (article.incipit || article.body || "").replace(/\s+/g, " ").trim();
  if (text.length >= 40) return text.slice(0, 320);
  return article.title;
}

function bodyFrom(article: FreeNewsArticle) {
  const body = (article.body || article.incipit || "").trim();
  return body || article.title;
}

async function uniqueSlug(base: string, externalUuid: string) {
  const root = slugify(base).slice(0, 72) || `news-${externalUuid.slice(0, 8)}`;
  const existing = await prisma.newsStory.findUnique({ where: { slug: root } });
  if (!existing || existing.externalUuid === externalUuid) return root;
  return `${root}-${externalUuid.slice(0, 8)}`;
}

export type FreeNewsSyncResult = {
  listed: number;
  upserted: number;
  announcements: number;
  heroSlides: number;
  topics: string[];
  errors: string[];
};

/**
 * Pull Nahda-relevant science / education news from FreeNewsApi,
 * store full stories, and mirror them into announcements + hero CMS.
 */
export async function syncFreeNewsForNahda(options?: {
  topics?: readonly string[];
  perTopic?: number;
  maxDetails?: number;
  heroCount?: number;
}): Promise<FreeNewsSyncResult> {
  const topics = options?.topics ?? NAHDA_NEWS_TOPICS;
  const perTopic = options?.perTopic ?? PER_TOPIC;
  const maxDetails = options?.maxDetails ?? MAX_DETAILS;
  const heroCount = options?.heroCount ?? HERO_COUNT;
  const errors: string[] = [];
  const byUuid = new Map<string, { title: string; topic: string }>();

  for (const topic of topics) {
    try {
      const rows = await listFreeNews({
        topic,
        language: "en",
        pageSize: perTopic,
      });
      for (const row of rows) {
        if (!row.uuid || byUuid.has(row.uuid)) continue;
        byUuid.set(row.uuid, { title: row.title, topic });
      }
    } catch (err) {
      errors.push(
        `${topic}: ${err instanceof Error ? err.message : "list failed"}`,
      );
    }
  }

  const uuids = [...byUuid.keys()].slice(0, maxDetails);
  let upserted = 0;
  let announcements = 0;
  const storyIdsForHero: string[] = [];

  for (const uuid of uuids) {
    try {
      const article = await getFreeNewsDetails(uuid);
      const slug = await uniqueSlug(article.title, article.uuid);
      const summary = summaryFrom(article);
      const body = bodyFrom(article);
      const publishedAt = new Date(article.published_at);
      const imageUrl = article.thumbnail?.trim() || null;
      const topicsList = Array.isArray(article.topics)
        ? article.topics.map(String)
        : [byUuid.get(uuid)?.topic].filter(Boolean) as string[];

      const story = await prisma.newsStory.upsert({
        where: { externalUuid: article.uuid },
        create: {
          externalUuid: article.uuid,
          slug,
          title: article.title.trim(),
          summary,
          body,
          imageUrl,
          publisher: article.publisher?.trim() || null,
          authors: Array.isArray(article.authors)
            ? article.authors.map(String).filter(Boolean)
            : [],
          topics: topicsList,
          originalUrl: article.original_url?.trim() || null,
          publishedAt: Number.isNaN(publishedAt.getTime())
            ? new Date()
            : publishedAt,
          isActive: true,
          showInHero: Boolean(imageUrl),
        },
        update: {
          title: article.title.trim(),
          summary,
          body,
          imageUrl,
          publisher: article.publisher?.trim() || null,
          authors: Array.isArray(article.authors)
            ? article.authors.map(String).filter(Boolean)
            : [],
          topics: topicsList,
          originalUrl: article.original_url?.trim() || null,
          publishedAt: Number.isNaN(publishedAt.getTime())
            ? undefined
            : publishedAt,
          isActive: true,
          showInHero: Boolean(imageUrl),
        },
      });
      upserted += 1;
      if (story.imageUrl) storyIdsForHero.push(story.id);

      await prisma.announcement.upsert({
        where: { externalUuid: article.uuid },
        create: {
          externalUuid: article.uuid,
          source: SOURCE,
          title: story.title,
          summary: story.summary,
          href: newsPath(story.slug),
          imageUrl: story.imageUrl,
          publishedAt: story.publishedAt,
          isActive: true,
        },
        update: {
          source: SOURCE,
          title: story.title,
          summary: story.summary,
          href: newsPath(story.slug),
          imageUrl: story.imageUrl,
          publishedAt: story.publishedAt,
          isActive: true,
        },
      });
      announcements += 1;
    } catch (err) {
      errors.push(
        `${uuid}: ${err instanceof Error ? err.message : "detail failed"}`,
      );
    }
  }

  let heroSlides = 0;
  const slides = storyIdsForHero.length
    ? await prisma.newsStory.findMany({
        where: {
          isActive: true,
          imageUrl: { not: null },
          id: { in: storyIdsForHero },
        },
        orderBy: { publishedAt: "desc" },
        take: heroCount,
      })
    : await prisma.newsStory.findMany({
        where: { isActive: true, imageUrl: { not: null } },
        orderBy: { publishedAt: "desc" },
        take: heroCount,
      });

  for (let i = 0; i < slides.length; i += 1) {
    const story = slides[i];
    if (!story.imageUrl) continue;
    await prisma.heroSlide.upsert({
      where: { externalUuid: story.externalUuid },
      create: {
        externalUuid: story.externalUuid,
        source: SOURCE,
        title: story.title,
        body: story.summary.slice(0, 220),
        imageUrl: story.imageUrl,
        alt: story.title,
        ctaLabel: "Read story",
        ctaHref: newsPath(story.slug),
        sortOrder: 200 + i,
        isActive: true,
      },
      update: {
        source: SOURCE,
        title: story.title,
        body: story.summary.slice(0, 220),
        imageUrl: story.imageUrl,
        alt: story.title,
        ctaLabel: "Read story",
        ctaHref: newsPath(story.slug),
        sortOrder: 200 + i,
        isActive: true,
      },
    });
    heroSlides += 1;
  }

  // Keep editorial announcements visible: only the newest Free News cards stay live.
  const keepIds = (
    await prisma.announcement.findMany({
      where: { source: SOURCE },
      orderBy: { publishedAt: "desc" },
      take: 8,
      select: { id: true },
    })
  ).map((row) => row.id);
  if (keepIds.length > 0) {
    await prisma.announcement.updateMany({
      where: { source: SOURCE, id: { notIn: keepIds } },
      data: { isActive: false },
    });
  }

  // Rotate hero: hide older Free News slides that are no longer in the top set.
  const keepHero = slides.map((s) => s.externalUuid);
  if (keepHero.length > 0) {
    await prisma.heroSlide.updateMany({
      where: {
        source: SOURCE,
        externalUuid: { notIn: keepHero },
      },
      data: { isActive: false },
    });
  }

  return {
    listed: byUuid.size,
    upserted,
    announcements,
    heroSlides,
    topics: [...topics],
    errors,
  };
}

let freshInFlight: Promise<FreeNewsSyncResult | { skipped: true }> | null =
  null;

/** Topics rotate by hour so the feed keeps changing across the day. */
export function rotatingNahdaTopics(count = 5) {
  const all = [...NAHDA_NEWS_TOPICS];
  const start = (new Date().getHours() * 2) % all.length;
  return [...all, ...all].slice(start, start + count);
}

/**
 * Refresh Free News when the cache is stale. Safe to call from public pages:
 * concurrent callers share one in-flight sync.
 */
export async function ensureFreshFreeNews(options?: {
  maxAgeMinutes?: number;
  force?: boolean;
}): Promise<FreeNewsSyncResult | { skipped: true }> {
  const maxAgeMinutes = options?.maxAgeMinutes ?? 90;
  if (!process.env.FREENEWS_API_KEY?.trim()) {
    return { skipped: true };
  }

  if (!options?.force) {
    const latest = await prisma.newsStory.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    if (
      latest &&
      Date.now() - latest.updatedAt.getTime() < maxAgeMinutes * 60_000
    ) {
      return { skipped: true };
    }
  }

  if (freshInFlight) return freshInFlight;

  freshInFlight = (async () => {
    try {
      return await syncFreeNewsForNahda({
        topics: rotatingNahdaTopics(5),
        perTopic: 3,
        maxDetails: 10,
        heroCount: 4,
      });
    } finally {
      freshInFlight = null;
    }
  })();

  return freshInFlight;
}
