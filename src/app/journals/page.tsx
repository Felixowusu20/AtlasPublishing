import Link from "next/link";
import { journals } from "@/data/mock";

export default function JournalsPage() {
  return (
    <div className="page-wrap">
      <h1 className="page-title">Journals</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        MDPI-style journal catalogue under Atlas Publishing House. Open a title
        for aims, issues, editorial board, and submission.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {journals.map((journal) => (
          <article key={journal.id} className="card overflow-hidden">
            <div
              className="flex h-28 items-end px-5 pb-4 text-white"
              style={{ background: journal.coverColor }}
            >
              <div>
                <p className="text-xs text-white/70">{journal.shortTitle}</p>
                <h2 className="font-[family-name:var(--font-display)] text-xl">
                  {journal.title}
                </h2>
              </div>
            </div>
            <div className="p-5">
              <p className="line-clamp-2 text-sm text-[var(--muted)]">
                {journal.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {journal.subjects.slice(0, 3).map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-[var(--surface)] px-2.5 py-0.5 text-xs text-[var(--muted)]"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">
                ISSN {journal.issn}, {journal.reviewType},{" "}
                {journal.openAccess ? "OA" : "Subscription"}, APC {journal.apc}
              </p>
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/journals/${journal.slug}`}
                  className="btn-secondary !px-3 !py-2 text-sm"
                >
                  View journal
                </Link>
                <Link
                  href={`/submissions/new?journal=${journal.id}`}
                  className="btn-primary !px-3 !py-2 text-sm"
                >
                  Submit
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
