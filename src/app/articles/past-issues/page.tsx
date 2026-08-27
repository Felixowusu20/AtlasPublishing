import Link from "next/link";
import type { Metadata } from "next";
import { ArticlesHubNav } from "@/components/articles-hub-nav";
import { IssueArchiveCard } from "@/components/issue-archive-card";
import { loadIssueCatalog } from "@/lib/issue-catalog";
import { groupIssuesByYear, pastIssues } from "@/lib/issues";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Past issues",
  description:
    "Archived journal issues with publication date intervals, grouped by year and title.",
};

export default async function PastIssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ journal?: string; year?: string }>;
}) {
  const { journal: journalSlug, year: yearRaw } = await searchParams;
  const yearFilter = yearRaw ? Number.parseInt(yearRaw, 10) : null;

  let records: Awaited<ReturnType<typeof loadIssueCatalog>> = [];
  try {
    records = await loadIssueCatalog();
  } catch {
    records = [];
  }

  const journals = [
    ...new Map(
      records.map((issue) => [
        issue.journalSlug,
        { slug: issue.journalSlug, title: issue.journalTitle },
      ]),
    ).values(),
  ].sort((a, b) => a.title.localeCompare(b.title));

  let archived = pastIssues(records);
  if (journalSlug) {
    archived = archived.filter((issue) => issue.journalSlug === journalSlug);
  }
  if (yearFilter && Number.isFinite(yearFilter)) {
    archived = archived.filter((issue) => issue.year === yearFilter);
  }

  const byYear = groupIssuesByYear(archived);
  const years = [...new Set(pastIssues(records).map((issue) => issue.year))].sort(
    (a, b) => b - a,
  );
  const selectedJournal = journals.find((j) => j.slug === journalSlug);

  function hrefFor(next: { journal?: string | null; year?: number | null }) {
    const params = new URLSearchParams();
    const journal = next.journal === undefined ? journalSlug : next.journal;
    const year = next.year === undefined ? yearFilter : next.year;
    if (journal) params.set("journal", journal);
    if (year) params.set("year", String(year));
    const qs = params.toString();
    return qs ? `/articles/past-issues?${qs}` : "/articles/past-issues";
  }

  return (
    <div className="relative min-h-screen">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(15,107,106,0.07),_transparent_60%)]"
        aria-hidden
      />
      <div className="relative page-wrap">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              Archives
            </p>
            <h1 className="page-title mt-1">Past issues</h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Earlier volumes, dated from when each article was published.
              Filter by journal and year. The current issue of each title stays
              on{" "}
              <Link
                href="/articles/current-issues"
                className="font-semibold text-[var(--accent)] hover:underline"
              >
                Current issues
              </Link>
              .
            </p>
          </div>
          <ArticlesHubNav active="past" />
        </div>

        {journals.length > 0 ? (
          <div className="mt-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Journal
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={hrefFor({ journal: null })}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                  !journalSlug
                    ? "bg-[var(--accent)] text-white ring-[var(--accent)]"
                    : "bg-white text-[var(--ink)] ring-[var(--line)] hover:ring-[var(--accent)]/40"
                }`}
              >
                All journals
              </Link>
              {journals.map((journal) => (
                <Link
                  key={journal.slug}
                  href={hrefFor({ journal: journal.slug })}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                    journalSlug === journal.slug
                      ? "bg-[var(--accent)] text-white ring-[var(--accent)]"
                      : "bg-white text-[var(--ink)] ring-[var(--line)] hover:ring-[var(--accent)]/40"
                  }`}
                >
                  {journal.title}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {years.length > 0 ? (
          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Year
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={hrefFor({ year: null })}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                  !yearFilter
                    ? "bg-[var(--ink)] text-white ring-[var(--ink)]"
                    : "bg-white text-[var(--ink)] ring-[var(--line)] hover:ring-[var(--accent)]/40"
                }`}
              >
                All years
              </Link>
              {years.map((year) => (
                <Link
                  key={year}
                  href={hrefFor({ year })}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                    yearFilter === year
                      ? "bg-[var(--ink)] text-white ring-[var(--ink)]"
                      : "bg-white text-[var(--ink)] ring-[var(--line)] hover:ring-[var(--accent)]/40"
                  }`}
                >
                  {year}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 space-y-10">
          {byYear.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-sm text-[var(--muted)] ring-1 ring-[var(--line)]">
              {records.length === 0
                ? "No archived issues yet. They appear here after a journal publishes more than one issue."
                : selectedJournal
                  ? `No past issues for ${selectedJournal.title} match this filter.`
                  : "No past issues match this filter. Each journal’s newest issue is listed under Current issues."}
            </p>
          ) : null}
          {byYear.map(({ year, issues }) => (
            <section key={year}>
              <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                {year}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {issues.length} issue{issues.length === 1 ? "" : "s"}
                {selectedJournal ? ` in ${selectedJournal.title}` : ""}
              </p>
              <div className="mt-4 space-y-3">
                {issues.map((issue) => (
                  <IssueArchiveCard
                    key={`${issue.journalId}-${issue.key}`}
                    issue={issue}
                    showJournal={!journalSlug}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
