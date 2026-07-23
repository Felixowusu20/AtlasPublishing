import Link from "next/link";
import { journals } from "@/data/mock";

export default function JournalsPage() {
  const openAccessCount = journals.filter((j) => j.openAccess).length;

  return (
    <div className="min-h-full">
      <section className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                Atlas Publishing House
              </p>
              <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
                Journals
              </h1>
              <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
                Browse titles, check scope and fees, then submit to the journal
                that fits your work.
              </p>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5">
                <p className="text-lg font-semibold text-[var(--ink)]">
                  {journals.length}
                </p>
                <p className="text-xs text-[var(--muted)]">Titles</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5">
                <p className="text-lg font-semibold text-[var(--ink)]">
                  {openAccessCount}
                </p>
                <p className="text-xs text-[var(--muted)]">Open access</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <ul className="space-y-3">
          {journals.map((journal) => (
            <li key={journal.id}>
              <article className="group flex gap-4 rounded-2xl border border-[var(--line)] bg-white p-3 shadow-sm transition hover:border-[var(--accent)]/35 hover:shadow-md sm:gap-5 sm:p-4">
                {/* Compact spine cover */}
                <Link
                  href={`/journals/${journal.slug}`}
                  className="relative flex h-[7.5rem] w-14 shrink-0 flex-col justify-between overflow-hidden rounded-lg text-white shadow-inner sm:h-28 sm:w-16"
                  style={{ background: journal.coverColor }}
                  aria-label={journal.title}
                >
                  <span className="px-1.5 pt-2 text-[9px] font-semibold uppercase tracking-wide text-white/70">
                    {journal.shortTitle}
                  </span>
                  <span className="bg-black/20 px-1.5 py-1.5 text-[8px] leading-tight text-white/90">
                    {journal.openAccess ? "OA" : "Sub"}
                  </span>
                </Link>

                <div className="min-w-0 flex-1 py-0.5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {journal.openAccess && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Open Access
                          </span>
                        )}
                        {journal.impactFactor && (
                          <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                            IF {journal.impactFactor}
                          </span>
                        )}
                        <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                          {journal.reviewType}
                        </span>
                      </div>

                      <Link href={`/journals/${journal.slug}`}>
                        <h2 className="mt-1.5 text-base font-semibold text-[var(--ink)] transition group-hover:text-[var(--accent)] sm:text-lg">
                          {journal.title}
                        </h2>
                      </Link>

                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">
                        {journal.description}
                      </p>

                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {journal.subjects.slice(0, 4).map((s) => (
                          <span
                            key={s}
                            className="rounded-md bg-[var(--surface)] px-2 py-0.5 text-[11px] text-[var(--muted)]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>

                      <p className="mt-2.5 text-[11px] text-[var(--muted)]">
                        ISSN {journal.issn}
                        <span className="mx-1.5 text-[var(--line)]">|</span>
                        {journal.frequency}
                        <span className="mx-1.5 text-[var(--line)]">|</span>
                        APC {journal.apc}
                        <span className="mx-1.5 text-[var(--line)]">|</span>
                        ~{journal.avgReviewDays} days to decision
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2 sm:flex-col">
                      <Link
                        href={`/journals/${journal.slug}`}
                        className="btn-secondary !px-3 !py-2 text-center text-xs sm:min-w-[7.5rem]"
                      >
                        View journal
                      </Link>
                      <Link
                        href={`/submissions/new?journal=${journal.id}`}
                        className="btn-primary !px-3 !py-2 text-center text-xs sm:min-w-[7.5rem]"
                      >
                        Submit
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-2xl border border-dashed border-[var(--line)] bg-white px-5 py-6 text-center">
          <p className="text-sm font-medium text-[var(--ink)]">
            Not sure which journal fits?
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Read the author guidelines or browse article types before you submit.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/authors/guidelines" className="btn-secondary !px-3 !py-2 text-xs">
              Author guidelines
            </Link>
            <Link href="/authors/article-types" className="btn-secondary !px-3 !py-2 text-xs">
              Article types
            </Link>
            <Link href="/authors/fees" className="btn-secondary !px-3 !py-2 text-xs">
              Fees and waivers
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
