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

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const type = new URL(request.url).searchParams.get("type") ?? "all";

  if (!q) {
    return jsonOk({ articles: [], journals: [], query: q });
  }

  const needle = q.toLowerCase();
  const doiNeedle = normalizeDoi(q);

  let articles: SearchArticle[] = [];
  let journalResults: {
    id: string;
    slug: string;
    title: string;
    subjects: string[];
  }[] = [];

  try {
    const [dbArticles, dbJournals] = await Promise.all([
      prisma.publishedArticle.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { abstract: { contains: q, mode: "insensitive" } },
            { doi: { contains: doiNeedle, mode: "insensitive" } },
          ],
        },
        include: { journal: true },
        orderBy: { publishedAt: "desc" },
        take: 40,
      }),
      prisma.journal.findMany({
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
      }),
    ]);

    articles = dbArticles
      .filter((a) => {
        const hay = [
          a.title,
          a.abstract,
          a.doi ?? "",
          a.authors.join(" "),
          a.keywords.join(" "),
          a.journal.title,
        ]
          .join(" ")
          .toLowerCase();
        return (
          hay.includes(needle) ||
          (a.doi && normalizeDoi(a.doi) === doiNeedle) ||
          Boolean(a.doi?.toLowerCase().includes(doiNeedle))
        );
      })
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
      subjects: j.subjects,
    }));
  } catch (err) {
    console.error("[search]", err);
  }

  if (articles.length === 0) {
    articles = mockArticles
      .filter((a) => {
        const hay = [
          a.title,
          a.abstract,
          a.doi,
          a.authors.join(" "),
          a.keywords.join(" "),
          a.journalTitle,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(needle) || a.doi.toLowerCase().includes(doiNeedle);
      })
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

  if (journalResults.length === 0) {
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
    articles,
    journals: journalResults,
  });
}
