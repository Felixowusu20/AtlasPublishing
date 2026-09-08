import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { identifierLabel, nidPath, normalizeNid } from "@/lib/doi";
import { findArticleByNid } from "@/lib/doi-db";
import {
  articleDownloadPath,
  articleViewPath,
} from "@/lib/submission-utils";
import { formatMetric } from "@/components/article-metrics";
import { JsonLd } from "@/components/json-ld";
import { scholarlyArticleJsonLd } from "@/lib/seo/jsonld";
import { absoluteUrl, buildArticleMetadata } from "@/lib/seo/scholar";
import { authorDisplayName } from "@/lib/orcid";
import { ArticleCitation, buildCitationText } from "@/components/article-citation";
import { CiteActions } from "@/components/cite-actions";

type Props = {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<{ download?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path } = await params;
  const raw = decodeURIComponent(path.join("/"));
  const nid = normalizeNid(raw);
  try {
    const article = await findArticleByNid(prisma, nid || raw);
    if (!article) {
      return {
        title: "NID not found | Nahda Publications",
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
    const id = normalizeNid(article.doi || nid);
    const kind = identifierLabel(id).toLowerCase();
    return {
      ...meta,
      alternates: {
        ...meta.alternates,
        canonical: absoluteUrl(`/articles/${article.slug}`),
      },
      other: {
        ...(meta.other as Record<string, string | string[]>),
        "DC.identifier": `${kind}:${id}`,
      },
    };
  } catch (err) {
    console.error("[nid-metadata]", err);
    return { title: "NID | Nahda Publications" };
  }
}

/**
 * Hosted Nahda Identifier (NID) record.
 * /nid/nid/ajs.2026.0001 → article / PDF
 */
export default async function NidRecordPage({ params, searchParams }: Props) {
  const { path } = await params;
  const { download } = await searchParams;
  const raw = decodeURIComponent(path.join("/"));
  const nid = normalizeNid(raw);

  let article: Awaited<ReturnType<typeof findArticleByNid>> = null;
  try {
    article = await findArticleByNid(prisma, nid || raw);
  } catch (err) {
    console.error("[nid-page]", err);
  }

  if (!article) {
    return <NidNotFound nid={nid || raw} />;
  }

  if (article.manuscriptUrl) {
    redirect(
      download === "1"
        ? articleDownloadPath(article.slug)
        : articleViewPath(article.slug),
    );
  }

  const published = article.publishedAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const authors = article.authors.map(authorDisplayName).join(", ");
  const downloadHref = article.manuscriptUrl
    ? articleDownloadPath(article.slug)
    : null;
  const nidNorm = normalizeNid(article.doi || nid);
  const label = identifierLabel(nidNorm);
  const citation = buildCitationText({
    authors: article.authors,
    title: article.title,
    journalTitle: article.journal.title,
    publishedAt: article.publishedAt,
    volume: article.volume,
    issue: article.issue,
    pages: article.pages,
    doi: article.doi,
  });

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
        Nahda Identifier (NID)
      </p>
      <h1 className="page-title mt-1">{label} record</h1>
      <p className="mt-2 break-all font-mono text-sm text-[var(--accent)]">
        {nidNorm}
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

      <div className="mt-6">
        <ArticleCitation
          authors={article.authors}
          title={article.title}
          journalTitle={article.journal.title}
          journalSlug={article.journal.slug}
          publishedAt={article.publishedAt}
          volume={article.volume}
          issue={article.issue}
          pages={article.pages}
          doi={article.doi}
        />
        <div className="mt-3">
          <CiteActions
            citation={citation}
            doiHref={nidNorm ? nidPath(nidNorm) : null}
            doiLabel={nidNorm || null}
          />
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
          Search NIDs
        </Link>
      </div>

      <p className="mt-8 text-xs leading-relaxed text-[var(--muted)]">
        This {label} is a free Nahda Identifier hosted by Nahda Publications. It
        is not a Crossref DOI. Resolving{" "}
        <code className="rounded bg-[var(--surface)] px-1.5 py-0.5">
          {nidNorm}
        </code>{" "}
        always lands on this record and the bound paper on our site.
      </p>
    </div>
  );
}

function NidNotFound({ nid }: { nid: string }) {
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
        NID error
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)] sm:text-3xl">
        No article found for this NID
      </h1>
      <p className="mt-3 break-all font-mono text-sm text-[var(--muted)]">
        {nid || "(empty)"}
      </p>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[var(--muted)]">
        Nahda issues free Nahda Identifiers (NIDs) for published papers. This
        identifier is not linked to a live article in our catalogue. Check the
        spelling, or search by title or author.
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
