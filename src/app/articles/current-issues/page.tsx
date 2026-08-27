import Link from "next/link";
import type { Metadata } from "next";
import { ArticlesHubNav } from "@/components/articles-hub-nav";
import { IssueArchiveCard } from "@/components/issue-archive-card";
import { loadIssueCatalog } from "@/lib/issue-catalog";
import { currentIssues } from "@/lib/issues";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Current issues",
  description:
    "The latest issue of each Nahda journal, grouped from articles as they are published.",
};

export default async function CurrentIssuesPage() {
  let issues: Awaited<ReturnType<typeof loadIssueCatalog>> = [];
  try {
    issues = currentIssues(await loadIssueCatalog());
  } catch {
    issues = [];
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
            <h1 className="page-title mt-1">Current issues</h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              One live numbered issue per journal. Volume and issue come from
              the article’s publish date and that journal’s schedule.
            </p>
          </div>
          <ArticlesHubNav active="current" />
        </div>

        <div className="mt-8 space-y-3">
          {issues.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-sm text-[var(--muted)] ring-1 ring-[var(--line)]">
              No current issues yet. Published articles will appear here by
              journal as soon as they go live.
            </p>
          ) : null}
          {issues.map((issue) => (
            <IssueArchiveCard key={`${issue.journalId}-${issue.key}`} issue={issue} />
          ))}
        </div>

        <p className="mt-8 text-sm text-[var(--muted)]">
          Looking for earlier volumes?{" "}
          <Link
            href="/articles/past-issues"
            className="font-semibold text-[var(--accent)] hover:underline"
          >
            Browse past issues
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
