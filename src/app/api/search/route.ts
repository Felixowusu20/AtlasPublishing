import { prisma } from "@/lib/db";
import { jsonOk } from "@/lib/api";
import { normalizeDoi } from "@/lib/doi";
import {
  journals as mockJournals,
  publishedArticles as mockArticles,
} from "@/data/mock";

type SearchArticle = {
  id: string;
  slug: string;
  title: string;
  authors: string[];
  abstract: string;
  articleType: string;
  openAccess: boolean;
  doi: string | null;
  keywords: string[];
  journalTitle: string;
  journalSlug: string;
  publishedAt: string;
  volume?: string;
  issue?: string;
  views: number;
  downloads: number;
  hasPdf: boolean;
};

function matchesQuery(
  parts: (string | null | undefined)[],
  needle: string,
  doiNeedle: string,
) {
  if (!needle) return true;
  const hay = parts.filter(Boolean).join(" ").toLowerCase();
  if (hay.includes(needle)) return true;
  if (doiNeedle && hay.includes(doiNeedle)) return true;
  return false;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim() ?? "";
  const type = params.get("type") ?? "all";
  const journalKey = params.get("journal")?.trim() ?? "";

  if (!q && !journalKey) {
    return jsonOk({
      articles: [],
      journals: [],
      query: q,
      journal: journalKey,
    });
  }

  const needle = q.toLowerCase();
  const doiNeedle = q ? normalizeDoi(q) : "";

  let articles: SearchArticle[] = [];
  let journalResults: {
    id: string;
    slug: string;
    title: string;
    shortTitle?: string;
    subjects: string[];
  }[] = [];

  try {
    const journalFilter = journalKey
      ? {
          journal: {
            isActive: true,
            OR: [
              { slug: journalKey },
              {
                shortTitle: {
                  equals: journalKey,
                  mode: "insensitive" as const,
                },
              },
              { id: journalKey },
            ],
          },
        }
      : {};

    const [dbArticles, dbJournals] = await Promise.all([
      prisma.publishedArticle.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          ...journalFilter,
        },
        include: { journal: true },
        orderBy: { publishedAt: "desc" },
        take: 150,
      }),
      q
        ? prisma.journal.findMany({
            where: {
              isActive: true,
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { shortTitle: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            },
            orderBy: { sortOrder: "asc" },
            take: 20,
          })
        : Promise.resolve([]),
    ]);

    articles = dbArticles
      .filter((a) =>
        matchesQuery(
          [
            a.title,
            a.abstract,
            a.doi,
            a.authors.join(" "),
            a.keywords.join(" "),
            a.journal.title,
            a.journal.shortTitle,
            a.articleType,
          ],
          needle,
          doiNeedle,
        ),
      )
      .slice(0, 40)
      .map((a) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        authors: a.authors,
        abstract: a.abstract,
        articleType: a.articleType,
        openAccess: a.openAccess,
        doi: a.doi,
        keywords: a.keywords,
        journalTitle: a.journal.title,
        journalSlug: a.journal.slug,
        publishedAt: a.publishedAt.toISOString().slice(0, 10),
        volume: a.volume ?? undefined,
        issue: a.issue ?? undefined,
        views: a.views,
        downloads: a.downloads,
        hasPdf: Boolean(a.manuscriptUrl),
      }));

    journalResults = dbJournals.map((j) => ({
      id: j.id,
      slug: j.slug,
      title: j.title,
      shortTitle: j.shortTitle,
      subjects: j.subjects,
    }));
  } catch (err) {
    console.error("[search]", err);
  }

  if (articles.length === 0) {
    articles = mockArticles
      .filter((a) => {
        if (
          journalKey &&
          a.journalSlug !== journalKey &&
          a.journalTitle.toLowerCase() !== journalKey.toLowerCase()
        ) {
          return false;
        }
        return matchesQuery(
          [
            a.title,
            a.abstract,
            a.doi,
            a.authors.join(" "),
            a.keywords.join(" "),
            a.journalTitle,
          ],
          needle,
          doiNeedle,
        );
      })
      .slice(0, 40)
      .map((a) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        authors: a.authors,
        abstract: a.abstract,
        articleType: a.articleType,
        openAccess: a.openAccess,
        doi: a.doi,
        keywords: a.keywords,
        journalTitle: a.journalTitle,
        journalSlug: a.journalSlug,
        publishedAt: a.publishedAt,
        volume: a.volume,
        issue: a.issue,
        views: a.views,
        downloads: a.downloads,
        hasPdf: false,
      }));
  }

  if (q && journalResults.length === 0) {
    journalResults = mockJournals
      .filter(
        (j) =>
          j.title.toLowerCase().includes(needle) ||
          j.subjects.join(" ").toLowerCase().includes(needle),
      )
      .map((j) => ({
        id: j.id,
        slug: j.slug,
        title: j.title,
        subjects: j.subjects,
      }));
  }

  if (type === "articles") journalResults = [];
  if (type === "journals") articles = [];

  return jsonOk({
    query: q,
    journal: journalKey,
    articles,
    journals: journalResults,
  });
}
