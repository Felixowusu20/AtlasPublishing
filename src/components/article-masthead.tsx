"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArticleMetricsPanel } from "@/components/article-metrics";
import { atlasDoiPath, normalizeDoi } from "@/lib/doi";

export type MastheadRecommendation = {
  slug: string;
  title: string;
  authors: string[];
  journalTitle: string;
};

type Props = {
  journalTitle: string;
  journalSlug: string;
  journalShortTitle?: string;
  logoUrl?: string | null;
  articleType: string;
  openAccess: boolean;
  license: string;
  title: string;
  authors: string[];
  affiliations: string[];
  doi: string;
  volume: string;
  issue: string;
  pages: string;
  publishedAt: string;
  receivedAt: string;
  acceptedAt: string;
  views: number;
  downloads: number;
  citations: number;
  /** PDF download path, or null when unavailable */
  readMoreHref: string | null;
  recommendations?: MastheadRecommendation[];
  /** When true, masthead sits inside a shared article shell (no extra bottom padding clash). */
  embedded?: boolean;
};

function NahdaMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/favicon.png"
      alt=""
      className="h-12 w-12 shrink-0 rounded-xl object-cover"
      aria-hidden
    />
  );
}

function doiLink(doi: string) {
  if (!doi || doi === "Pending") return null;
  return atlasDoiPath(normalizeDoi(doi));
}

function typeBadgeLabel(articleType: string) {
  const label = (articleType || "Article").replace(/\s+Article$/i, "").trim();
  return label.length > 18 ? "Article" : label || "Article";
}

export function ArticleMasthead({
  journalTitle,
  journalSlug,
  journalShortTitle,
  logoUrl,
  articleType,
  openAccess,
  license,
  title,
  authors,
  affiliations,
  doi,
  volume,
  issue,
  pages,
  publishedAt,
  receivedAt,
  acceptedAt,
  views,
  downloads,
  citations,
  readMoreHref,
  recommendations = [],
  embedded = false,
}: Props) {
  const metricsId = useId();
  const recsId = useId();
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [recsOpen, setRecsOpen] = useState(false);
  const metricsRef = useRef<HTMLDivElement>(null);
  const recsRef = useRef<HTMLDivElement>(null);

  const link = doiLink(doi);
  const journalPath = `/journals/${journalSlug}`;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (metricsRef.current && !metricsRef.current.contains(t)) {
        setMetricsOpen(false);
      }
      if (recsRef.current && !recsRef.current.contains(t)) {
        setRecsOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMetricsOpen(false);
        setRecsOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const readMoreTarget = readMoreHref ?? "#article-content";

  return (
    <header className="bg-white">
      {/* Top: Nahda logo + OA / license */}
      <div
        className={`mx-auto flex max-w-6xl items-start justify-between gap-4 pt-6 ${
          embedded ? "px-5 sm:px-8" : "px-4 sm:px-6"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Nahda Publications"
              className="h-12 w-auto max-w-[140px] object-contain"
            />
          ) : (
            <NahdaMark />
          )}
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-display)] text-[1.15rem] leading-tight tracking-tight text-[var(--ink)] sm:text-[1.35rem]">
              <span className="font-bold text-[var(--accent)]">Nahda</span>{" "}
              <span className="font-semibold">
                {journalShortTitle || journalTitle}
              </span>
            </p>
            {journalShortTitle ? (
              <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">
                {journalTitle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 text-right">
          {openAccess ? (
            <span className="inline-flex items-center gap-1.5 rounded bg-amber-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              <svg
                viewBox="0 0 16 16"
                className="h-3 w-3"
                fill="currentColor"
                aria-hidden
              >
                <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7H3.5A1.5 1.5 0 0 0 2 8.5v5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 12.5 7H11.5V4.5A3.5 3.5 0 0 0 8 1Zm1.5 6V4.5a1.5 1.5 0 1 0-3 0V7h3Z" />
              </svg>
              Open Access
            </span>
          ) : (
            <span className="inline-flex rounded bg-[var(--muted)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              Access
            </span>
          )}
          <p className="mt-1.5 max-w-[220px] text-[10px] leading-snug text-[var(--muted)] sm:max-w-none">
            This article is licensed under {license}
          </p>
        </div>
      </div>

      {/* Accent bar — single bar, no extra rules */}
      <div
        className={`mx-auto mt-5 max-w-6xl ${
          embedded ? "px-5 sm:px-8" : "px-4 sm:px-6"
        }`}
      >
        <div className="flex items-stretch bg-[var(--accent)] text-white">
          <Link
            href={journalPath}
            className="flex flex-1 items-center px-3 py-2 text-[11px] font-medium tracking-wide text-white/95 transition hover:bg-black/10 sm:text-xs"
          >
            nahda/{journalSlug}
          </Link>
          <span className="flex items-center bg-[var(--ink)] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white sm:px-4 sm:text-[11px]">
            {typeBadgeLabel(articleType)}
          </span>
        </div>
      </div>

      <div
        className={`mx-auto max-w-6xl pt-6 pb-6 ${
          embedded ? "px-5 sm:px-8" : "px-4 sm:px-6"
        }`}
      >
        <div className="max-w-3xl">
          <h1 className="font-[family-name:var(--font-display)] text-[1.75rem] font-bold leading-[1.2] tracking-tight text-[var(--ink)] sm:text-[2.25rem]">
            {title}
          </h1>

          <p className="mt-4 text-[14px] leading-relaxed text-[var(--ink)] sm:text-[15px]">
            {authors.map((name, i) => (
              <span key={`${name}-${i}`}>
                {i > 0 ? (i === authors.length - 1 ? ", and " : ", ") : ""}
                {name}
                {affiliations[i] || affiliations.length === 1 ? (
                  <sup className="ml-0.5 text-[10px] text-[var(--accent)]">
                    {affiliations.length === 1 ? 1 : i + 1}
                  </sup>
                ) : null}
              </span>
            ))}
          </p>

          {affiliations.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-[12px] leading-snug text-[var(--muted)] sm:text-[13px]">
              {affiliations.map((aff, i) => (
                <li key={`${aff}-${i}`}>
                  <sup className="mr-1 text-[10px] font-semibold text-[var(--accent)]">
                    {i + 1}
                  </sup>
                  {aff}
                </li>
              ))}
            </ul>
          )}

          {/* Cite + Read More */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-sm bg-amber-500 px-3.5 py-2.5 text-white shadow-sm">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold"
                aria-hidden
              >
                ✓
              </span>
              <p className="min-w-0 text-[12px] leading-snug sm:text-[13px]">
                <span className="font-semibold">Cite This: </span>
                {link ? (
                  <a
                    href={link}
                    className="break-all underline decoration-white/60 underline-offset-2 hover:decoration-white"
                  >
                    {normalizeDoi(doi)}
                  </a>
                ) : (
                  <span>DOI pending</span>
                )}
              </p>
            </div>

            <a
              href={readMoreTarget}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-sm bg-[var(--accent)] px-5 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#0c5756]"
              {...(readMoreHref
                ? {}
                : { "aria-label": "Read more — jump to article content" })}
            >
              <GlobeIcon />
              Read More
            </a>
          </div>

          {/* ACCESS nav — no framing double lines */}
          <nav
            aria-label="Article tools"
            className="mt-5 flex flex-wrap items-center gap-x-0 gap-y-2 text-[12px] text-[var(--ink)] sm:text-[13px]"
          >
            <span className="mr-3 text-[15px] font-bold uppercase tracking-[0.08em] text-[var(--accent)]/70 sm:text-base">
              Access
            </span>

            <div className="relative" ref={metricsRef}>
              <button
                type="button"
                aria-expanded={metricsOpen}
                aria-controls={metricsId}
                onClick={() => {
                  setMetricsOpen((v) => !v);
                  setRecsOpen(false);
                }}
                className="inline-flex items-center gap-1.5 px-2 py-1.5 font-medium transition hover:text-[var(--accent)]"
              >
                <MetricsIcon />
                Metrics &amp; More
              </button>
              {metricsOpen ? (
                <div
                  id={metricsId}
                  role="region"
                  aria-label="Article metrics"
                  className="absolute left-0 z-20 mt-1 w-64 rounded-lg border border-[var(--line)] bg-white p-4 shadow-lg"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Article metrics
                  </p>
                  <ArticleMetricsPanel
                    className="mt-3"
                    views={views}
                    downloads={downloads}
                    citations={citations}
                  />
                  <p className="mt-3 text-[10px] leading-snug text-[var(--muted)]">
                    Views update on each visit. Downloads count PDF retrievals.
                  </p>
                </div>
              ) : null}
            </div>

            <span className="mx-1 hidden h-4 w-px bg-[var(--line)] sm:inline-block" />

            <div className="relative" ref={recsRef}>
              <button
                type="button"
                aria-expanded={recsOpen}
                aria-controls={recsId}
                onClick={() => {
                  setRecsOpen((v) => !v);
                  setMetricsOpen(false);
                }}
                className="inline-flex items-center gap-1.5 px-2 py-1.5 font-medium transition hover:text-[var(--accent)]"
              >
                <RecsIcon />
                Article Recommendations
              </button>
              {recsOpen ? (
                <div
                  id={recsId}
                  role="region"
                  aria-label="Recommended articles"
                  className="absolute left-0 z-20 mt-1 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-[var(--line)] bg-white p-4 shadow-lg sm:w-96"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    From this journal
                  </p>
                  {recommendations.length > 0 ? (
                    <ul className="mt-3 space-y-3">
                      {recommendations.map((rec) => (
                        <li key={rec.slug}>
                          <Link
                            href={`/articles/${rec.slug}`}
                            className="block text-[13px] font-semibold leading-snug text-[var(--ink)] hover:text-[var(--accent)]"
                            onClick={() => setRecsOpen(false)}
                          >
                            {rec.title}
                          </Link>
                          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                            {rec.authors.slice(0, 2).join(", ")}
                            {rec.authors.length > 2 ? " et al." : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-[12px] text-[var(--muted)]">
                      No other articles from this journal yet.{" "}
                      <Link
                        href={journalPath}
                        className="font-medium text-[var(--accent)] hover:underline"
                      >
                        Browse the journal
                      </Link>
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            <span className="mx-1 hidden h-4 w-px bg-[var(--line)] sm:inline-block" />

            <a
              href="#article-content"
              className="inline-flex items-center gap-1.5 px-2 py-1.5 font-medium transition hover:text-[var(--accent)]"
            >
              <SiIcon />
              Supporting Information
            </a>
          </nav>

          <p className="mt-4 text-[12px] text-[var(--muted)]">
            Received {receivedAt}
            {" · "}Accepted {acceptedAt}
            {" · "}Published {publishedAt}
            {" · "}Vol. {volume} · Issue {issue}
            {pages && pages !== "—" ? ` · pp. ${pages}` : ""}
          </p>
        </div>
      </div>
    </header>
  );
}

function GlobeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function MetricsIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="currentColor"
      aria-hidden
    >
      <path d="M1 13h2V7H1v6Zm4 0h2V3H5v10Zm4 0h2V9H9v4Zm4 0h2V5h-2v8Z" />
    </svg>
  );
}

function RecsIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="currentColor"
      aria-hidden
    >
      <path d="M2 1.5A1.5 1.5 0 0 1 3.5 0h7A1.5 1.5 0 0 1 12 1.5V14l-3.5-2L5 14V1.5ZM3.5 1a.5.5 0 0 0-.5.5v10.8l2.5-1.4 2.5 1.4V1.5a.5.5 0 0 0-.5-.5h-4Z" />
      <path d="M13 3h1.5A1.5 1.5 0 0 1 16 4.5v10l-2.5-1.4L11 14.5V4.5c0-.4.16-.76.42-1.02.2-.1.4-.2.58-.2V3Z" />
    </svg>
  );
}

function SiIcon() {
  return (
    <span
      className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--ink)] text-[7px] font-bold text-white"
      aria-hidden
    >
      SI
    </span>
  );
}
