import { HeroSlider } from "@/components/hero-slider";
import {
  announcements,
  journals,
  publishedArticles,
  publishingWorkflow,
} from "@/data/mock";
import Link from "next/link";

export default function HomePage() {
  const latest = publishedArticles.slice(0, 4);

  return (
    <div>
      <HeroSlider />

      <section className="border-b border-[var(--line)] bg-[var(--surface)]/60">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              How publishing works on Atlas
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              A clear path from manuscript upload to publication.
            </p>
          </div>

          <ol className="relative mt-10 grid gap-8 sm:grid-cols-5 sm:gap-4">
            {/* Connecting line across steps (desktop) */}
            <div
              className="pointer-events-none absolute left-[10%] right-[10%] top-5 hidden h-px bg-[var(--line)] sm:block"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute left-[10%] right-[10%] top-5 hidden h-px bg-gradient-to-r from-transparent via-[var(--accent)]/35 to-transparent sm:block"
              aria-hidden
            />

            {publishingWorkflow.map((item, index) => (
              <li key={item.step} className="relative flex flex-col items-center text-center">
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-white text-sm font-semibold text-[var(--accent)] shadow-[0_0_0_6px_var(--paper)]">
                  {item.step}
                </div>

                {/* Mobile vertical connector */}
                {index < publishingWorkflow.length - 1 && (
                  <div
                    className="absolute left-1/2 top-10 h-[calc(100%-0.5rem)] w-px -translate-x-1/2 bg-[var(--line)] sm:hidden"
                    aria-hidden
                  />
                )}

                <div className="mt-4 w-full rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)]/30 hover:shadow-md">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                    Step {item.step}
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-[var(--ink)]">
                    {item.title}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                    {item.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          {/* Latest articles */}
          <div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
                  Latest articles
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Newly published and Early View
                </p>
              </div>
              <Link
                href="/articles"
                className="text-sm font-semibold text-[var(--accent)] hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {latest.map((article) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.slug}`}
                  className="block card p-4 transition hover:border-[var(--accent)]/40 sm:p-5"
                >
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 font-medium text-[var(--accent)]">
                      {article.articleType}
                    </span>
                    {article.openAccess && (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-700">
                        Open Access
                      </span>
                    )}
                    {article.issue === "Early View" && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-800">
                        Early View
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-[var(--ink)]">
                    {article.title}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {article.authors.join(", ")}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
                    {article.abstract}
                  </p>
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    {article.journalTitle}, {article.publishedAt}, DOI{" "}
                    {article.doi}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* Announcements + journals */}
          <aside className="space-y-8">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                Announcements
              </h2>
              <ul className="mt-4 space-y-3">
                {announcements.map((a) => (
                  <li key={a.id} className="card p-4">
                    <p className="text-xs text-[var(--muted)]">{a.date}</p>
                    <Link
                      href={a.href}
                      className="mt-1 block text-sm font-semibold text-[var(--ink)] hover:text-[var(--accent)]"
                    >
                      {a.title}
                    </Link>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                      {a.summary}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-end justify-between">
                <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                  Our journals
                </h2>
                <Link
                  href="/journals"
                  className="text-sm font-semibold text-[var(--accent)]"
                >
                  All
                </Link>
              </div>
              <div className="mt-4 space-y-2">
                {journals.map((j) => (
                  <Link
                    key={j.id}
                    href={`/journals/${j.slug}`}
                    className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-white p-3 hover:border-[var(--accent)]/40"
                  >
                    <span
                      className="flex h-12 w-9 items-end justify-center rounded pb-1.5 text-[9px] font-bold text-white"
                      style={{ background: j.coverColor }}
                    >
                      {j.shortTitle}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[var(--ink)]">
                        {j.title}
                      </span>
                      <span className="block text-xs text-[var(--muted)]">
                        {j.openAccess ? "Open Access" : "Subscription"}, IF{" "}
                        {j.impactFactor ?? "N/A"}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              Ready to submit?
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Create an account, pick a journal, and track your manuscript end to
              end.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/register" className="btn-secondary">
              Register
            </Link>
            <Link href="/submissions/new" className="btn-primary">
              Start submission
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
