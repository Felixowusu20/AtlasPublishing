import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getArticleBySlug } from "@/data/mock";
import { articleDownloadPath } from "@/lib/submission-utils";
import { formatMetric } from "@/components/article-metrics";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const dbArticle = await prisma.publishedArticle.findFirst({
    where: { slug, isActive: true },
    include: { journal: true },
  });

  if (dbArticle) {
    void prisma.publishedArticle
      .update({
        where: { id: dbArticle.id },
        data: { views: { increment: 1 } },
      })
      .catch(() => undefined);

    const article = {
      title: dbArticle.title,
      articleType: dbArticle.articleType,
      openAccess: dbArticle.openAccess,
      license: dbArticle.license ?? "CC BY 4.0",
      issue: dbArticle.issue ?? "Early View",
      authors: dbArticle.authors,
      affiliations: dbArticle.affiliations,
      journalSlug: dbArticle.journal.slug,
      journalTitle: dbArticle.journal.title,
      journalId: dbArticle.journalId,
      volume: dbArticle.volume ?? "—",
      pages: dbArticle.pages ?? "—",
      doi: dbArticle.doi ?? "Pending",
      receivedAt: formatDate(dbArticle.receivedAt),
      acceptedAt: formatDate(dbArticle.acceptedAt),
      publishedAt: formatDate(dbArticle.publishedAt),
      abstract: dbArticle.abstract,
      keywords: dbArticle.keywords,
      views: dbArticle.views + 1,
      downloads: dbArticle.downloads,
      citations: dbArticle.citations,
      manuscriptUrl: dbArticle.manuscriptUrl,
      slug: dbArticle.slug,
    };

    return <ArticleView article={article} />;
  }

  const mock = getArticleBySlug(slug);
  if (!mock) notFound();

  return (
    <ArticleView
      article={{
        title: mock.title,
        articleType: mock.articleType,
        openAccess: mock.openAccess,
        license: mock.license,
        issue: mock.issue,
        authors: mock.authors,
        affiliations: mock.affiliations,
        journalSlug: mock.journalSlug,
        journalTitle: mock.journalTitle,
        journalId: mock.journalId,
        volume: mock.volume,
        pages: mock.pages,
        doi: mock.doi,
        receivedAt: mock.receivedAt,
        acceptedAt: mock.acceptedAt,
        publishedAt: mock.publishedAt,
        abstract: mock.abstract,
        keywords: mock.keywords,
        views: mock.views,
        downloads: mock.downloads,
        citations: mock.citations,
        sections: mock.sections,
        slug,
        manuscriptUrl: null,
      }}
    />
  );
}

type ViewArticle = {
  title: string;
  articleType: string;
  openAccess: boolean;
  license: string;
  issue: string;
  authors: string[];
  affiliations: string[];
  journalSlug: string;
  journalTitle: string;
  journalId: string;
  volume: string;
  pages: string;
  doi: string;
  receivedAt: string;
  acceptedAt: string;
  publishedAt: string;
  abstract: string;
  keywords: string[];
  views: number;
  downloads: number;
  citations: number;
  manuscriptUrl?: string | null;
  slug: string;
  sections?: { heading: string; body: string }[];
};

function ArticleView({ article }: { article: ViewArticle }) {
  const downloadHref = article.manuscriptUrl
    ? articleDownloadPath(article.slug)
    : null;

  const citeText = `${article.authors[0] ?? "Author"}${
    article.authors.length > 1 ? " et al." : ""
  }. ${article.title}. ${article.journalTitle}. ${article.publishedAt}. DOI: ${article.doi}`;

  return (
    <div className="bg-[var(--paper)]">
      {/* Journal masthead strip */}
      <div className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/articles"
            className="text-xs font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
          >
            ← All articles
          </Link>
          <Link
            href={`/journals/${article.journalSlug}`}
            className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]"
          >
            {article.journalTitle}
          </Link>
        </div>
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="h-[3px] w-full bg-[var(--accent)]" />
          <span className="absolute -top-[11px] right-4 rounded-sm bg-[var(--accent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white sm:right-6">
            {(article.articleType || "Article")
              .replace(/\s+Article$/i, "")
              .slice(0, 18) || "Article"}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            {/* Title block */}
            <header className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 font-semibold text-[var(--accent)]">
                  {article.articleType}
                </span>
                {article.openAccess && (
                  <span className="font-medium text-emerald-700">
                    Open Access · {article.license}
                  </span>
                )}
                {article.issue === "Early View" && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-900">
                    Early View
                  </span>
                )}
              </div>

              <h1 className="mt-4 font-[family-name:var(--font-display)] text-[1.85rem] font-bold leading-[1.2] tracking-tight text-[var(--ink)] sm:text-[2.35rem]">
                {article.title}
              </h1>

              {/* Authors — muted, compact */}
              <p className="mt-5 text-[13px] leading-relaxed text-[var(--muted)]">
                {article.authors.map((name, i) => (
                  <span key={`${name}-${i}`}>
                    {i > 0 ? ", " : ""}
                    {name}
                    {article.affiliations[i] || article.affiliations.length === 1 ? (
                      <sup className="ml-0.5 text-[10px] text-[var(--accent)]">
                        {article.affiliations.length === 1 ? 1 : i + 1}
                      </sup>
                    ) : null}
                  </span>
                ))}
              </p>

              {/* Affiliations — same visual weight as previous author style */}
              {article.affiliations.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {article.affiliations.map((aff, i) => (
                    <li
                      key={`${aff}-${i}`}
                      className="font-[family-name:var(--font-display)] text-[15px] leading-snug text-[var(--ink)] sm:text-base"
                    >
                      <sup className="mr-1.5 text-[11px] font-semibold text-[var(--accent)]">
                        {i + 1}
                      </sup>
                      {aff}
                    </li>
                  ))}
                </ul>
              )}

              {/* Cite / Read strip */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-2.5 border-b-[3px] border-amber-500 bg-white px-3.5 py-3 shadow-sm">
                  <span
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 border-amber-500 text-[9px] font-bold text-amber-600"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <p className="min-w-0 text-[11px] leading-snug text-[var(--ink)]">
                    <span className="font-semibold">Cite This: </span>
                    <span className="text-[var(--accent)]">{citeText}</span>
                  </p>
                </div>
                {downloadHref ? (
                  <a
                    href={downloadHref}
                    className="flex items-center gap-2.5 border-b-[3px] border-[var(--accent)] bg-white px-3.5 py-3 shadow-sm transition hover:bg-[var(--accent-soft)]/40"
                  >
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-[var(--accent)] text-[8px] font-bold text-[var(--accent)]"
                      aria-hidden
                    >
                      ↓
                    </span>
                    <span className="text-[12px] font-bold text-[var(--accent)]">
                      Download PDF
                    </span>
                  </a>
                ) : (
                  <div className="flex items-center gap-2.5 border-b-[3px] border-[var(--line)] bg-white px-3.5 py-3 opacity-60 shadow-sm">
                    <span className="text-[12px] font-bold text-[var(--muted)]">
                      PDF unavailable
                    </span>
                  </div>
                )}
              </div>

              {/* Meta row */}
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--line)] pb-4 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                <Link
                  href={`/journals/${article.journalSlug}`}
                  className="text-[var(--accent)] hover:underline"
                >
                  {article.journalTitle}
                </Link>
                <span className="text-[var(--line)]">|</span>
                <span>
                  Vol. {article.volume} · Issue {article.issue}
                </span>
                {article.pages !== "—" && (
                  <>
                    <span className="text-[var(--line)]">|</span>
                    <span>pp. {article.pages}</span>
                  </>
                )}
                <span className="text-[var(--line)]">|</span>
                <span>DOI: {article.doi}</span>
              </div>

              <p className="mt-3 text-[12px] text-[var(--muted)]">
                Received {article.receivedAt}
                {" · "}Accepted {article.acceptedAt}
                {" · "}Published {article.publishedAt}
              </p>
            </header>

            {/* Abstract */}
            <section className="mt-8 max-w-3xl overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
              <div className="border-b border-[var(--line)] bg-[var(--surface)]/50 px-6 py-3.5">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                  Abstract
                </h2>
              </div>
              <div className="px-6 py-5">
                <p className="text-[15px] leading-[1.75] text-[var(--ink)]">
                  {article.abstract}
                </p>
                {article.keywords.length > 0 && (
                  <div className="mt-5 border-t border-[var(--line)] pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Keywords
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {article.keywords.map((k) => (
                        <span
                          key={k}
                          className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--ink)]"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Body / full article CTA */}
            {article.sections && article.sections.length > 0 ? (
              <div className="mt-8 max-w-3xl space-y-8">
                {article.sections.map((section) => (
                  <section key={section.heading}>
                    <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                      {section.heading}
                    </h2>
                    <p className="mt-3 text-[15px] leading-7 text-[var(--muted)]">
                      {section.body}
                    </p>
                  </section>
                ))}
              </div>
            ) : (
              <section className="mt-8 max-w-3xl rounded-2xl border border-dashed border-[var(--line)] bg-white px-6 py-7">
                <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                  Full article
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
                  This page shows the published abstract and citation details.
                  Download the complete Atlas-formatted PDF for the full text,
                  figures, tables, and references.
                </p>
                {downloadHref ? (
                  <a
                    href={downloadHref}
                    className="btn-primary mt-5 inline-flex text-sm"
                  >
                    Download full article (PDF)
                  </a>
                ) : (
                  <p className="mt-4 text-sm text-amber-800">
                    The PDF is being prepared and will appear here shortly.
                  </p>
                )}
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="h-fit space-y-4 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
              <div className="border-b border-[var(--line)] bg-[var(--accent)] px-5 py-4 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
                  Get the full article
                </p>
                <p className="mt-1 text-sm font-medium leading-snug">
                  Free open-access PDF
                </p>
              </div>
              <div className="p-5">
                <p className="text-xs leading-relaxed text-[var(--muted)]">
                  Download the complete manuscript with figures, tables, and
                  references.
                </p>
                {downloadHref ? (
                  <a
                    href={downloadHref}
                    className="btn-primary mt-4 w-full text-center text-sm"
                  >
                    Download PDF
                  </a>
                ) : (
                  <button
                    type="button"
                    className="btn-primary mt-4 w-full text-sm opacity-50"
                    disabled
                  >
                    PDF unavailable
                  </button>
                )}
                <Link
                  href={`/submissions/new?journal=${article.journalId}`}
                  className="btn-secondary mt-2 w-full text-center text-sm"
                >
                  Submit to this journal
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Article metrics
              </p>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                {(
                  [
                    ["Views", article.views],
                    ["Downloads", article.downloads],
                    ["Citations", article.citations],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl bg-[var(--surface)]/70 px-2 py-3"
                  >
                    <dd className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
                      {formatMetric(value)}
                    </dd>
                    <dt className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                      {label}
                    </dt>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Journal
              </p>
              <Link
                href={`/journals/${article.journalSlug}`}
                className="mt-2 block font-semibold text-[var(--ink)] hover:text-[var(--accent)]"
              >
                {article.journalTitle}
              </Link>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Vol. {article.volume} · Issue {article.issue}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
