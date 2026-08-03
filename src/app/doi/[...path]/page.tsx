import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { findArticleByDoi, normalizeDoi } from "@/lib/doi";
import { articleDownloadPath } from "@/lib/submission-utils";
import { formatMetric } from "@/components/article-metrics";
import { JsonLd } from "@/components/json-ld";
import { scholarlyArticleJsonLd } from "@/lib/seo/jsonld";
import { absoluteUrl, buildArticleMetadata } from "@/lib/seo/scholar";

type Props = {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<{ download?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path } = await params;
  const raw = decodeURIComponent(path.join("/"));
  const doi = normalizeDoi(raw);
  try {
    const article = await findArticleByDoi(prisma, doi || raw);
    if (!article) {
      return {
        title: "DOI not found | Nahda Publications",
        robots: { index: false, follow: true },
      };
    }
    const meta = buildArticleMetadata({
      slug: article.slug,
      title: article.title,
      abstract: article.abstract,
      authors: article.authors,
      affiliations: article.affiliations,
      keywords: article.keywords,
      doi: article.doi,
      publishedAt: article.publishedAt,
      volume: article.volume,
      issue: article.issue,
      pages: article.pages,
      manuscriptUrl: article.manuscriptUrl,
      license: article.license,
      openAccess: article.openAccess,
      journal: article.journal,
    });
    return {
      ...meta,
      alternates: {
        ...meta.alternates,
        canonical: absoluteUrl(`/articles/${article.slug}`),
      },
      other: {
        ...(meta.other as Record<string, string | string[]>),
        "DC.identifier": `doi:${normalizeDoi(article.doi || doi)}`,
      },
    };
  } catch (err) {
    console.error("[doi-metadata]", err);
    return { title: "DOI | Nahda Publications" };
  }
}

/**
 * Hosted Nahda DOI record.
 * /doi/10.58000/... → metadata landing for the bound paper
 * /doi/...?download=1 → PDF download
 */
export default async function DoiRecordPage({ params, searchParams }: Props) {
  const { path } = await params;
  const { download } = await searchParams;
  const raw = decodeURIComponent(path.join("/"));
  const doi = normalizeDoi(raw);

  let article: Awaited<ReturnType<typeof findArticleByDoi>> = null;
  try {
    article = await findArticleByDoi(prisma, doi || raw);
  } catch (err) {
    console.error("[doi-page]", err);
  }

  if (article && download === "1") {
    if (article.manuscriptUrl) {
      redirect(articleDownloadPath(article.slug));
    }
  }

  if (!article) {
    return <DoiNotFound doi={doi || raw} />;
  }

  const published = article.publishedAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const authors = article.authors.join(", ");
  const downloadHref = article.manuscriptUrl
    ? articleDownloadPath(article.slug)
    : null;

  return (
    <div className="page-wrap max-w-3xl">
      <JsonLd
        data={scholarlyArticleJsonLd({
          slug: article.slug,
          title: article.title,
          abstract: article.abstract,
          authors: article.authors,
          affiliations: article.affiliations,
          keywords: article.keywords,
          doi: article.doi,
          publishedAt: article.publishedAt,
          volume: article.volume,
          issue: article.issue,
          pages: article.pages,
          manuscriptUrl: article.manuscriptUrl,
          license: article.license,
          openAccess: article.openAccess,
          journal: article.journal,
        })}
      />
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
        Nahda DOI record
      </p>
      <h1 className="page-title mt-1">Digital Object Identifier</h1>
      <p className="mt-2 break-all font-mono text-sm text-[var(--accent)]">
        {normalizeDoi(article.doi || doi)}
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        <div className="border-b border-[var(--line)] bg-[var(--surface)]/80 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Bound publication
          </p>
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Title
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              {article.title}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Authors
            </p>
            <p className="mt-1 text-sm text-[var(--ink)]">{authors}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Journal
              </p>
              <Link
                href={`/journals/${article.journal.slug}`}
                className="mt-1 block text-sm font-semibold text-[var(--accent)] hover:underline"
              >
                {article.journal.title}
              </Link>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Published
              </p>
              <p className="mt-1 text-sm text-[var(--ink)]">{published}</p>
            </div>
          </div>
          {(article.volume || article.issue || article.pages) && (
            <p className="text-sm text-[var(--muted)]">
              {[
                article.volume ? `Vol. ${article.volume}` : null,
                article.issue ? `Issue ${article.issue}` : null,
                article.pages ? `pp. ${article.pages}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          <div className="flex flex-wrap gap-4 border-t border-[var(--line)] pt-4 text-sm text-[var(--muted)]">
            <span>
              <strong className="text-[var(--ink)]">
                {formatMetric(article.views)}
              </strong>{" "}
              views
            </span>
            <span>
              <strong className="text-[var(--ink)]">
                {formatMetric(article.downloads)}
              </strong>{" "}
              downloads
            </span>
            {article.openAccess ? (
              <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-800">
                Open Access
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/articles/${article.slug}`} className="btn-primary">
          View full article
        </Link>
        {downloadHref ? (
          <a href={downloadHref} className="btn-secondary">
            Download PDF
          </a>
        ) : null}
        <Link href="/search" className="btn-secondary">
          Search DOIs
        </Link>
      </div>

      <p className="mt-8 text-xs leading-relaxed text-[var(--muted)]">
        This DOI is hosted by Nahda Publications. Resolving{" "}
        <code className="rounded bg-[var(--surface)] px-1.5 py-0.5">
          {normalizeDoi(article.doi || doi)}
        </code>{" "}
        always lands on this record and the bound paper on our site. Crossref
        registration can later point doi.org to this same landing URL.
      </p>
    </div>
  );
}

function DoiNotFound({ doi }: { doi: string }) {
  return (
    <div className="page-wrap max-w-xl text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 ring-1 ring-rose-200">
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5" />
          <circle cx="12" cy="16" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      </div>
      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-700">
        DOI error
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)] sm:text-3xl">
        No article found for this DOI
      </h1>
      <p className="mt-3 break-all font-mono text-sm text-[var(--muted)]">
        {doi || "(empty)"}
      </p>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[var(--muted)]">
        Nahda hosts its own DOI records. This identifier is not linked to a live
        published paper in our catalogue. Check the spelling, or search by title
        or author.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/search" className="btn-primary">
          Search articles
        </Link>
        <Link href="/articles" className="btn-secondary">
          Browse articles
        </Link>
      </div>
    </div>
  );
}
