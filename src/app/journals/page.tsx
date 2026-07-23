import Link from "next/link";
import { journals } from "@/data/mock";

export default function JournalsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        Journals
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Browse journals under Atlas Academic Publishing and start a new
        submission.
      </p>

      <div className="mt-8 space-y-4">
        {journals.map((journal) => (
          <article
            key={journal.id}
            className="flex flex-col gap-5 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div className="flex gap-4">
              <div
                className="flex h-24 w-16 shrink-0 items-end justify-center rounded-md pb-3 text-xs font-bold text-white"
                style={{ background: journal.coverColor }}
              >
                {journal.shortTitle}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--ink)]">
                  {journal.title}
                </h2>
                <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
                  {journal.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {journal.subjects.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-[var(--surface)] px-2.5 py-0.5 text-xs text-[var(--muted)]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 gap-2 sm:flex-col">
              <Link href={`/journals/${journal.slug}`} className="btn-secondary">
                View journal
              </Link>
              <Link
                href={`/submissions/new?journal=${journal.id}`}
                className="btn-primary"
              >
                Submit
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
