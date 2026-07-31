"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArticleListingCard } from "@/components/article-listing-card";

type SearchArticle = {
  id: string;
  slug: string;
  title: string;
  authors: string[];
  doi: string | null;
  keywords: string[];
  journalTitle: string;
  journalSlug: string;
  publishedAt: string;
  hasPdf: boolean;
  abstract?: string;
  articleType?: string;
  openAccess?: boolean;
  volume?: string;
  issue?: string;
  views?: number;
  downloads?: number;
};

type SearchJournal = {
  id: string;
  slug: string;
  title: string;
  subjects: string[];
};

function SearchPageInner() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [type, setType] = useState("all");
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<SearchArticle[]>([]);
  const [journals, setJournals] = useState<SearchJournal[]>([]);

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setArticles([]);
      setJournals([]);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      void fetch(
        `/api/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`,
      )
        .then((res) => res.json())
        .then((data) => {
          setArticles(data.articles ?? []);
          setJournals(data.journals ?? []);
        })
        .catch(() => {
          setArticles([]);
          setJournals([]);
        })
        .finally(() => setLoading(false));
    }, 250);

    return () => window.clearTimeout(timer);
  }, [q, type]);

  return (
    <div className="relative min-h-screen">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,_rgba(15,107,106,0.07),_transparent_60%)]"
        aria-hidden
      />

      <div className="relative page-wrap">
        <div className="max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            Discover
          </p>
          <h1 className="page-title mt-1">Search</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Find articles by title, author, keyword, or Nahda DOI. Results open
            the same professional article page used across the site.
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[var(--line)]">
          <div className="h-1 bg-[var(--accent)]" />
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:p-5">
            <input
              className="flex-1 rounded-lg border border-[var(--line)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
              placeholder="Search title, author, DOI, keyword…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
            <select
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="all">All</option>
              <option value="articles">Articles</option>
              <option value="journals">Journals</option>
            </select>
          </div>
          <p className="border-t border-[var(--line)] px-4 py-2.5 text-[11px] text-[var(--muted)] sm:px-5">
            Tip: paste a DOI like{" "}
            <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-[var(--accent)]">
              10.58000/ajs.2026.0142
            </code>{" "}
            to jump straight to the paper.
          </p>
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-[var(--muted)]">Searching…</p>
        ) : null}

        <div className="mt-8 space-y-8">
          {journals.length > 0 && (
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Journals ({journals.length})
              </h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {journals.map((j) => (
                  <li key={j.id}>
                    <Link
                      href={`/journals/${j.slug}`}
                      className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[var(--line)] transition hover:ring-[var(--accent)]/30"
                    >
                      <p className="font-semibold text-[var(--ink)] hover:text-[var(--accent)]">
                        {j.title}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {j.subjects.join(", ")}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {articles.length > 0 && (
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Articles ({articles.length})
              </h2>
              <ul className="mt-3 space-y-4">
                {articles.map((a) => (
                  <li key={a.id}>
                    <ArticleListingCard
                      article={{
                        slug: a.slug,
                        title: a.title,
                        authors: a.authors,
                        abstract: a.abstract,
                        articleType: a.articleType || "Article",
                        openAccess: a.openAccess ?? true,
                        doi: a.doi,
                        publishedAt: a.publishedAt,
                        journalTitle: a.journalTitle,
                        journalSlug: a.journalSlug,
                        volume: a.volume,
                        issue: a.issue,
                        views: a.views,
                        downloads: a.downloads,
                        keywords: a.keywords,
                        hasPdf: a.hasPdf,
                      }}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {q.trim() &&
            !loading &&
            articles.length === 0 &&
            journals.length === 0 && (
              <div className="rounded-2xl bg-white p-6 text-sm text-[var(--muted)] ring-1 ring-[var(--line)]">
                No results for “{q}”. Try a DOI, title fragment, or author name.
              </div>
            )}

          {!q.trim() && !loading ? (
            <div className="rounded-2xl bg-[var(--accent-soft)]/60 p-6 ring-1 ring-[var(--line)]">
              <p className="text-sm font-semibold text-[var(--ink)]">
                Start with a DOI or keyword
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Search results use the same article cards as the homepage and
                article list — open access badge, journal bar, and DOI download.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="page-wrap">
          <h1 className="page-title">Search</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Loading search…</p>
        </div>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}
