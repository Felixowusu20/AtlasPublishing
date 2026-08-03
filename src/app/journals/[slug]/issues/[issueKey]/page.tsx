import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleListingCard } from "@/components/article-listing-card";
import { prisma } from "@/lib/db";
import { issueKey, parseIssueKey } from "@/lib/seo/article-seo";
import { absoluteUrl, buildJournalMetadata } from "@/lib/seo/scholar";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; issueKey: string }>;
}): Promise<Metadata> {
  const { slug, issueKey: key } = await params;
  try {
    const journal = await prisma.journal.findUnique({ where: { slug } });
    if (!journal?.isActive) return { title: "Issue | Nahda Publications" };
    const parsed = parseIssueKey(key);
    const label =
      key === "early-view"
        ? "Early View"
        : [
            parsed.volume ? `Vol. ${parsed.volume}` : null,
            parsed.issue ? `Issue ${parsed.issue}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Issue";
    const meta = buildJournalMetadata({
      title: `${journal.title} — ${label}`,
      shortTitle: journal.shortTitle,
      slug: journal.slug,
      description: `${label} of ${journal.title}. ${journal.description}`,
      issn: journal.issn,
      eIssn: journal.eIssn,
    });
    return {
      ...meta,
      alternates: {
        canonical: absoluteUrl(`/journals/${slug}/issues/${key}`),
      },
    };
  } catch {
    return { title: "Issue | Nahda Publications" };
  }
}

export default async function JournalIssuePage({
  params,
}: {
  params: Promise<{ slug: string; issueKey: string }>;
}) {
  const { slug, issueKey: key } = await params;

  const journal = await prisma.journal.findUnique({ where: { slug } });
  if (!journal || !journal.isActive) notFound();

  const articles = await prisma.publishedArticle.findMany({
    where: { journalId: journal.id, isActive: true, deletedAt: null },
    orderBy: { publishedAt: "desc" },
  });

  const matched = articles.filter((a) => issueKey(a.volume, a.issue) === key);
  if (matched.length === 0 && articles.length > 0) {
    // Unknown key with articles elsewhere — 404
    notFound();
  }

  const parsed = parseIssueKey(key);
  const title =
    key === "early-view"
      ? "Early View"
      : [
          parsed.volume ? `Vol. ${parsed.volume}` : null,
          parsed.issue ? `Issue ${parsed.issue}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Issue";

  return (
    <div className="page-wrap">
      <Link
        href={`/journals/${slug}?tab=archives`}
        className="text-sm text-[var(--muted)] hover:text-[var(--accent)]"
      >
        ← {journal.title} archives
      </Link>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
        {journal.shortTitle}
      </p>
      <h1 className="page-title mt-1">{title}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {matched.length} article{matched.length === 1 ? "" : "s"} in{" "}
        {journal.title}
        {journal.issn ? ` · ISSN ${journal.issn}` : ""}
      </p>

      <div className="mt-8 space-y-4">
        {matched.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-sm text-[var(--muted)] ring-1 ring-[var(--line)]">
            No articles published in this issue yet.
          </p>
        ) : null}
        {matched.map((a) => (
          <ArticleListingCard
            key={a.id}
            article={{
              slug: a.slug,
              title: a.title,
              authors: a.authors,
              abstract: a.abstract,
              articleType: a.articleType,
              openAccess: a.openAccess,
              doi: a.doi,
              publishedAt: a.publishedAt.toISOString().slice(0, 10),
              journalTitle: journal.title,
              journalSlug: journal.slug,
              volume: a.volume ?? undefined,
              issue: a.issue ?? undefined,
              views: a.views,
              downloads: a.downloads,
              keywords: a.keywords,
              hasPdf: Boolean(a.manuscriptUrl),
            }}
          />
        ))}
      </div>
    </div>
  );
}
