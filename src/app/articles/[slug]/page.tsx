import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug } from "@/data/mock";

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <div className="page-wrap">
      <Link
        href="/articles"
        className="text-sm font-medium text-[var(--accent)] hover:underline"
      >
        ← All articles
      </Link>

      {/* PLOS-style article header */}
      <header className="mt-6 max-w-3xl">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 font-medium text-[var(--accent)]">
            {article.articleType}
          </span>
          {article.openAccess && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-700">
              Open Access, {article.license}
            </span>
          )}
          {article.issue === "Early View" && (
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-800">
              Early View
            </span>
          )}
        </div>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-snug text-[var(--ink)] sm:text-4xl">
          {article.title}
        </h1>
        <p className="mt-4 text-base text-[var(--ink)]">
          {article.authors.join(", ")}
        </p>
        <ul className="mt-2 space-y-0.5 text-sm text-[var(--muted)]">
          {article.affiliations.map((aff) => (
            <li key={aff}>{aff}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-[var(--muted)]">
          <Link
            href={`/journals/${article.journalSlug}`}
            className="font-medium text-[var(--accent)] hover:underline"
          >
            {article.journalTitle}
          </Link>
          {", "}
          Vol. {article.volume}, Issue {article.issue}, pp. {article.pages}
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Received {article.receivedAt}, Accepted {article.acceptedAt},
          Published {article.publishedAt}
        </p>
        <p className="mt-1 text-sm">
          <span className="text-[var(--muted)]">DOI: </span>
          <span className="font-medium text-[var(--ink)]">{article.doi}</span>
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_240px]">
        <article className="max-w-3xl">
          <section className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
              Abstract
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--ink)]">
              {article.abstract}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {article.keywords.map((k) => (
                <span
                  key={k}
                  className="rounded-full bg-[var(--surface)] px-2.5 py-0.5 text-xs text-[var(--muted)]"
                >
                  {k}
                </span>
              ))}
            </div>
          </section>

          <div className="mt-6 space-y-6">
            {article.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                  {section.heading}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        </article>

        <aside className="h-fit space-y-3 lg:sticky lg:top-24">
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Metrics
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">Views</dt>
                <dd className="font-medium">{article.views.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">Downloads</dt>
                <dd className="font-medium">
                  {article.downloads.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">Citations</dt>
                <dd className="font-medium">{article.citations}</dd>
              </div>
            </dl>
          </div>
          <div className="card space-y-2 p-4">
            <button type="button" className="btn-primary w-full text-sm">
              Download PDF (mock)
            </button>
            <button type="button" className="btn-secondary w-full text-sm">
              Cite this article
            </button>
            <Link
              href={`/submissions/new?journal=${article.journalId}`}
              className="btn-secondary w-full text-sm"
            >
              Submit to this journal
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
