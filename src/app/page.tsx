import { ArticleListingCard } from "@/components/article-listing-card";
import { formatMetric } from "@/components/article-metrics";
import { HeroSlider } from "@/components/hero-slider";
import { publishingWorkflow } from "@/data/mock";
import { prisma } from "@/lib/db";
import { journalCardColor } from "@/lib/journal-colors";
import Link from "next/link";

export const dynamic = "force-dynamic";

type HomeStats = {
  articleCount: number;
  journalCount: number;
  totalViews: number;
  totalDownloads: number;
};

async function getHomeData() {
  try {
    const [articles, announcements, journals, metrics, journalCount] =
      await Promise.all([
        prisma.publishedArticle.findMany({
          where: { isActive: true },
          include: { journal: true },
          orderBy: { publishedAt: "desc" },
          take: 4,
        }),
        prisma.announcement.findMany({
          where: { isActive: true },
          orderBy: { publishedAt: "desc" },
          take: 5,
        }),
        prisma.journal.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
          take: 6,
        }),
        prisma.publishedArticle.aggregate({
          where: { isActive: true },
          _count: true,
          _sum: { views: true, downloads: true },
        }),
        prisma.journal.count({ where: { isActive: true } }),
      ]);

    const stats: HomeStats = {
      articleCount: metrics._count,
      journalCount,
      totalViews: metrics._sum.views ?? 0,
      totalDownloads: metrics._sum.downloads ?? 0,
    };

    return { articles, announcements, journals, stats };
  } catch {
    return {
      articles: [],
      announcements: [],
      journals: [],
      stats: null as HomeStats | null,
    };
  }
}

export default async function HomePage() {
  const { articles, announcements, journals, stats } = await getHomeData();

  return (
    <div>
      <HeroSlider />

      {stats && (
        <section className="border-b border-[var(--line)] bg-white">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden px-4 py-7 sm:grid-cols-4 sm:px-6">
            {(
              [
                ["Published articles", stats.articleCount],
                ["Active journals", stats.journalCount],
                ["Article views", stats.totalViews],
                ["PDF downloads", stats.totalDownloads],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="px-4 py-2 text-center sm:py-0">
                <dd className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-3xl">
                  {formatMetric(value)}
                </dd>
                <dt className="mt-1 text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                  {label}
                </dt>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Find by DOI — mirrors live article DOI tools */}
      <section className="border-b border-[var(--line)] bg-[linear-gradient(180deg,var(--accent-soft)_0%,white_100%)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="max-w-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              Discover research
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)] sm:text-2xl">
              Search by title, author, or DOI
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
              Paste an Nahda DOI such as{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-[var(--accent)] ring-1 ring-[var(--line)]">
                10.58000/ajs.2026.0142
              </code>{" "}
              to open the full article page and download the PDF.
            </p>
          </div>
          <form
            action="/search"
            method="get"
            className="flex w-full max-w-md gap-2"
          >
            <input
              name="q"
              type="search"
              placeholder="Title, author, or DOI…"
              className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            />
            <button type="submit" className="btn-primary shrink-0 text-sm">
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="border-b border-[var(--line)] bg-[var(--surface)]/50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              Publishing pathway
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)] sm:text-2xl">
              How publishing works on Nahda
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              A clear path from manuscript upload to open publication.
            </p>
          </div>

          <ol className="relative mt-10 space-y-0 sm:grid sm:grid-cols-5 sm:gap-3 sm:space-y-0">
            {/* Desktop horizontal connector */}
            <div
              className="pointer-events-none absolute left-[10%] right-[10%] top-5 hidden h-px bg-[var(--line)] sm:block"
              aria-hidden
            />

            {publishingWorkflow.map((item, index) => {
              const isLast = index === publishingWorkflow.length - 1;
              return (
                <li
                  key={item.step}
                  className="relative flex gap-4 sm:flex-col sm:items-center sm:gap-0 sm:text-center"
                >
                  {/* Mobile vertical rail + node */}
                  <div className="relative flex w-10 shrink-0 flex-col items-center sm:contents">
                    <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-white text-sm font-semibold text-[var(--accent)] shadow-[0_0_0_6px_var(--paper)] sm:shadow-[0_0_0_6px_var(--surface)]">
                      {item.step}
                    </div>
                    {!isLast && (
                      <div
                        className="mt-1 w-0.5 flex-1 min-h-[1.25rem] rounded-full bg-gradient-to-b from-[var(--accent)]/55 via-[var(--line)] to-[var(--line)] sm:hidden"
                        aria-hidden
                      />
                    )}
                  </div>

                  <div
                    className={`min-w-0 flex-1 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[var(--line)] sm:mt-4 sm:w-full ${
                      isLast ? "mb-0" : "mb-5 sm:mb-0"
                    }`}
                  >
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
              );
            })}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.55fr_1fr]">
          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                  Recently published
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)] sm:text-2xl">
                  Latest articles
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Same layout you see on the full article page — type, DOI, and
                  metrics.
                </p>
              </div>
              <Link
                href="/articles"
                className="shrink-0 text-sm font-semibold text-[var(--accent)] hover:underline"
              >
                View all →
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {articles.length === 0 && (
                <p className="rounded-2xl bg-white p-6 text-sm text-[var(--muted)] ring-1 ring-[var(--line)]">
                  No published articles yet. Publish from the admin queue to see
                  them here.
                </p>
              )}
              {articles.map((article) => (
                <ArticleListingCard
                  key={article.id}
                  compact
                  article={{
                    slug: article.slug,
                    title: article.title,
                    authors: article.authors,
                    abstract: article.abstract,
                    articleType: article.articleType,
                    openAccess: article.openAccess,
                    doi: article.doi,
                    publishedAt: article.publishedAt.toISOString().slice(0, 10),
                    journalTitle: article.journal.title,
                    journalSlug: article.journal.slug,
                    volume: article.volume ?? undefined,
                    issue: article.issue ?? undefined,
                    views: article.views,
                    downloads: article.downloads,
                    keywords: article.keywords,
                    hasPdf: Boolean(article.manuscriptUrl),
                  }}
                />
              ))}
            </div>
          </div>

          <aside className="space-y-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                News
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                Announcements
              </h2>
              <ul className="mt-4 space-y-3">
                {announcements.length === 0 && (
                  <li className="rounded-2xl bg-white p-4 text-sm text-[var(--muted)] ring-1 ring-[var(--line)]">
                    No announcements yet.
                  </li>
                )}
                {announcements.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[var(--line)]"
                  >
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
                      {a.publishedAt.toISOString().slice(0, 10)}
                    </p>
                    {a.href ? (
                      <Link
                        href={a.href}
                        className="mt-1 block text-sm font-semibold text-[var(--ink)] hover:text-[var(--accent)]"
                      >
                        {a.title}
                      </Link>
                    ) : (
                      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                        {a.title}
                      </p>
                    )}
                    <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                      {a.summary}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                    Portfolio
                  </p>
                  <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                    Our journals
                  </h2>
                </div>
                <Link
                  href="/journals"
                  className="text-sm font-semibold text-[var(--accent)] hover:underline"
                >
                  All →
                </Link>
              </div>
              <div className="mt-4 space-y-2">
                {journals.length === 0 && (
                  <p className="rounded-2xl bg-white p-4 text-sm text-[var(--muted)] ring-1 ring-[var(--line)]">
                    Add journals in the admin CMS.
                  </p>
                )}
                {journals.map((j, index) => (
                  <Link
                    key={j.id}
                    href={`/journals/${j.slug}`}
                    className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[var(--line)] transition hover:ring-[var(--accent)]/30"
                  >
                    <span
                      className="relative flex h-12 w-9 shrink-0 items-end justify-center overflow-hidden rounded-md text-[9px] font-bold text-white"
                      style={
                        j.coverImageUrl
                          ? { background: "#fff" }
                          : {
                              background: journalCardColor(j.coverColor, index),
                            }
                      }
                    >
                      {j.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={j.coverImageUrl}
                          alt=""
                          className="h-full w-full object-contain p-0.5"
                        />
                      ) : (
                        <span className="pb-1.5">{j.shortTitle}</span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[var(--ink)]">
                        {j.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--muted)]">
                        {j.openAccess ? "Open Access" : "Subscription"}
                        {j.doiPrefix ? ` · ${j.doiPrefix}` : ""}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-[var(--ink)] text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 px-4 py-12 sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
              For authors
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl sm:text-2xl">
              Ready to submit?
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/70">
              Create an account, choose a journal, and track your manuscript from
              peer review through DOI assignment and publication.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-lg border border-white/25 bg-transparent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Register
            </Link>
            <Link
              href="/submissions/new"
              className="inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c5756]"
            >
              Start submission
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
