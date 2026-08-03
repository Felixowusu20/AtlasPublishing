"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
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

type JournalOption = {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
};

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialJournal = searchParams.get("journal") ?? "";
  const initialType = searchParams.get("type") ?? "all";

  const [q, setQ] = useState(initialQ);
  const [journal, setJournal] = useState(initialJournal);
  const [type, setType] = useState(initialType);
  const [journalOptions, setJournalOptions] = useState<JournalOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<SearchArticle[]>([]);
  const [journals, setJournals] = useState<SearchJournal[]>([]);

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
    setJournal(searchParams.get("journal") ?? "");
    setType(searchParams.get("type") ?? "all");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/cms/journals")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setJournalOptions(
          ((data.journals ?? []) as JournalOption[]).map((j) => ({
            id: j.id,
            slug: j.slug,
            title: j.title,
            shortTitle: j.shortTitle,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setJournalOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const query = q.trim();
    const journalKey = journal.trim();
    if (!query && !journalKey) {
      setArticles([]);
      setJournals([]);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (journalKey) params.set("journal", journalKey);
      params.set("type", type);
      void fetch(`/api/search?${params.toString()}`)
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
  }, [q, type, journal]);

  function syncUrl(next: {
    q?: string;
    journal?: string;
    type?: string;
  }) {
    const params = new URLSearchParams();
    const nextQ = next.q ?? q;
    const nextJournal = next.journal ?? journal;
    const nextType = next.type ?? type;
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextJournal.trim()) params.set("journal", nextJournal.trim());
    if (nextType && nextType !== "all") params.set("type", nextType);
    const qs = params.toString();
    router.replace(qs ? `/search?${qs}` : "/search");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    syncUrl({ q, journal, type });
  }

  const selectedJournal = journalOptions.find((j) => j.slug === journal);

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
            Find papers by title, author, keyword, or DOI. Use the journal
            dropdown to read only from a specific Nahda title.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[var(--line)]"
        >
          <div className="h-1 bg-[var(--accent)]" />
          <div className="flex flex-col gap-3 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm sm:max-w-[14rem]"
                value={journal}
                onChange={(e) => {
                  const value = e.target.value;
                  setJournal(value);
                  syncUrl({ journal: value });
                }}
                aria-label="Filter by journal"
              >
                <option value="">All journals</option>
                {journalOptions.map((j) => (
                  <option key={j.id} value={j.slug}>
                    {j.shortTitle ? `${j.shortTitle} — ${j.title}` : j.title}
                  </option>
                ))}
              </select>
              <input
                className="flex-1 rounded-lg border border-[var(--line)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
                placeholder="Search title, author, DOI, keyword…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoFocus
              />
              <select
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm sm:max-w-[9rem]"
                value={type}
                onChange={(e) => {
                  const value = e.target.value;
                  setType(value);
                  syncUrl({ type: value });
                }}
              >
                <option value="all">All</option>
                <option value="articles">Articles</option>
                <option value="journals">Journals</option>
              </select>
              <button type="submit" className="btn-primary !px-4 !py-2.5 text-sm">
                Search
              </button>
            </div>
          </div>
          <p className="border-t border-[var(--line)] px-4 py-2.5 text-[11px] text-[var(--muted)] sm:px-5">
            {selectedJournal ? (
              <>
                Showing results in{" "}
                <span className="font-semibold text-[var(--ink)]">
                  {selectedJournal.title}
                </span>
                .{" "}
              </>
            ) : null}
            Tip: paste a DOI like{" "}
            <code className="break-all rounded bg-[var(--surface)] px-1.5 py-0.5 text-[var(--accent)]">
              10.58000/ajs.2026.0142
            </code>{" "}
            — or use the DOI box in the navbar.
          </p>
        </form>

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
                {selectedJournal ? ` · ${selectedJournal.shortTitle}` : ""}
              </h2>
              <ul className="mt-3 w-full min-w-0 space-y-4">
                {articles.map((a) => (
                  <li key={a.id} className="min-w-0">
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

          {(q.trim() || journal.trim()) &&
            !loading &&
            articles.length === 0 &&
            journals.length === 0 && (
              <div className="rounded-2xl bg-white p-6 text-sm text-[var(--muted)] ring-1 ring-[var(--line)]">
                No results
                {q.trim() ? <> for “{q}”</> : null}
                {selectedJournal ? (
                  <> in {selectedJournal.shortTitle || selectedJournal.title}</>
                ) : null}
                . Try another keyword, author name, or clear the journal filter.
              </div>
            )}

          {!q.trim() && !journal.trim() && !loading ? (
            <div className="rounded-2xl bg-[var(--accent-soft)]/60 p-6 ring-1 ring-[var(--line)]">
              <p className="text-sm font-semibold text-[var(--ink)]">
                Start with a journal, DOI, or keyword
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Pick a journal from the dropdown to browse its papers, or search
                across all Nahda titles. DOI lookup is also on the top navbar.
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
