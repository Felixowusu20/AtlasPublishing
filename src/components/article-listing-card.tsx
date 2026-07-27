import Link from "next/link";
import { ArticleMetrics } from "@/components/article-metrics";

export type ArticleCardData = {
  slug: string;
  title: string;
  authors: string[];
  abstract?: string;
  articleType: string;
  openAccess: boolean;
  doi?: string | null;
  publishedAt: string;
  journalTitle: string;
  journalSlug: string;
  volume?: string;
  issue?: string;
  views?: number;
  downloads?: number;
  keywords?: string[];
  hasPdf?: boolean;
};

type Props = {
  article: ArticleCardData;
  /** Show abstract preview */
  showAbstract?: boolean;
  /** Compact layout for homepage / sidebars */
  compact?: boolean;
};

function typeLabel(articleType: string) {
  return (articleType || "Article").replace(/\s+Article$/i, "").trim() || "Article";
}

/** Shared listing card styled to match the live article masthead. */
export function ArticleListingCard({
  article,
  showAbstract = true,
  compact = false,
}: Props) {
  const doi =
    article.doi && article.doi !== "Pending" ? article.doi : null;
  const href = `/articles/${article.slug}`;

  return (
    <article
      className={`group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[var(--line)] transition hover:-translate-y-0.5 hover:shadow-md hover:ring-[var(--accent)]/25 ${
        compact ? "" : ""
      }`}
    >
      {/* Accent strip — mirrors article page masthead bar */}
      <div className="flex items-stretch bg-[var(--accent)] text-white">
        <Link
          href={`/journals/${article.journalSlug}`}
          className="flex flex-1 items-center truncate px-3.5 py-1.5 text-[10px] font-medium tracking-wide text-white/95 transition hover:bg-black/10 sm:text-[11px]"
        >
          {article.journalTitle}
        </Link>
        <span className="flex shrink-0 items-center bg-[var(--ink)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider">
          {typeLabel(article.articleType)}
        </span>
      </div>

      <div className={compact ? "p-4 sm:p-5" : "p-5 sm:p-6"}>
        <div className="flex flex-wrap items-center gap-2">
          {article.openAccess ? (
            <span className="inline-flex items-center gap-1 rounded bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              <svg
                viewBox="0 0 16 16"
                className="h-2.5 w-2.5"
                fill="currentColor"
                aria-hidden
              >
                <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7H3.5A1.5 1.5 0 0 0 2 8.5v5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 12.5 7H11.5V4.5A3.5 3.5 0 0 0 8 1Zm1.5 6V4.5a1.5 1.5 0 1 0-3 0V7h3Z" />
              </svg>
              Open Access
            </span>
          ) : null}
          {article.volume || article.issue ? (
            <span className="text-[11px] text-[var(--muted)]">
              {article.volume && article.volume !== "—"
                ? `Vol. ${article.volume}`
                : null}
              {article.volume &&
              article.volume !== "—" &&
              article.issue
                ? " · "
                : null}
              {article.issue ? `Issue ${article.issue}` : null}
            </span>
          ) : null}
        </div>

        <Link href={href}>
          <h3
            className={`mt-2.5 font-semibold leading-snug text-[var(--ink)] transition group-hover:text-[var(--accent)] ${
              compact
                ? "text-[15px] sm:text-base"
                : "font-[family-name:var(--font-display)] text-lg sm:text-xl"
            }`}
          >
            {article.title}
          </h3>
        </Link>

        <p className="mt-1.5 text-[13px] text-[var(--muted)]">
          {article.authors.slice(0, 4).join(", ")}
          {article.authors.length > 4 ? " et al." : ""}
        </p>

        {showAbstract && article.abstract ? (
          <p
            className={`mt-3 text-sm leading-relaxed text-[var(--ink)]/75 ${
              compact ? "line-clamp-2" : "line-clamp-3"
            }`}
          >
            {article.abstract}
          </p>
        ) : null}

        {article.keywords && article.keywords.length > 0 ? (
          <p className="mt-2.5 text-[11px] text-[var(--accent)]">
            {article.keywords.slice(0, 5).join(", ")}
            {article.keywords.length > 5 ? "…" : ""}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--muted)]">
            {doi ? (
              <Link
                href={`/doi/${doi}`}
                className="font-semibold text-[var(--accent)] hover:underline"
                title="Open via Atlas DOI"
              >
                DOI {doi}
              </Link>
            ) : (
              <span>DOI pending</span>
            )}
            <span>{article.publishedAt}</span>
            {typeof article.views === "number" &&
            typeof article.downloads === "number" ? (
              <ArticleMetrics
                views={article.views}
                downloads={article.downloads}
              />
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            {article.hasPdf && doi ? (
              <a
                href={`/doi/${doi}?download=1`}
                className="text-xs font-semibold text-[var(--ink)] hover:text-[var(--accent)]"
              >
                PDF
              </a>
            ) : null}
            <Link
              href={href}
              className="inline-flex items-center gap-1 text-xs font-bold text-[var(--accent)]"
            >
              Read more
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
