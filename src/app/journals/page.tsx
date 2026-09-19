import Link from "next/link";
import { JournalImageCard } from "@/components/journal-image-card";
import { prisma } from "@/lib/db";

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
      <section
        className="border-b border-[var(--line)] bg-white"
        data-aos="fade-up"
        data-aos-duration="700"
      >
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                Nahda Publications
              </p>
              <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)] sm:text-4xl">
                Journals
              </h1>
              <p className="mt-2 max-w-xl text-base text-[var(--muted)]">
                Browse titles, check scope and fees, then submit to the journal
                that fits your work.
              </p>
            </div>
            <div className="flex gap-4 text-base">
              <div
                className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5"
                data-aos="zoom-in"
                data-aos-delay="80"
              >
                <p className="text-xl font-semibold text-[var(--ink)]">
                  {journals.length}
                </p>
                <p className="text-sm text-[var(--muted)]">Titles</p>
              </div>
              <div
                className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5"
                data-aos="zoom-in"
                data-aos-delay="140"
              >
                <p className="text-xl font-semibold text-[var(--ink)]">
                  {openAccessCount}
                </p>
                <p className="text-sm text-[var(--muted)]">Open access</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {journals.length === 0 && (
          <p className="rounded-xl border border-[var(--line)] bg-white p-8 text-center text-base text-[var(--muted)]">
            No journals yet. A super admin can add them under Admin → Journals.
          </p>
        )}
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {journals.map((journal, index) => (
            <li key={journal.id}>
              <JournalImageCard
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
                index={index}
                aosDelay={Math.min(index * 80, 400)}
              />
              <div
                className="mt-3 flex items-center justify-between gap-2 px-0.5"
                data-aos="fade-up"
                data-aos-delay={String(Math.min(index * 80 + 40, 440))}
              >
                <Link
                  href={`/submissions/new?journal=${journal.id}`}
                  className="text-sm font-semibold text-[var(--accent)] hover:underline"
                >
                  Submit →
                </Link>
                <Link
                  href={`/journals/${journal.slug}`}
                  className="text-sm font-medium text-[var(--muted)] hover:text-[var(--accent)]"
                >
                  Details
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
