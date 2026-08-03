import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { absoluteUrl, seoBaseUrl } from "@/lib/seo/scholar";
import { issueKey } from "@/lib/seo/article-seo";

/**
 * Combined sitemap: static pages + journals + articles + derived issues.
 * Also exposed as focused feeds under /sitemap/articles.xml etc. via route handlers.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = seoBaseUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/articles",
    "/journals",
    "/search",
    "/about",
    "/help",
    "/authors/guidelines",
    "/authors/article-types",
    "/authors/fees",
  ].map((path) => ({
    url: absoluteUrl(path || "/"),
    lastModified: now,
    changeFrequency: path === "" || path === "/articles" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/articles" || path === "/journals" ? 0.9 : 0.6,
  }));

  let journals: { slug: string; updatedAt: Date }[] = [];
  let articles: {
    slug: string;
    updatedAt: Date;
    publishedAt: Date;
    volume: string | null;
    issue: string | null;
    journal: { slug: string };
  }[] = [];

  try {
    [journals, articles] = await Promise.all([
      prisma.journal.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.publishedArticle.findMany({
        where: { isActive: true, deletedAt: null },
        select: {
          slug: true,
          updatedAt: true,
          publishedAt: true,
          volume: true,
          issue: true,
          journal: { select: { slug: true } },
        },
        orderBy: { publishedAt: "desc" },
      }),
    ]);
  } catch (err) {
    console.error("[sitemap]", err);
  }

  const journalEntries: MetadataRoute.Sitemap = journals.map((j) => ({
    url: absoluteUrl(`/journals/${j.slug}`),
    lastModified: j.updatedAt,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: absoluteUrl(`/articles/${a.slug}`),
    lastModified: a.updatedAt || a.publishedAt,
    changeFrequency: "monthly",
    priority: 0.9,
  }));

  const issueMap = new Map<
    string,
    { journalSlug: string; key: string; lastModified: Date }
  >();
  for (const a of articles) {
    const key = issueKey(a.volume, a.issue);
    const id = `${a.journal.slug}::${key}`;
    const prev = issueMap.get(id);
    const lastModified = a.publishedAt;
    if (!prev || lastModified > prev.lastModified) {
      issueMap.set(id, {
        journalSlug: a.journal.slug,
        key,
        lastModified,
      });
    }
  }

  const issueEntries: MetadataRoute.Sitemap = [...issueMap.values()].map(
    (i) => ({
      url: absoluteUrl(`/journals/${i.journalSlug}/issues/${i.key}`),
      lastModified: i.lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    }),
  );

  void base;
  return [
    ...staticRoutes,
    ...journalEntries,
    ...articleEntries,
    ...issueEntries,
  ];
}
