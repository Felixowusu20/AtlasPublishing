import Link from "next/link";
import type { IssueRecord } from "@/lib/issues";
import { displayIssn } from "@/lib/issn";

type Props = {
  issue: IssueRecord;
  showJournal?: boolean;
};

export function IssueArchiveCard({ issue, showJournal = true }: Props) {
  return (
    <article className="card flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {showJournal ? (
          <Link
            href={`/journals/${issue.journalSlug}`}
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] hover:underline"
          >
            {issue.journalTitle}
          </Link>
        ) : null}
        <p className="mt-1 font-semibold text-[var(--ink)]">
          {issue.title}
          {issue.isCurrent ? (
            <span className="ml-2 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--accent)]">
              Current
            </span>
          ) : null}
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {issue.intervalLabel}
          {" · "}
          {issue.articleCount} article{issue.articleCount === 1 ? "" : "s"}
          {issue.frequency ? ` · ${issue.frequency}` : ""}
          {" · "}ISSN {displayIssn(issue.issn)}
        </p>
      </div>
      <Link
        href={issue.href}
        className="shrink-0 text-sm font-semibold text-[var(--accent)]"
      >
        View articles →
      </Link>
    </article>
  );
}
