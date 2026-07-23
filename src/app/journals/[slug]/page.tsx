import Link from "next/link";
import { notFound } from "next/navigation";
import { getJournalBySlug } from "@/data/mock";

export default async function JournalDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const journal = getJournalBySlug(slug);
  if (!journal) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/journals"
        className="text-sm font-medium text-[var(--accent)] hover:underline"
      >
        ← All journals
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[200px_1fr]">
        <div
          className="flex h-64 items-end justify-center rounded-2xl pb-8 text-lg font-bold text-white shadow-md"
          style={{ background: journal.coverColor }}
        >
          {journal.shortTitle}
        </div>

        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)] sm:text-4xl">
            {journal.title}
          </h1>
          <p className="mt-3 max-w-2xl text-[var(--muted)]">{journal.description}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/submissions/new?journal=${journal.id}`}
              className="btn-primary"
            >
              Submit manuscript
            </Link>
            <Link href="/dashboard" className="btn-secondary">
              Author dashboard
            </Link>
          </div>

          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              ["ISSN", journal.issn],
              ["eISSN", journal.eIssn],
              ["DOI prefix", journal.doiPrefix],
              ["Frequency", journal.frequency],
              ["Peer review", journal.reviewType],
              ["Acceptance rate", journal.acceptanceRate],
              ["Avg. review days", String(journal.avgReviewDays)],
              ["APC", journal.apc],
              ["Editor-in-Chief", journal.editorInChief],
              [
                "Access",
                journal.openAccess ? "Open Access" : "Subscription",
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-[var(--line)] bg-white px-4 py-3"
              >
                <dt className="text-xs uppercase tracking-wider text-[var(--muted)]">
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-medium text-[var(--ink)]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-6">
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              Aims & scope
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              {journal.aims}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {journal.subjects.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent)]"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
