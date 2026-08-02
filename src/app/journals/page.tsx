import Link from "next/link";
import { prisma } from "@/lib/db";
import { journalCardColor } from "@/lib/journal-colors";

export const dynamic = "force-dynamic";

export default async function JournalsPage() {
  let journals: Awaited<ReturnType<typeof prisma.journal.findMany>> = [];
  try {
    journals = await prisma.journal.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });
  } catch {
    journals = [];
  }

  const openAccessCount = journals.filter((j) => j.openAccess).length;

  return (
    <div className="min-h-full">
      <section className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                Nahda Publications
              </p>
              <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)] sm:text-3xl">
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
        {journals.length === 0 && (
          <p className="rounded-xl border border-[var(--line)] bg-white p-8 text-center text-sm text-[var(--muted)]">
            No journals yet. A super admin can add them under Admin → Journals.
          </p>
        )}
        <ul className="space-y-3">
          {journals.map((journal, index) => {
            const color = journalCardColor(journal.coverColor, index);
            return (
              <li key={journal.id}>
                <article className="group flex gap-4 rounded-2xl border border-[var(--line)] bg-white p-3 shadow-sm transition hover:border-[var(--accent)]/35 hover:shadow-md sm:gap-5 sm:p-4">
                  <Link
                    href={`/journals/${journal.slug}`}
                    className="relative flex h-[7.5rem] w-14 shrink-0 flex-col justify-between overflow-hidden rounded-lg text-white shadow-inner sm:h-28 sm:w-16"
                    style={
                      journal.coverImageUrl
                        ? { background: "#fff" }
                        : { background: color }
                    }
                    aria-label={journal.title}
                  >
                    {journal.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={journal.coverImageUrl}
                        alt=""
                        className="h-full w-full object-contain p-1.5"
                      />
                    ) : (
                      <>
                        <span className="px-1.5 pt-2 text-[9px] font-semibold uppercase tracking-wide text-white/70">
                          {journal.shortTitle}
                        </span>
                        <span className="bg-black/20 px-1.5 py-1.5 text-[8px] leading-tight text-white/90">
                          {journal.openAccess ? "OA" : "Sub"}
                        </span>
                      </>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1 py-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <Link
                        href={`/journals/${journal.slug}`}
                        className="text-base font-semibold text-[var(--ink)] group-hover:text-[var(--accent)]"
                      >
                        {journal.title}
                      </Link>
                      <span className="text-xs font-medium text-[var(--muted)]">
                        ({journal.shortTitle})
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                      {journal.description}
                    </p>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {journal.subjects.join(" · ") || "General"}
                      {journal.impactFactor
                        ? ` · IF ${journal.impactFactor}`
                        : ""}
                    </p>
                    <div className="mt-3">
                      <Link
                        href={`/submissions/new?journal=${journal.id}`}
                        className="text-xs font-semibold text-[var(--accent)]"
                      >
                        Submit to this journal →
                      </Link>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
