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
    <article className="group w-full min-w-0 max-w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[var(--line)] transition hover:-translate-y-0.5 hover:shadow-md hover:ring-[var(--accent)]/25">
      {/* Accent strip — mirrors article page masthead bar */}
      <div className="flex min-w-0 items-stretch bg-[var(--accent)] text-white">
        <Link
          href={`/journals/${article.journalSlug}`}
          className="min-w-0 flex-1 truncate px-3 py-2 text-[11px] font-medium leading-snug tracking-wide text-white/95 transition hover:bg-black/10 sm:px-3.5 sm:text-xs"
        >
          {article.journalTitle}
        </Link>
        <span className="flex max-w-[38%] shrink-0 items-center truncate bg-[var(--ink)] px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider sm:max-w-[42%] sm:px-3 sm:text-[11px]">
          {typeLabel(article.articleType)}
        </span>
      </div>

      <div className={`min-w-0 ${compact ? "p-4 sm:p-5" : "p-4 sm:p-6"}`}>
        <div className="flex flex-wrap items-center gap-2">
          {article.openAccess ? (
            <span className="inline-flex items-center gap-1 rounded bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white sm:text-[11px]">
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
            <span className="text-xs text-[var(--muted)]">
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

        <Link href={href} className="block min-w-0">
          <h3
            className={`mt-2.5 break-words text-pretty font-semibold leading-snug text-[var(--ink)] transition group-hover:text-[var(--accent)] ${
              compact
                ? "font-[family-name:var(--font-display)] text-base sm:text-lg"
                : "font-[family-name:var(--font-display)] text-lg sm:text-xl"
            }`}
          >
            {article.title}
          </h3>
        </Link>

        <p className="mt-2 break-words text-[13px] leading-relaxed text-[var(--ink)]/80 sm:text-sm">
          {article.authors.slice(0, 4).join(", ")}
          {article.authors.length > 4 ? " et al." : ""}
        </p>

        {showAbstract && article.abstract ? (
          <p
            className={`mt-3 break-words text-justify text-[15px] leading-relaxed text-[var(--ink)]/90 sm:text-base ${
              compact ? "line-clamp-3" : "line-clamp-4"
            }`}
          >
            {article.abstract}
          </p>
        ) : null}

        {article.keywords && article.keywords.length > 0 ? (
          <p className="mt-3 break-words text-justify text-xs font-medium leading-relaxed text-[var(--accent)] sm:text-[13px]">
            {article.keywords.slice(0, 5).join(", ")}
            {article.keywords.length > 5 ? "…" : ""}
          </p>
        ) : null}

        <div className="mt-4 flex min-w-0 flex-col gap-3 border-t border-[var(--line)] pt-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1.5 text-xs text-[var(--muted)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1 sm:text-[13px]">
            {doi ? (
              <Link
                href={`/doi/${doi}`}
                className="min-w-0 max-w-full break-all font-semibold text-[var(--accent)] hover:underline"
                title="Open via Nahda DOI"
              >
                DOI {doi}
              </Link>
            ) : (
              <span>DOI pending</span>
            )}
            <span className="shrink-0 text-[var(--ink)]/70">{article.publishedAt}</span>
            {typeof article.views === "number" &&
            typeof article.downloads === "number" ? (
              <ArticleMetrics
                views={article.views}
                downloads={article.downloads}
                className="text-[13px]"
              />
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-4">
            {article.hasPdf && doi ? (
              <a
                href={`/doi/${doi}?download=1`}
                className="text-sm font-semibold text-[var(--ink)] hover:text-[var(--accent)]"
              >
                PDF
              </a>
            ) : null}
            <Link
              href={href}
              className="inline-flex items-center gap-1 text-sm font-bold text-[var(--accent)]"
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
