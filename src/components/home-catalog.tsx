"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AOS from "aos";
import { ArticleListingCard } from "@/components/article-listing-card";
import { JournalImageCard } from "@/components/journal-image-card";
import { useAosReady } from "@/components/aos-provider";
import { publishingWorkflow } from "@/data/mock";
import { matchesQuery } from "@/lib/page-search";
import {
  DEFAULT_GOAL_TABS,
  DEFAULT_GOALS_SECTION,
  type GoalTabContent,
  type HomeSectionContent,
} from "@/lib/home-cms-defaults";

export type HomeGoalTabCard = GoalTabContent & { id?: string };

export type HomeGoalsSection = Pick<
  HomeSectionContent,
  "eyebrow" | "title" | "body"
>;

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
  imageUrl?: string | null;
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
  /** IDs already shown in the top “Just published” strip */
  excludeArticleIds?: string[];
  goalTabs?: HomeGoalTabCard[];
  goalsSection?: HomeGoalsSection | null;
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
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  useEffect(() => {
    onQuery(q);
  }, [q, onQuery]);
  return null;
}

function HomeCatalogInner({
  articles,
  announcements,
  journals,
  initialQuery = "",
  excludeArticleIds = [],
  goalTabs: goalTabsProp,
  goalsSection,
}: Props) {
  const goalTabs =
    goalTabsProp && goalTabsProp.length > 0
      ? goalTabsProp
      : DEFAULT_GOAL_TABS;
  const goalsHeading = goalsSection ?? DEFAULT_GOALS_SECTION;
  const aosReady = useAosReady();
  const [q, setQ] = useState(initialQuery);
  const [remoteArticles, setRemoteArticles] = useState<RemoteArticle[]>([]);
  const [remoteJournals, setRemoteJournals] = useState<RemoteJournal[]>([]);
  const [activeGoal, setActiveGoal] = useState(goalTabs[0]?.key ?? "publish");

  useEffect(() => {
    if (!goalTabs.some((tab) => tab.key === activeGoal)) {
      setActiveGoal(goalTabs[0]?.key ?? "publish");
    }
  }, [goalTabs, activeGoal]);

  useEffect(() => {
    if (!aosReady) return;
    const id = window.setTimeout(() => AOS.refresh(), 60);
    return () => window.clearTimeout(id);
  }, [activeGoal, aosReady]);

  const needle = q.trim();
  const activeTab =
    goalTabs.find((tab) => tab.key === activeGoal) ?? goalTabs[0];

  const localArticles = useMemo(
    () =>
      needle
        ? articles.filter((article) =>
            matchesQuery(articleHaystack(article), needle),
          )
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
        ? journals.filter((journal) =>
            matchesQuery(journalHaystack(journal), needle),
          )
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
      "For authors Ready to submit Create an account choose a journal track manuscript peer review DOI assignment publication Register Start submission Be part of what comes next",
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

  const displayedArticles = (() => {
    const merged = needle
      ? mergeArticles(localArticles, remoteArticles)
      : articles;
    if (needle || excludeArticleIds.length === 0) return merged;
    const skip = new Set(excludeArticleIds);
    return merged.filter((a) => !skip.has(a.id));
  })();

  const displayedJournals = needle
    ? mergeJournals(localJournals, remoteJournals, journals)
    : journals;

  const showWorkflow = !needle || matchedWorkflow.length > 0;
  const showGoals = !needle;

  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsSync onQuery={setQ} />
      </Suspense>

      <div id="home-results" className="scroll-mt-28" />

      {/* ACS-style: Find the right resources for your goals */}
      {showGoals ? (
        <section
          className="border-b border-[var(--line)] bg-white"
          data-aos="fade-up"
          data-aos-duration="800"
        >
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="max-w-3xl" data-aos="fade-up" data-aos-delay="40">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                {goalsHeading.eyebrow}
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--ink)] sm:text-4xl">
                {goalsHeading.title}
              </h2>
              {goalsHeading.body ? (
                <p className="mt-3 text-base leading-relaxed text-[var(--muted)] sm:text-lg">
                  {goalsHeading.body}
                </p>
              ) : null}
            </div>

            <div
              className="mt-8 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden"
              role="tablist"
              aria-label="Author and reader goals"
              data-aos="fade-up"
              data-aos-delay="120"
            >
              {goalTabs.map((tab, index) => {
                const selected = tab.key === activeGoal;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveGoal(tab.key)}
                    className={`group relative aspect-[3/4] w-[min(42vw,9.5rem)] shrink-0 overflow-hidden rounded-2xl text-left transition sm:w-[11rem] sm:rounded-3xl ${
                      selected
                        ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-white shadow-md"
                        : "ring-1 ring-[var(--line)] hover:ring-[var(--accent)]/40"
                    }`}
                    data-aos="fade-up"
                    data-aos-delay={String(100 + index * 60)}
                  >
                    <Image
                      src={tab.imageUrl}
                      alt=""
                      fill
                      className="object-cover transition duration-700 group-hover:scale-[1.05]"
                      sizes="180px"
                      unoptimized
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-[var(--ink)]/45 to-transparent"
                      aria-hidden
                    />
                    <span className="absolute inset-x-0 bottom-0 p-3 sm:p-3.5">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200/90 sm:text-[11px]">
                        {tab.story ?? ""}
                      </span>
                      <span className="mt-1 block font-[family-name:var(--font-display)] text-sm font-semibold leading-snug text-white sm:text-base">
                        {tab.label}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              role="tabpanel"
              key={activeTab.key}
              className="mt-6 grid gap-0 overflow-hidden rounded-2xl bg-[var(--surface)]/80 sm:mt-8 sm:rounded-3xl lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch"
              data-aos="fade-up"
              data-aos-delay="80"
            >
              <div
                className="flex flex-col justify-center p-5 sm:p-8 lg:p-10"
                data-aos="fade-right"
                data-aos-delay="120"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                  {activeTab.story ?? ""}
                </p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl text-[var(--ink)] sm:text-2xl">
                  {activeTab.title}
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
                  {activeTab.body}
                </p>
                <ul className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
                  {activeTab.links.map((link, i) => (
                    <li
                      key={link.href}
                      data-aos="zoom-in"
                      data-aos-delay={String(160 + i * 70)}
                    >
                      <Link
                        href={link.href}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[var(--accent)] ring-1 ring-[var(--line)] transition hover:ring-[var(--accent)]/40"
                      >
                        {link.label}
                        <span aria-hidden>→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className="relative min-h-[200px] overflow-hidden sm:min-h-[300px] lg:min-h-full"
                data-aos="fade-left"
                data-aos-delay="180"
                data-aos-duration="900"
              >
                <Image
                  key={activeTab.imageUrl}
                  src={activeTab.imageUrl}
                  alt={activeTab.imageAlt || activeTab.label}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  unoptimized
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/80 via-[var(--ink)]/20 to-transparent"
                  aria-hidden
                />
                <p className="absolute inset-x-0 bottom-0 p-4 text-sm font-medium leading-snug text-white sm:p-6 sm:text-base">
                  {activeTab.imageCaption ?? ""}
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ACS-style: The latest — news + articles */}
      <section
        className="border-b border-[var(--line)] bg-[var(--surface)]/40"
        data-aos="fade-up"
        data-aos-duration="800"
      >
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <div
            className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
            data-aos="fade-up"
            data-aos-delay="40"
          >
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                The latest from Nahda
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--ink)] sm:text-4xl">
                News, issues, and new research
              </h2>
              <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
                Announcements from the editorial office and the newest open
                articles across our journals.
              </p>
            </div>
            <Link
              href="/articles"
              className="shrink-0 text-sm font-semibold text-[var(--accent)] hover:underline"
            >
              View all articles →
            </Link>
          </div>

          {(!needle || matchedAnnouncements.length > 0) && (
            <div className="mt-10">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Announcements
              </h3>
              <div className="mt-4 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {matchedAnnouncements.length === 0 ? (
                  <p className="rounded-2xl bg-white px-5 py-6 text-sm text-[var(--muted)] ring-1 ring-[var(--line)]">
                    No announcements yet.
                  </p>
                ) : (
                  matchedAnnouncements.map((item, index) => {
                    const card = (
                      <>
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex aspect-[16/10] items-end bg-gradient-to-br from-[var(--accent)] to-[var(--ink)] p-4">
                            <p className="font-[family-name:var(--font-display)] text-lg text-white">
                              Nahda News
                            </p>
                          </div>
                        )}
                        <div className="flex flex-1 flex-col p-4">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
                            {item.publishedAt}
                          </p>
                          <p className="mt-1.5 font-[family-name:var(--font-display)] text-base font-semibold leading-snug text-[var(--ink)] group-hover:text-[var(--accent)]">
                            {item.title}
                          </p>
                          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--muted)]">
                            {item.summary}
                          </p>
                        </div>
                      </>
                    );
                    const className =
                      "group flex w-[min(78vw,300px)] shrink-0 flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[var(--line)] transition hover:-translate-y-0.5 hover:shadow-md";
                    const aos = {
                      "data-aos": "fade-up",
                      "data-aos-delay": String(Math.min(index * 90, 360)),
                      "data-aos-duration": "750",
                    } as const;
                    return item.href ? (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={className}
                        {...aos}
                      >
                        {card}
                      </Link>
                    ) : (
                      <article key={item.id} className={className} {...aos}>
                        {card}
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="mt-12">
            <div className="flex items-end justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                More published work
              </h3>
            </div>
            <div className="mt-4 w-full min-w-0 space-y-4">
              {displayedArticles.length === 0 ? (
                <p className="rounded-2xl bg-white p-6 text-base text-[var(--muted)] ring-1 ring-[var(--line)]">
                  {needle
                    ? "No matching articles on this page."
                    : articles.length > 0
                      ? "The newest papers are featured above. Browse the full catalog for more."
                      : "No published articles yet. Publish from the admin console to see them here."}
                  {!needle && articles.length > 0 ? (
                    <>
                      {" "}
                      <Link
                        href="/articles"
                        className="font-semibold text-[var(--accent)] hover:underline"
                      >
                        View all articles →
                      </Link>
                    </>
                  ) : null}
                </p>
              ) : (
                displayedArticles.map((article, index) => (
                  <ArticleListingCard
                    key={article.id || article.slug}
                    compact
                    aosDelay={Math.min(index * 80, 320)}
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
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Publishing pathway */}
      {showWorkflow ? (
        <section
          className="border-b border-[var(--line)] bg-[var(--surface)]/50"
          data-aos="fade-up"
          data-aos-duration="800"
        >
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-16">
            <div className="max-w-2xl" data-aos="fade-up" data-aos-delay="40">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)] sm:text-xs">
                Publishing pathway
              </p>
              <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--ink)] sm:mt-2 sm:text-4xl">
                How publishing works on Nahda
              </h2>
              <p className="mt-2 text-base leading-relaxed text-[var(--muted)] sm:mt-3 sm:text-lg">
                A clear path from manuscript upload to open publication.
              </p>
            </div>

            <ol className="relative mt-8 grid gap-4 sm:mt-12 lg:grid-cols-5 lg:gap-4">
              <div
                className="pointer-events-none absolute left-[10%] right-[10%] top-6 hidden h-0.5 bg-[var(--accent)]/25 lg:block"
                aria-hidden
              />
              {/* Mobile vertical connector */}
              <div
                className="pointer-events-none absolute bottom-8 left-6 top-8 w-0.5 bg-[var(--accent)]/20 lg:hidden"
                aria-hidden
              />
              {(needle ? matchedWorkflow : publishingWorkflow).map(
                (item, index) => (
                  <li
                    key={item.step}
                    className="relative flex flex-row items-start gap-3 lg:flex-col lg:items-center lg:gap-0"
                    data-aos="fade-up"
                    data-aos-delay={String(80 + index * 100)}
                    data-aos-duration="750"
                    data-aos-anchor-placement="top-bottom"
                  >
                    <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-white text-sm font-bold text-[var(--accent)] shadow-[0_0_0_4px_var(--surface)] ring-4 ring-[var(--accent-soft)] sm:h-12 sm:w-12 sm:text-base lg:mx-auto lg:shadow-[0_0_0_6px_var(--surface)]">
                      {item.step}
                    </div>
                    <article className="mt-0 flex min-w-0 flex-1 flex-col rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_12px_28px_-18px_rgba(11,31,51,0.35)] transition hover:-translate-y-1 hover:border-[var(--accent)]/30 hover:shadow-[0_18px_36px_-16px_rgba(30,104,71,0.35)] sm:p-5 lg:mt-6 lg:text-center">
                      <div
                        className="mb-2.5 h-1 w-8 rounded-full bg-[var(--accent)] sm:mb-3 sm:w-10 lg:mx-auto"
                        aria-hidden
                      />
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] sm:text-[11px]">
                        Step {item.step}
                      </p>
                      <h3 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug text-[var(--ink)] sm:mt-1.5 sm:text-xl">
                        {item.title}
                      </h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted)] sm:mt-2.5 sm:text-base">
                        {item.detail}
                      </p>
                    </article>
                  </li>
                ),
              )}
            </ol>
          </div>
        </section>
      ) : null}

      {/* ACS-style: Powering scientific discovery — journal family */}
      {(!needle || displayedJournals.length > 0) && (
        <section
          className="border-b border-[var(--line)] bg-[var(--ink)] text-white"
          data-aos="fade-up"
          data-aos-duration="800"
        >
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-16">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
                  Portfolio
                </p>
                <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-2xl leading-tight sm:mt-2 sm:text-4xl">
                  Powering scholarly discovery
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/70 sm:mt-3 sm:text-base">
                  Open-access journals delivering peer-reviewed research across
                  the Nahda family of titles.
                </p>
              </div>
              <Link
                href="/journals"
                className="shrink-0 self-start text-sm font-semibold text-emerald-200 hover:underline"
              >
                All journals →
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-5 lg:grid-cols-3">
              {displayedJournals.length === 0 ? (
                <p className="col-span-2 rounded-2xl bg-white/5 p-5 text-sm text-white/70 ring-1 ring-white/10 sm:p-6 sm:text-base lg:col-span-3">
                  Add journals in the admin CMS.
                </p>
              ) : (
                displayedJournals.map((journal, index) => (
                  <JournalImageCard
                    key={journal.id}
                    tone="dark"
                    index={index}
                    aosDelay={Math.min(index * 80, 320)}
                    journal={{
                      id: journal.id,
                      slug: journal.slug,
                      title: journal.title,
                      shortTitle: journal.shortTitle,
                      openAccess: journal.openAccess,
                      coverImageUrl: journal.coverImageUrl,
                      coverColor: journal.coverColor,
                      subjects: journal.subjects,
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* ACS-style membership CTA */}
      {ctaMatches ? (
        <section
          className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--accent)] text-white"
          data-aos="fade-up"
          data-aos-duration="800"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(ellipse at 20% 0%, rgba(255,255,255,0.35), transparent 55%), radial-gradient(ellipse at 90% 100%, rgba(11,31,51,0.45), transparent 50%)",
            }}
            aria-hidden
          />
          <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-6 sm:py-16">
            <div className="max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                For authors
              </p>
              <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-2xl leading-tight sm:mt-2 sm:text-4xl">
                Be part of what comes next in research
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/85 sm:mt-3 sm:text-base">
                Create an account, choose a journal, and track your manuscript
                from peer review through NID assignment and open publication.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-lg border border-white/35 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Register
              </Link>
              <Link
                href="/submissions/new"
                className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)]"
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
