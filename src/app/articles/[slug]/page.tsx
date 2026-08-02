import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getArticleBySlug, getArticlesByJournal } from "@/data/mock";
import { articleDownloadPath } from "@/lib/submission-utils";
import { ArticleMetricsPanel } from "@/components/article-metrics";
import { ArticleKeywords } from "@/components/article-keywords";
import { CiteActions } from "@/components/cite-actions";
import { atlasDoiPath, normalizeDoi } from "@/lib/doi";
import {
  ArticleMasthead,
  type MastheadRecommendation,
} from "@/components/article-masthead";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function doiLinks(doi: string) {
  if (!doi || doi === "Pending") return { local: null };
  const normalized = normalizeDoi(doi);
  return {
    local: atlasDoiPath(normalized),
  };
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

    const related = await prisma.publishedArticle.findMany({
      where: {
        journalId: dbArticle.journalId,
        isActive: true,
        NOT: { id: dbArticle.id },
      },
      orderBy: { publishedAt: "desc" },
      take: 4,
      select: {
        slug: true,
        title: true,
        authors: true,
        articleType: true,
        publishedAt: true,
        journal: { select: { title: true } },
      },
    });

    const recommendations: MastheadRecommendation[] = related.map((r) => ({
      slug: r.slug,
      title: r.title,
      authors: r.authors,
      journalTitle: r.journal.title,
    }));

    const relatedCards: RelatedCard[] = related.map((r) => ({
      slug: r.slug,
      title: r.title,
      authors: r.authors,
      articleType: r.articleType,
      publishedAt: formatDate(r.publishedAt),
    }));

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
      journalShortTitle: dbArticle.journal.shortTitle,
      journalId: dbArticle.journalId,
      logoUrl: dbArticle.coverImageUrl ?? dbArticle.journal.coverImageUrl,
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
      recommendations,
      relatedCards,
    };

    return <ArticleView article={article} />;
  }

  const mock = getArticleBySlug(slug);
  if (!mock) notFound();

  const mockSiblings = getArticlesByJournal(mock.journalSlug).filter(
    (a) => a.slug !== slug,
  );

  const mockRecs: MastheadRecommendation[] = mockSiblings.slice(0, 4).map((a) => ({
    slug: a.slug,
    title: a.title,
    authors: a.authors,
    journalTitle: a.journalTitle,
  }));

  const relatedCards: RelatedCard[] = mockSiblings.slice(0, 4).map((a) => ({
    slug: a.slug,
    title: a.title,
    authors: a.authors,
    articleType: a.articleType,
    publishedAt: a.publishedAt,
  }));

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
        journalShortTitle: undefined,
        journalId: mock.journalId,
        logoUrl: null,
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
        recommendations: mockRecs,
        relatedCards,
      }}
    />
  );
}

type RelatedCard = {
  slug: string;
  title: string;
  authors: string[];
  articleType: string;
  publishedAt: string;
};

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
  journalShortTitle?: string;
  journalId: string;
  logoUrl?: string | null;
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
  recommendations?: MastheadRecommendation[];
  relatedCards?: RelatedCard[];
};

function ArticleView({ article }: { article: ViewArticle }) {
  const downloadHref = article.manuscriptUrl
    ? articleDownloadPath(article.slug)
    : null;
  const { local: doiLocal } = doiLinks(article.doi);
  const citation = `${article.authors[0] ?? "Author"}${
    article.authors.length > 1 ? " et al." : ""
  }. ${article.title}. ${article.journalTitle}. ${article.publishedAt}. DOI: ${article.doi}`;
  const related = article.relatedCards ?? [];
  const hasSections = Boolean(article.sections && article.sections.length > 0);

  return (
    <div className="relative min-h-screen bg-[var(--paper)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,_rgba(15,107,106,0.08),_transparent_55%)]"
        aria-hidden
      />

      <div className="relative border-b border-[var(--line)]/80 bg-white/90 backdrop-blur-sm">
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
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-b-2xl bg-white shadow-[0_18px_50px_-28px_rgba(11,31,51,0.35)] ring-1 ring-[var(--line)]">
          <ArticleMasthead
            journalTitle={article.journalTitle}
            journalSlug={article.journalSlug}
            journalShortTitle={article.journalShortTitle}
            logoUrl={article.logoUrl}
            articleType={article.articleType}
            openAccess={article.openAccess}
            license={article.license}
            title={article.title}
            authors={article.authors}
            affiliations={article.affiliations}
            doi={article.doi}
            volume={article.volume}
            issue={article.issue}
            pages={article.pages}
            publishedAt={article.publishedAt}
            receivedAt={article.receivedAt}
            acceptedAt={article.acceptedAt}
            views={article.views}
            downloads={article.downloads}
            citations={article.citations}
            readMoreHref={downloadHref}
            recommendations={article.recommendations}
            embedded
          />

          <div className="grid gap-0 border-t border-[var(--line)] lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 px-4 py-6 sm:px-8 sm:py-10" id="article-content">
              {/* On-page outline for HTML bodies */}
              {hasSections ? (
                <nav
                  aria-label="On this page"
                  className="mb-8 rounded-xl bg-[var(--surface)]/70 px-4 py-3.5"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                    On this page
                  </p>
                  <ol className="mt-2 space-y-1.5">
                    <li>
                      <a
                        href="#abstract"
                        className="text-[13px] text-[var(--ink)] hover:text-[var(--accent)]"
                      >
                        Abstract
                      </a>
                    </li>
                    {article.sections!.map((section) => {
                      const id = sectionAnchor(section.heading);
                      return (
                        <li key={section.heading}>
                          <a
                            href={`#${id}`}
                            className="text-[13px] text-[var(--ink)] hover:text-[var(--accent)]"
                          >
                            {section.heading}
                          </a>
                        </li>
                      );
                    })}
                  </ol>
                </nav>
              ) : null}

              <section id="abstract">
                <div className="flex items-center gap-3">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                    Abstract
                  </h2>
                  <div className="h-px flex-1 bg-[var(--line)]" />
                </div>
                <p className="mt-4 text-[15px] leading-[1.75] text-[var(--ink)] sm:text-[16px] sm:leading-[1.8] first-letter:mr-2 first-letter:font-[family-name:var(--font-display)] first-letter:text-[2rem] first-letter:font-semibold first-letter:leading-[0.85] first-letter:text-[var(--accent)] max-sm:first-letter:float-none sm:first-letter:float-left sm:first-letter:text-[2.75rem]">
                  {article.abstract}
                </p>
              </section>

              {article.keywords.length > 0 ? (
                <ArticleKeywords keywords={article.keywords} className="mt-7" />
              ) : null}

              {hasSections ? (
                <div className="mt-10 space-y-10">
                  {article.sections!.map((section) => {
                    const id = sectionAnchor(section.heading);
                    return (
                      <section key={section.heading} id={id} className="scroll-mt-24">
                        <h2 className="font-[family-name:var(--font-display)] text-[1.35rem] font-semibold tracking-tight text-[var(--ink)] sm:text-[1.5rem]">
                          {section.heading}
                        </h2>
                        <p className="mt-3 text-[15px] leading-[1.85] text-[var(--ink)]/85">
                          {section.body}
                        </p>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <section
                  id="full-article"
                  className="mt-10 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,var(--accent-soft),white_55%)] ring-1 ring-[var(--line)]"
                >
                  <div className="px-6 py-7 sm:px-7">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                      Full text
                    </p>
                    <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl text-[var(--ink)] sm:text-2xl">
                      Read the complete manuscript
                    </h2>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
                      This page presents the abstract and citation details.
                      Download the Nahda-formatted PDF for figures, tables,
                      methods, and references.
                    </p>
                    {downloadHref ? (
                      <a
                        href={downloadHref}
                        className="btn-primary mt-5 inline-flex gap-2 text-sm"
                      >
                        <PdfIcon />
                        Download full article (PDF)
                      </a>
                    ) : (
                      <p className="mt-4 inline-flex rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
                        The PDF is being prepared and will appear here shortly.
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* Citation footer */}
              <section className="mt-12 rounded-xl bg-[var(--ink)] px-4 py-5 text-white sm:px-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
                  How to cite
                </p>
                <p className="mt-2 break-words text-[13px] leading-relaxed text-white/90">
                  {citation}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {doiLocal ? (
                    <a
                      href={doiLocal}
                      className="max-w-full break-all rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                    >
                      {normalizeDoi(article.doi)}
                    </a>
                  ) : null}
                  <span className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80">
                    {article.license}
                    {article.openAccess ? " · Open Access" : ""}
                  </span>
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <aside className="border-t border-[var(--line)] bg-[var(--surface)]/40 px-4 py-6 sm:px-6 sm:py-8 lg:border-l lg:border-t-0">
              <div className="space-y-5 lg:sticky lg:top-24">
                <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[var(--line)]">
                  <div className="bg-[var(--accent)] px-5 py-4 text-white">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">
                      Get the full article
                    </p>
                    <p className="mt-1 text-sm font-medium leading-snug">
                      {article.openAccess
                        ? "Free open-access PDF"
                        : "Download the manuscript"}
                    </p>
                  </div>
                  <div className="p-5">
                    <p className="text-xs leading-relaxed text-[var(--muted)]">
                      Includes figures, tables, and references in the Nahda
                      article format.
                    </p>
                    {downloadHref ? (
                      <a
                        href={downloadHref}
                        className="btn-primary mt-4 w-full gap-2 text-center text-sm"
                      >
                        <PdfIcon />
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

                <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-[var(--accent-soft)]/80 to-white shadow-sm ring-1 ring-[var(--accent)]/20">
                  <div className="border-b border-[var(--accent)]/15 px-5 py-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                      Cite this article
                    </p>
                  </div>
                  <div className="p-5">
                    <p className="rounded-xl bg-white/80 px-3.5 py-3 text-[12px] leading-relaxed text-[var(--ink)] ring-1 ring-[var(--line)]">
                      {citation}
                    </p>
                    <div className="mt-4">
                      <CiteActions
                        citation={citation}
                        doiHref={doiLocal}
                        doiLabel={
                          article.doi && article.doi !== "Pending"
                            ? normalizeDoi(article.doi)
                            : null
                        }
                      />
                    </div>
                  </div>
                </div>

                <div
                  id="article-metrics"
                  className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[var(--line)]"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    Article metrics
                  </p>
                  <ArticleMetricsPanel
                    className="mt-4"
                    views={article.views}
                    downloads={article.downloads}
                    citations={article.citations}
                  />
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[var(--line)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    Publication history
                  </p>
                  <ol className="mt-4 space-y-3">
                    {(
                      [
                        ["Received", article.receivedAt],
                        ["Accepted", article.acceptedAt],
                        ["Published", article.publishedAt],
                      ] as const
                    ).map(([label, value], i, arr) => (
                      <li key={label} className="relative flex gap-3 pl-1">
                        <span className="relative mt-1.5 flex flex-col items-center">
                          <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                          {i < arr.length - 1 ? (
                            <span className="mt-1 w-px flex-1 bg-[var(--line)]" />
                          ) : null}
                        </span>
                        <div className="pb-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                            {label}
                          </p>
                          <p className="text-sm text-[var(--ink)]">{value}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[var(--line)]">
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
                    {article.pages !== "—" ? ` · pp. ${article.pages}` : ""}
                  </p>
                  <Link
                    href={`/journals/${article.journalSlug}`}
                    className="mt-3 inline-flex text-xs font-semibold text-[var(--accent)] hover:underline"
                  >
                    Browse issue →
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {related.length > 0 ? (
          <section className="py-12 sm:py-14">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                  Recommended
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
                  More from this journal
                </h2>
              </div>
              <Link
                href={`/journals/${article.journalSlug}`}
                className="hidden text-sm font-semibold text-[var(--accent)] hover:underline sm:inline"
              >
                View all →
              </Link>
            </div>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {related.map((rec) => (
                <li key={rec.slug}>
                  <Link
                    href={`/articles/${rec.slug}`}
                    className="group block h-full rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[var(--line)] transition hover:-translate-y-0.5 hover:shadow-md hover:ring-[var(--accent)]/30"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                      {rec.articleType}
                    </p>
                    <h3 className="mt-2 font-semibold leading-snug text-[var(--ink)] group-hover:text-[var(--accent)]">
                      {rec.title}
                    </h3>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {rec.authors.slice(0, 2).join(", ")}
                      {rec.authors.length > 2 ? " et al." : ""}
                      {" · "}
                      {rec.publishedAt}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <div className="h-10" />
        )}
      </div>
    </div>
  );
}

function sectionAnchor(heading: string) {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function PdfIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="currentColor"
      aria-hidden
    >
      <path d="M4 0h5.5L14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2Zm5 1v3.5H13L9 1ZM5 8.5h1.2c.9 0 1.5.5 1.5 1.25S7.1 11 6.2 11H5.5v1.5H4.2V8.5H5Zm1.2 1.7c.3 0 .5-.15.5-.45s-.2-.45-.5-.45H5.5v.9h.7ZM8.6 8.5h1.55c1.1 0 1.85.7 1.85 1.75S11.25 12 10.15 12H8.6V8.5Zm1.5 2.55c.45 0 .75-.3.75-.8s-.3-.8-.75-.8h-.7v1.6h.7ZM4.2 13.5h7.6V14H4.2v-.5Z" />
    </svg>
  );
}
