import Link from "next/link";
import { publishedArticles } from "@/data/mock";

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ access?: string }>;
}) {
  const { access } = await searchParams;
  const list =
    access === "oa"
      ? publishedArticles.filter((a) => a.openAccess)
      : publishedArticles;

  return (
    <div className="page-wrap">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Articles</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Published and Early View content across Atlas journals, with full
            reading pages and article metrics.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/articles"
            className={`rounded-lg px-3 py-2 text-sm font-medium ${!access ? "bg-[var(--accent)] text-white" : "bg-white border border-[var(--line)]"}`}
          >
            All
          </Link>
          <Link
            href="/articles?access=oa"
            className={`rounded-lg px-3 py-2 text-sm font-medium ${access === "oa" ? "bg-[var(--accent)] text-white" : "bg-white border border-[var(--line)]"}`}
          >
            Open access
          </Link>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {list.map((article) => (
          <article key={article.id} className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
              <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 font-medium text-[var(--accent)]">
                {article.articleType}
              </span>
              {article.openAccess && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-700">
                  Open Access
                </span>
              )}
              <span>
                Vol. {article.volume}, Issue {article.issue}
              </span>
            </div>
            <Link href={`/articles/${article.slug}`}>
              <h2 className="mt-3 text-lg font-semibold text-[var(--ink)] hover:text-[var(--accent)]">
                {article.title}
              </h2>
            </Link>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {article.authors.join(", ")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              {article.abstract}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4 text-xs text-[var(--muted)]">
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/journals/${article.journalSlug}`}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  {article.journalTitle}
                </Link>
                <span>DOI: {article.doi}</span>
                <span>{article.publishedAt}</span>
              </div>
              <div className="flex items-center gap-3">
                <span>{article.views} views</span>
                <Link
                  href={`/articles/${article.slug}`}
                  className="font-semibold text-[var(--accent)]"
                >
                  Read article →
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
