"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArticleListingCard } from "@/components/article-listing-card";
import {
  SearchSuggestionList,
  suggestionKeydown,
} from "@/components/search-suggest";
import { publishingWorkflow } from "@/data/mock";
import { journalCardColor } from "@/lib/journal-colors";
import {
  applySuggestion,
  matchesQuery,
  suggestMatches,
  wordsFromText,
  type SearchSuggestion,
} from "@/lib/page-search";

export type HomeArticle = {
  id: string;
  slug: string;
  title: string;
  authors: string[];
  abstract: string;
  articleType: string;
  openAccess: boolean;
  doi: string | null;
  publishedAt: string;
  journalTitle: string;
  journalSlug: string;
  volume?: string;
  issue?: string;
  views: number;
  downloads: number;
  keywords: string[];
  hasPdf: boolean;
};

export type HomeAnnouncement = {
  id: string;
  title: string;
  summary: string;
  href: string | null;
  publishedAt: string;
};

export type HomeJournal = {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  openAccess: boolean;
  doiPrefix: string | null;
  coverImageUrl: string | null;
  coverColor: string;
  description: string;
  subjects: string[];
};

type RemoteArticle = HomeArticle;
type RemoteJournal = {
  id: string;
  slug: string;
  title: string;
  shortTitle?: string;
  subjects: string[];
};

type Props = {
  articles: HomeArticle[];
  announcements: HomeAnnouncement[];
  journals: HomeJournal[];
  initialQuery?: string;
};

function articleHaystack(article: HomeArticle) {
  return [
    article.title,
    article.authors.join(" "),
    article.abstract,
    article.doi,
    article.keywords.join(" "),
    article.journalTitle,
    article.articleType,
  ].join(" ");
}

function announcementHaystack(item: HomeAnnouncement) {
  return `${item.title} ${item.summary}`;
}

function journalHaystack(journal: HomeJournal) {
  return [
    journal.title,
    journal.shortTitle,
    journal.doiPrefix,
    journal.description,
    journal.subjects.join(" "),
    journal.openAccess ? "Open Access" : "Subscription",
  ].join(" ");
}

function workflowHaystack(item: (typeof publishingWorkflow)[number]) {
  return `${item.step} ${item.title} ${item.detail} publishing pathway`;
}

function SearchParamsSync({ onQuery }: { onQuery: (value: string) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    onQuery(searchParams.get("q") ?? "");
  }, [onQuery, searchParams]);
  return null;
}

function HomeCatalogInner({
  articles,
  announcements,
  journals,
  initialQuery = "",
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [remoteArticles, setRemoteArticles] = useState<RemoteArticle[]>([]);
  const [remoteJournals, setRemoteJournals] = useState<RemoteJournal[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const pagePhrases = useMemo(() => {
    const phrases = [
      ...articles.map((article) => article.title),
      ...articles.flatMap((article) => article.authors),
      ...articles.flatMap((article) => article.keywords),
      ...journals.map((journal) => journal.title),
      ...journals.map((journal) => journal.shortTitle),
      ...announcements.map((item) => item.title),
      ...publishingWorkflow.map((item) => item.title),
      "Published articles",
      "Active journals",
      "Article views",
      "PDF downloads",
      "How publishing works on Nahda",
      "Latest articles",
      "Announcements",
      "Our journals",
      "Ready to submit?",
    ];
    return [...new Set(phrases.filter(Boolean))];
  }, [articles, announcements, journals]);

  const pageWords = useMemo(() => {
    const text = [
      ...articles.map(articleHaystack),
      ...announcements.map(announcementHaystack),
      ...journals.map(journalHaystack),
      ...publishingWorkflow.map(workflowHaystack),
      "Discover research Search by title author or DOI",
      "Recently published Latest articles",
      "News Announcements Portfolio Our journals",
      "For authors Ready to submit Register Start submission",
    ].join(" ");
    return wordsFromText(text);
  }, [articles, announcements, journals]);

  const suggestions = useMemo(
    () => suggestMatches(q, pageWords, pagePhrases),
    [q, pageWords, pagePhrases],
  );

  const needle = q.trim();

  const localArticles = useMemo(
    () =>
      needle
        ? articles.filter((article) => matchesQuery(articleHaystack(article), needle))
        : articles,
    [articles, needle],
  );

  const matchedAnnouncements = useMemo(
    () =>
      needle
        ? announcements.filter((item) =>
            matchesQuery(announcementHaystack(item), needle),
          )
        : announcements,
    [announcements, needle],
  );

  const localJournals = useMemo(
    () =>
      needle
        ? journals.filter((journal) => matchesQuery(journalHaystack(journal), needle))
        : journals,
    [journals, needle],
  );

  const matchedWorkflow = useMemo(
    () =>
      needle
        ? publishingWorkflow.filter((item) =>
            matchesQuery(workflowHaystack(item), needle),
          )
        : publishingWorkflow,
    [needle],
  );

  const ctaMatches =
    !needle ||
    matchesQuery(
      "For authors Ready to submit Create an account choose a journal track manuscript peer review DOI assignment publication Register Start submission",
      needle,
    );

  useEffect(() => {
    if (!needle) {
      setRemoteArticles([]);
      setRemoteJournals([]);
      return;
    }

    const handle = window.setTimeout(() => {
      const params = new URLSearchParams({ q: needle, type: "all" });
      void fetch(`/api/search?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          setRemoteArticles((data.articles ?? []) as RemoteArticle[]);
          setRemoteJournals((data.journals ?? []) as RemoteJournal[]);
        })
        .catch(() => {
          setRemoteArticles([]);
          setRemoteJournals([]);
        });
    }, 180);

    return () => window.clearTimeout(handle);
  }, [needle]);

  const displayedArticles = needle
    ? mergeArticles(localArticles, remoteArticles)
    : articles;

  const displayedJournals = needle
    ? mergeJournals(localJournals, remoteJournals, journals)
    : journals;

  const showWorkflow = !needle || matchedWorkflow.length > 0;

  function syncQuery(next: string, replace: boolean) {
    const trimmed = next.trim();
    const href = trimmed ? `/?q=${encodeURIComponent(trimmed)}` : "/";
    if (replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }

  function onQueryChange(value: string) {
    setQ(value);
    setOpen(true);
    setActiveIndex(-1);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => syncQuery(value, true), 180);
  }

  function pickSuggestion(item: SearchSuggestion) {
    const next = applySuggestion(q, item);
    setQ(next);
    setOpen(false);
    setActiveIndex(-1);
    if (timer.current) window.clearTimeout(timer.current);
    syncQuery(next, true);
  }

  function runSearch(event?: FormEvent) {
    event?.preventDefault();
    if (timer.current) window.clearTimeout(timer.current);
    setOpen(false);
    syncQuery(q, true);
    requestAnimationFrame(() => {
      document
        .getElementById("home-results")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsSync onQuery={setQ} />
      </Suspense>
      <section className="border-b border-[var(--line)] bg-[linear-gradient(180deg,var(--accent-soft)_0%,white_100%)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="max-w-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              Discover research
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)] sm:text-2xl">
              Search this page by title, author, or DOI
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
              Matching words appear as you type — only if they are on this page
              or in the catalog. Paste an Nahda DOI such as{" "}
              <code className="inline-block max-w-full break-all rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-[var(--accent)] ring-1 ring-[var(--line)]">
                10.58000/ajs.2026.0142
              </code>
              .
            </p>
          </div>
          <form
            onSubmit={runSearch}
            className="relative w-full max-w-md"
            role="search"
          >
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <input
                  name="q"
                  type="search"
                  value={q}
                  onChange={(event) => onQueryChange(event.target.value)}
                  onFocus={() => setOpen(true)}
                  onBlur={() => window.setTimeout(() => setOpen(false), 120)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setOpen(false);
                      setActiveIndex(-1);
                      return;
                    }
                    suggestionKeydown(
                      event,
                      suggestions,
                      activeIndex,
                      setActiveIndex,
                      pickSuggestion,
                    );
                  }}
                  placeholder="Type a word on this page…"
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-controls="home-search-suggest"
                  aria-expanded={open && suggestions.length > 0}
                  className="min-w-0 w-full rounded-lg border border-[var(--line)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
                />
                {open ? (
                  <SearchSuggestionList
                    id="home-search-suggest"
                    items={suggestions}
                    activeIndex={activeIndex}
                    onPick={pickSuggestion}
                    onHover={setActiveIndex}
                  />
                ) : null}
              </div>
              <button type="submit" className="btn-primary shrink-0 text-sm">
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      <div id="home-results" className="scroll-mt-28" />

      {showWorkflow ? (
        <section className="border-b border-[var(--line)] bg-[var(--surface)]/50">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                Publishing pathway
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)] sm:text-2xl">
                How publishing works on Nahda
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                A clear path from manuscript upload to open publication.
              </p>
            </div>

            <ol className="relative mt-10 space-y-0 sm:grid sm:grid-cols-5 sm:gap-3 sm:space-y-0">
              <div
                className="pointer-events-none absolute left-[10%] right-[10%] top-5 hidden h-px bg-[var(--line)] sm:block"
                aria-hidden
              />

              {(needle ? matchedWorkflow : publishingWorkflow).map(
                (item, index, list) => {
                  const isLast = index === list.length - 1;
                  return (
                    <li
                      key={item.step}
                      className="relative flex gap-4 sm:flex-col sm:items-center sm:gap-0 sm:text-center"
                    >
                      <div className="relative flex w-10 shrink-0 flex-col items-center sm:contents">
                        <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-white text-sm font-semibold text-[var(--accent)] shadow-[0_0_0_6px_var(--paper)] sm:shadow-[0_0_0_6px_var(--surface)]">
                          {item.step}
                        </div>
                        {!isLast && (
                          <div
                            className="mt-1 w-0.5 flex-1 min-h-[1.25rem] rounded-full bg-gradient-to-b from-[var(--accent)]/55 via-[var(--line)] to-[var(--line)] sm:hidden"
                            aria-hidden
                          />
                        )}
                      </div>

                      <div
                        className={`min-w-0 flex-1 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[var(--line)] sm:mt-4 sm:w-full ${
                          isLast ? "mb-0" : "mb-5 sm:mb-0"
                        }`}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                          Step {item.step}
                        </p>
                        <p className="mt-1.5 text-sm font-semibold text-[var(--ink)]">
                          {item.title}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                          {item.detail}
                        </p>
                      </div>
                    </li>
                  );
                },
              )}
            </ol>
          </div>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid min-w-0 gap-10 lg:grid-cols-[1.55fr_1fr]">
          <div className="min-w-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                  Recently published
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)] sm:text-2xl">
                  Latest articles
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Same layout you see on the full article page — type, DOI, and
                  metrics.
                </p>
              </div>
              <Link
                href="/articles"
                className="shrink-0 text-sm font-semibold text-[var(--accent)] hover:underline"
              >
                View all →
              </Link>
            </div>

            <div className="mt-6 w-full min-w-0 space-y-4">
              {displayedArticles.length === 0 && (
                <p className="rounded-2xl bg-white p-6 text-sm text-[var(--muted)] ring-1 ring-[var(--line)]">
                  {needle
                    ? "No matching articles on this page."
                    : "No published articles yet. Publish from the admin queue to see them here."}
                </p>
              )}
              {displayedArticles.map((article) => (
                <ArticleListingCard
                  key={article.id || article.slug}
                  compact
                  article={{
                    slug: article.slug,
                    title: article.title,
                    authors: article.authors,
                    abstract: article.abstract,
                    articleType: article.articleType,
                    openAccess: article.openAccess,
                    doi: article.doi,
                    publishedAt: article.publishedAt,
                    journalTitle: article.journalTitle,
                    journalSlug: article.journalSlug,
                    volume: article.volume,
                    issue: article.issue,
                    views: article.views,
                    downloads: article.downloads,
                    keywords: article.keywords,
                    hasPdf: article.hasPdf,
                  }}
                />
              ))}
            </div>
          </div>

          <aside className="min-w-0 space-y-8">
            {(!needle || matchedAnnouncements.length > 0) && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                  News
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                  Announcements
                </h2>
                <ul className="mt-4 space-y-3">
                  {matchedAnnouncements.length === 0 && (
                    <li className="rounded-2xl bg-white p-4 text-sm text-[var(--muted)] ring-1 ring-[var(--line)]">
                      No announcements yet.
                    </li>
                  )}
                  {matchedAnnouncements.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[var(--line)]"
                    >
                      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
                        {item.publishedAt}
                      </p>
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="mt-1 block text-sm font-semibold text-[var(--ink)] hover:text-[var(--accent)]"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                          {item.title}
                        </p>
                      )}
                      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                        {item.summary}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(!needle || displayedJournals.length > 0) && (
              <div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                      Portfolio
                    </p>
                    <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                      Our journals
                    </h2>
                  </div>
                  <Link
                    href="/journals"
                    className="text-sm font-semibold text-[var(--accent)] hover:underline"
                  >
                    All →
                  </Link>
                </div>
                <div className="mt-4 space-y-2">
                  {displayedJournals.length === 0 && (
                    <p className="rounded-2xl bg-white p-4 text-sm text-[var(--muted)] ring-1 ring-[var(--line)]">
                      Add journals in the admin CMS.
                    </p>
                  )}
                  {displayedJournals.map((journal, index) => (
                    <Link
                      key={journal.id}
                      href={`/journals/${journal.slug}`}
                      className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[var(--line)] transition hover:ring-[var(--accent)]/30"
                    >
                      <span
                        className="relative flex h-12 w-9 shrink-0 items-end justify-center overflow-hidden rounded-md text-[9px] font-bold text-white"
                        style={
                          journal.coverImageUrl
                            ? { background: "#fff" }
                            : {
                                background: journalCardColor(
                                  journal.coverColor,
                                  index,
                                ),
                              }
                        }
                      >
                        {journal.coverImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={journal.coverImageUrl}
                            alt=""
                            className="h-full w-full object-contain p-0.5"
                          />
                        ) : (
                          <span className="pb-1.5">{journal.shortTitle}</span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-[var(--ink)]">
                          {journal.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-[var(--muted)]">
                          {journal.openAccess ? "Open Access" : "Subscription"}
                          {journal.doiPrefix ? ` · ${journal.doiPrefix}` : ""}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>

      {ctaMatches ? (
        <section className="border-t border-[var(--line)] bg-[var(--ink)] text-white">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 px-4 py-12 sm:flex-row sm:items-center sm:px-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                For authors
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl sm:text-2xl">
                Ready to submit?
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/70">
                Create an account, choose a journal, and track your manuscript from
                peer review through DOI assignment and publication.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-lg border border-white/25 bg-transparent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Register
              </Link>
              <Link
                href="/submissions/new"
                className="inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c5756]"
              >
                Start submission
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

function mergeArticles(local: HomeArticle[], remote: RemoteArticle[]) {
  const bySlug = new Map<string, HomeArticle>();
  for (const article of [...local, ...remote]) {
    if (!bySlug.has(article.slug)) bySlug.set(article.slug, article);
  }
  return [...bySlug.values()];
}

function mergeJournals(
  local: HomeJournal[],
  remote: RemoteJournal[],
  source: HomeJournal[],
) {
  const bySlug = new Map<string, HomeJournal>();
  for (const journal of local) bySlug.set(journal.slug, journal);
  for (const journal of remote) {
    if (bySlug.has(journal.slug)) continue;
    const existing = source.find((item) => item.slug === journal.slug);
    bySlug.set(
      journal.slug,
      existing ?? {
        id: journal.id,
        slug: journal.slug,
        title: journal.title,
        shortTitle: journal.shortTitle ?? "",
        openAccess: true,
        doiPrefix: null,
        coverImageUrl: null,
        coverColor: "",
        description: "",
        subjects: journal.subjects,
      },
    );
  }
  return [...bySlug.values()];
}

export function HomeCatalog(props: Props) {
  return <HomeCatalogInner {...props} />;
}
