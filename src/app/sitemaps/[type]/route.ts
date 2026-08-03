import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo/scholar";
import { issueKey } from "@/lib/seo/article-seo";

function urlset(urls: { loc: string; lastmod?: string; priority?: string }[]) {
  const body = urls
    .map(
      (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>${
      u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""
    }${u.priority ? `\n    <priority>${u.priority}</priority>` : ""}
  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xmlResponse(xml: string) {
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;

  try {
    if (type === "articles.xml" || type === "articles") {
      const articles = await prisma.publishedArticle.findMany({
        where: { isActive: true, deletedAt: null },
        select: { slug: true, updatedAt: true, publishedAt: true },
        orderBy: { publishedAt: "desc" },
      });
      return xmlResponse(
        urlset(
          articles.map((a) => ({
            loc: absoluteUrl(`/articles/${a.slug}`),
            lastmod: (a.updatedAt || a.publishedAt).toISOString(),
            priority: "0.9",
          })),
        ),
      );
    }

    if (type === "journals.xml" || type === "journals") {
      const journals = await prisma.journal.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: { sortOrder: "asc" },
      });
      return xmlResponse(
        urlset(
          journals.map((j) => ({
            loc: absoluteUrl(`/journals/${j.slug}`),
            lastmod: j.updatedAt.toISOString(),
            priority: "0.85",
          })),
        ),
      );
    }

    if (type === "issues.xml" || type === "issues") {
      const articles = await prisma.publishedArticle.findMany({
        where: { isActive: true, deletedAt: null },
        select: {
          volume: true,
          issue: true,
          publishedAt: true,
          journal: { select: { slug: true } },
        },
      });
      const map = new Map<string, Date>();
      for (const a of articles) {
        const key = `${a.journal.slug}/${issueKey(a.volume, a.issue)}`;
        const prev = map.get(key);
        if (!prev || a.publishedAt > prev) map.set(key, a.publishedAt);
      }
      return xmlResponse(
        urlset(
          [...map.entries()].map(([key, lastmod]) => {
            const [journalSlug, issue] = key.split("/");
            return {
              loc: absoluteUrl(`/journals/${journalSlug}/issues/${issue}`),
              lastmod: lastmod.toISOString(),
              priority: "0.7",
            };
          }),
        ),
      );
    }
  } catch (err) {
    console.error("[sitemaps]", err);
  }

  return new NextResponse("Not found", { status: 404 });
}
