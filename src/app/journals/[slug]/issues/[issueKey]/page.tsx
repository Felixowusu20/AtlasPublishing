import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArticleListingCard } from "@/components/article-listing-card";
import { prisma } from "@/lib/db";
import { displayIssn } from "@/lib/issn";
import {
  deriveIssueRecords,
  formatDateInterval,
  issueTitle,
  resolveArticleIssue,
} from "@/lib/issues";
import { issueKey, parseIssueKey } from "@/lib/seo/article-seo";
import { absoluteUrl, buildJournalMetadata } from "@/lib/seo/scholar";
import { resolvePublishedPdfUrl } from "@/lib/submission-utils";

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
    const label = issueTitle(parsed.volume, parsed.issue);
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
    include: { submission: { select: { manuscriptUrl: true } } },
    orderBy: { publishedAt: "desc" },
  });

  const resolvedOf = (a: (typeof articles)[number]) =>
    resolveArticleIssue({
      volume: a.volume,
      issue: a.issue,
      publishedAt: a.publishedAt,
      frequency: journal.frequency,
      foundedYear: journal.foundedYear,
    });

  if (key === "early-view") {
    const records = deriveIssueRecords(
      articles.map((a) => ({
        volume: a.volume,
        issue: a.issue,
        publishedAt: a.publishedAt,
        journal,
      })),
    );
    const current = records.find((row) => row.isCurrent);
    redirect(current?.href ?? `/journals/${slug}?tab=archives`);
  }

  const matched = articles.filter((a) => {
    const numbered = resolvedOf(a);
    return issueKey(numbered.volume, numbered.issue) === key;
  });
  if (matched.length === 0 && articles.length > 0) {
    notFound();
  }

  const parsed = parseIssueKey(key);
  const first = matched[0] ? resolvedOf(matched[0]) : null;
  const title = issueTitle(
    first?.volume ?? parsed.volume,
    first?.issue ?? parsed.issue,
  );
  const dates = matched.map((a) => a.publishedAt);
  const interval =
    dates.length > 0
      ? formatDateInterval(
          dates.reduce((a, b) => (a < b ? a : b)),
          dates.reduce((a, b) => (a > b ? a : b)),
          journal.frequency,
        )
      : null;

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
        {interval ? ` · ${interval}` : ""}
        {` · ISSN ${displayIssn(journal.issn)}`}
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
              volume: resolvedOf(a).volume,
              issue: resolvedOf(a).issue,
              views: a.views,
              downloads: a.downloads,
              keywords: a.keywords,
              hasPdf: Boolean(
                resolvePublishedPdfUrl(
                  a.manuscriptUrl,
                  a.submission?.manuscriptUrl,
                ),
              ),
            }}
          />
        ))}
      </div>
    </div>
  );
}
