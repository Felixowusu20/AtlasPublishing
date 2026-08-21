import { HomeDashboard } from "@/components/home-dashboard";
import { publishingWorkflow } from "@/data/mock";
import { prisma } from "@/lib/db";
import { resolvePublishedPdfUrl } from "@/lib/submission-utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getHomeData(q = "") {
  const needle = q.trim().toLowerCase();

  try {
    const [articles, announcements, metrics, journalCount] =
      await Promise.all([
        prisma.publishedArticle.findMany({
          where: { isActive: true, deletedAt: null },
          include: {
            journal: true,
            submission: { select: { manuscriptUrl: true } },
          },
          orderBy: { publishedAt: "desc" },
          take: needle ? 150 : 24,
        }),
        prisma.announcement.findMany({
          where: { isActive: true },
          orderBy: { publishedAt: "desc" },
          take: 5,
        }),
        prisma.publishedArticle.aggregate({
          where: { isActive: true, deletedAt: null },
          _count: true,
          _sum: { views: true, downloads: true },
        }),
        prisma.journal.count({ where: { isActive: true } }),
      ]);

    const mapped = articles.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      authors: a.authors,
      articleType: a.articleType,
      openAccess: a.openAccess,
      journalTitle: a.journal.title,
      journalSlug: a.journal.slug,
      journalShortTitle: a.journal.shortTitle,
      coverImageUrl: a.journal.coverImageUrl,
      coverColor: a.journal.coverColor,
      publishedAt: a.publishedAt.toISOString().slice(0, 10),
      doi: a.doi,
      hasPdf: Boolean(
        resolvePublishedPdfUrl(a.manuscriptUrl, a.submission?.manuscriptUrl),
      ),
    }));

    const filtered = needle
      ? mapped.filter((a) =>
          [
            a.title,
            a.authors.join(" "),
            a.journalTitle,
            a.journalShortTitle,
            a.articleType,
          ]
            .join(" ")
            .toLowerCase()
            .includes(needle),
        )
      : mapped;

    return {
      articles: filtered,
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        summary: a.summary,
        href: a.href,
        publishedAt: a.publishedAt.toISOString().slice(0, 10),
      })),
      stats: {
        articleCount: metrics._count,
        journalCount,
        totalViews: metrics._sum.views ?? 0,
        totalDownloads: metrics._sum.downloads ?? 0,
      },
    };
  } catch {
    return {
      articles: [],
      announcements: [],
      stats: null,
    };
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const { articles, announcements, stats } = await getHomeData(query);

  return (
    <div className="max-w-[100%] overflow-x-clip">
      <HomeDashboard
        articles={articles}
        announcements={announcements}
        stats={stats}
        q={query}
      />

      <section className="border-t border-[var(--line)] bg-[var(--surface)]/50">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            Publishing pathway
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            How publishing works
          </h2>
          <div className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] sm:grid sm:grid-cols-5 sm:overflow-visible [&::-webkit-scrollbar]:hidden">
            {publishingWorkflow.map((item) => (
              <article
                key={item.step}
                className="flex h-full min-h-[10.5rem] w-[11.5rem] shrink-0 snap-start flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[var(--line)] sm:w-auto"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  Step {item.step}
                </p>
                <p className="mt-1.5 text-sm font-semibold text-[var(--ink)]">
                  {item.title}
                </p>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-[var(--muted)]">
                  {item.detail}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-[var(--ink)] text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
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
              className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0c5756]"
            >
              + Start submission
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
