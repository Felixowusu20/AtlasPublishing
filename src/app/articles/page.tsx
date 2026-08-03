import Link from "next/link";
import { ArticleListingCard } from "@/components/article-listing-card";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type ArticleCard = {
  id: string;
  slug: string;
  title: string;
  authors: string[];
  abstract: string;
  articleType: string;
  openAccess: boolean;
  volume: string;
  issue: string;
  doi: string;
  publishedAt: string;
  journalTitle: string;
  journalSlug: string;
  views: number;
  downloads: number;
  keywords: string[];
  hasPdf: boolean;
};

async function getArticles(): Promise<ArticleCard[]> {
  try {
    const rows = await prisma.publishedArticle.findMany({
      where: { isActive: true, deletedAt: null },
      include: { journal: true },
      orderBy: { publishedAt: "desc" },
    });
    return rows.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      authors: a.authors,
      abstract: a.abstract,
      articleType: a.articleType,
      openAccess: a.openAccess,
      volume: a.volume ?? "—",
      issue: a.issue ?? "Early View",
      doi: a.doi ?? "Pending",
      publishedAt: a.publishedAt.toISOString().slice(0, 10),
      journalTitle: a.journal.title,
      journalSlug: a.journal.slug,
      views: a.views,
      downloads: a.downloads,
      keywords: a.keywords,
      hasPdf: Boolean(a.manuscriptUrl),
    }));
  } catch {
    return [];
  }
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ access?: string }>;
}) {
  const { access } = await searchParams;
  const all = await getArticles();
  const list = access === "oa" ? all.filter((a) => a.openAccess) : all;

  return (
    <div className="relative min-h-screen">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(15,107,106,0.07),_transparent_60%)]"
        aria-hidden
      />

      <div className="relative page-wrap">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              Nahda journals
            </p>
            <h1 className="page-title mt-1">Articles</h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Published and Early View content. Each listing matches the live
              article page — journal bar, open-access badge, DOI, and metrics.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/articles"
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                !access
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--accent)]/40"
              }`}
            >
              All
            </Link>
            <Link
              href="/articles?access=oa"
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                access === "oa"
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--accent)]/40"
              }`}
            >
              Open access
            </Link>
            <Link
              href="/search"
              className="rounded-lg border border-[var(--line)] bg-white px-3.5 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)]/40"
            >
              Search by DOI
            </Link>
          </div>
        </div>

        <div className="mt-8 w-full min-w-0 space-y-4">
          {list.length === 0 && (
            <p className="rounded-2xl bg-white p-6 text-sm text-[var(--muted)] ring-1 ring-[var(--line)]">
              No articles published yet.
            </p>
          )}
          {list.map((article) => (
            <ArticleListingCard
              key={article.id}
              article={{
                slug: article.slug,
                title: article.title,
                authors: article.authors,
                abstract: article.abstract,
                articleType: article.articleType,
                openAccess: article.openAccess,
                doi: article.doi,
                publishedAt: article.publishedAt,
                journalTitle: article.journalTitle,
                journalSlug: article.journalSlug,
                volume: article.volume,
                issue: article.issue,
                views: article.views,
                downloads: article.downloads,
                keywords: article.keywords,
                hasPdf: article.hasPdf,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
