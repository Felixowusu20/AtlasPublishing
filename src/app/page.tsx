import Link from "next/link";
import { journals, submissions } from "@/data/mock";

export default function HomePage() {
  const active = submissions.filter((s) => s.status !== "Published").length;

  return (
    <div>
      <section className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--ink)] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #1a6b6a 0%, transparent 40%), radial-gradient(circle at 80% 0%, #1e4a6e 0%, transparent 35%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-sm font-medium tracking-wide text-teal-200/90">
            Atlas Academic Publishing
          </p>
          <h1 className="mt-4 max-w-2xl font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-5xl">
            Submit. Review. Publish.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
            A clear path from manuscript to publication across our journals —
            built for authors, reviewers, and editors.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/submissions/new"
              className="inline-flex rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-slate-100"
            >
              Start a submission
            </Link>
            <Link
              href="/journals"
              className="inline-flex rounded-lg border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Browse journals
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Journals", value: String(journals.length) },
            { label: "Your active manuscripts", value: String(active) },
            { label: "Avg. review time", value: "28 days" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-[var(--line)] bg-white px-5 py-6 shadow-sm"
            >
              <p className="text-3xl font-semibold tracking-tight text-[var(--ink)]">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              Featured journals
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Choose a journal and begin your submission.
            </p>
          </div>
          <Link
            href="/journals"
            className="hidden text-sm font-semibold text-[var(--accent)] hover:underline sm:block"
          >
            View all
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {journals.slice(0, 4).map((journal) => (
            <Link
              key={journal.id}
              href={`/journals/${journal.slug}`}
              className="group rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-md"
            >
              <div className="flex gap-4">
                <div
                  className="flex h-16 w-12 shrink-0 items-end justify-center rounded-md pb-2 text-[10px] font-bold text-white"
                  style={{ background: journal.coverColor }}
                >
                  {journal.shortTitle}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--ink)] group-hover:text-[var(--accent)]">
                    {journal.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                    {journal.description}
                  </p>
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    ISSN {journal.issn} · {journal.reviewType} ·{" "}
                    {journal.openAccess ? "Open Access" : "Subscription"}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
