import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleListingCard } from "@/components/article-listing-card";
import { JsonLd } from "@/components/json-ld";
import { getBoardByJournal } from "@/data/mock";
import { prisma } from "@/lib/db";
import { journalColorFromKey } from "@/lib/journal-colors";
import { issueKey } from "@/lib/seo/article-seo";
import { periodicalJsonLd } from "@/lib/seo/jsonld";
import { buildJournalMetadata } from "@/lib/seo/scholar";

export const dynamic = "force-dynamic";

const tabs = [
  { id: "about", label: "About" },
  { id: "current", label: "Current issue" },
  { id: "archives", label: "Archives" },
  { id: "board", label: "Editorial board" },
  { id: "submit", label: "Author guidelines" },
] as const;

type TabId = (typeof tabs)[number]["id"];

function reviewTypeLabel(value: string) {
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const journal = await prisma.journal.findUnique({ where: { slug } });
    if (journal?.isActive) {
      return buildJournalMetadata({
        title: journal.title,
        shortTitle: journal.shortTitle,
        slug: journal.slug,
        description: journal.description,
        issn: journal.issn,
        eIssn: journal.eIssn,
        coverImageUrl: journal.coverImageUrl,
      });
    }
  } catch (err) {
    console.error("[journal-metadata]", err);
  }
  return { title: "Journal | Nahda Publications" };
}

export default async function JournalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab: rawTab } = await searchParams;

  let journal = null;
  let articles: Awaited<ReturnType<typeof prisma.publishedArticle.findMany>> =
    [];
  try {
    journal = await prisma.journal.findUnique({ where: { slug } });
    if (journal) {
      articles = await prisma.publishedArticle.findMany({
        where: { journalId: journal.id, isActive: true, deletedAt: null },
        orderBy: { publishedAt: "desc" },
        take: 50,
      });
    }
  } catch {
    journal = null;
  }

  if (!journal || !journal.isActive) notFound();

  const tab = (tabs.some((t) => t.id === rawTab) ? rawTab : "about") as TabId;
  const cover = journalColorFromKey(journal.slug, journal.coverColor);
  const board = getBoardByJournal(slug);

  // Derive published issues from real article volume/issue fields
  const issueMap = new Map<
    string,
    {
      key: string;
      volume: string | null;
      issue: string | null;
      count: number;
      latest: Date;
      title: string;
    }
  >();
  for (const a of articles) {
    const key = issueKey(a.volume, a.issue);
    const existing = issueMap.get(key);
    const title =
      key === "early-view"
        ? "Early View"
        : [
            a.volume && a.volume !== "—" ? `Vol. ${a.volume}` : null,
            a.issue && a.issue !== "—" ? `Issue ${a.issue}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Issue";
    if (!existing) {
      issueMap.set(key, {
        key,
        volume: a.volume,
        issue: a.issue,
        count: 1,
        latest: a.publishedAt,
        title,
      });
    } else {
      existing.count += 1;
      if (a.publishedAt > existing.latest) existing.latest = a.publishedAt;
    }
  }
  const issues = [...issueMap.values()].sort(
    (a, b) => b.latest.getTime() - a.latest.getTime(),
  );
  const currentIssue = issues[0];
  const currentArticles = currentIssue
    ? articles.filter(
        (a) => issueKey(a.volume, a.issue) === currentIssue.key,
      )
    : articles;

  return (
    <div>
      <JsonLd
        data={periodicalJsonLd({
          title: journal.title,
          slug: journal.slug,
          description: journal.description,
          issn: journal.issn,
          eIssn: journal.eIssn,
          editorInChief: journal.editorInChief,
        })}
      />
      <section
        className="border-b border-[var(--line)] text-white"
        style={{ background: cover }}
      >
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <Link
            href="/journals"
            className="text-sm text-white/70 hover:text-white"
          >
            ← All journals
          </Link>
          <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              {journal.coverImageUrl ? (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/95 p-1.5 shadow-sm sm:h-20 sm:w-20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={journal.coverImageUrl}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : null}
              <div className="min-w-0">
                <p className="text-sm font-medium uppercase tracking-wider text-white/70">
                  {journal.shortTitle}
                </p>
                <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-tight sm:text-3xl lg:text-4xl">
                  {journal.title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80">
                  {journal.description}
                </p>
                <p className="mt-3 text-xs text-white/60">
                  {journal.issn ? `ISSN ${journal.issn}` : null}
                  {journal.eIssn ? `, eISSN ${journal.eIssn}` : null}
                  {journal.issn || journal.eIssn ? ", " : ""}
                  {journal.openAccess ? "Open Access" : "Subscription"}
                  {journal.foundedYear ? `, Founded ${journal.foundedYear}` : ""}
                </p>
              </div>
            </div>
            <Link
              href={`/submissions/new?journal=${journal.id}`}
              className="inline-flex w-fit rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)]"
            >
              Submit to this journal
            </Link>
          </div>
        </div>
      </section>

      <div className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={`/journals/${slug}?tab=${t.id}`}
              className={`shrink-0 border-b-2 px-4 py-3.5 text-sm font-medium ${
                tab === t.id
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {tab === "about" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="card p-6">
                <h2 className="font-[family-name:var(--font-display)] text-xl">
                  Aims & scope
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                  {journal.aims || journal.description}
                </p>
                {journal.subjects.length > 0 && (
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
                )}
              </div>
              <div className="card p-6">
                <h2 className="font-[family-name:var(--font-display)] text-xl">
                  Peer review
                </h2>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  This journal uses{" "}
                  <strong>{reviewTypeLabel(journal.reviewType)}</strong> peer
                  review.
                  {journal.avgReviewDays
                    ? ` Average time to first decision is about ${journal.avgReviewDays} days.`
                    : ""}
                  {journal.acceptanceRate
                    ? ` Acceptance rate: ${journal.acceptanceRate}.`
                    : ""}
                </p>
              </div>
            </div>
            <aside className="space-y-3">
              {(
                [
                  ["Impact factor", journal.impactFactor ?? "N/A"],
                  ["APC", journal.apc ?? "—"],
                  ["Frequency", journal.frequency ?? "—"],
                  ["DOI prefix", journal.doiPrefix ?? "—"],
                  ["Editor-in-Chief", journal.editorInChief ?? "—"],
                  [
                    "ISSN",
                    [journal.issn, journal.eIssn ? `eISSN ${journal.eIssn}` : null]
                      .filter(Boolean)
                      .join(" · ") || "—",
                  ],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="card px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
                    {k}
                  </p>
                  <p className="mt-1 text-sm font-medium">{v}</p>
                </div>
              ))}
              {journal.indexedIn.length > 0 && (
                <div className="card px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
                    Indexed in
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {journal.indexedIn.map((i) => (
                      <span
                        key={i}
                        className="rounded bg-[var(--surface)] px-2 py-0.5 text-xs"
                      >
                        {i}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}

        {tab === "current" && (
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              {currentIssue?.title ?? "Current issue"}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {currentIssue
                ? `${currentIssue.count} articles · Updated ${currentIssue.latest.toISOString().slice(0, 10)}`
                : "Latest published articles for this journal"}
            </p>
            <div className="mt-6 space-y-4">
              {currentArticles.length === 0 && (
                <p className="text-sm text-[var(--muted)]">
                  No articles in the current issue yet.
                </p>
              )}
              {currentArticles.map((a) => (
                <ArticleListingCard
                  key={a.id}
                  compact
                  article={{
                    slug: a.slug,
                    title: a.title,
                    authors: a.authors,
                    abstract: a.abstract,
                    articleType: a.articleType,
                    openAccess: a.openAccess,
                    doi: a.doi,
                    publishedAt: a.publishedAt.toISOString().slice(0, 10),
                    journalTitle: journal.title,
                    journalSlug: journal.slug,
                    volume: a.volume ?? undefined,
                    issue: a.issue ?? undefined,
                    views: a.views,
                    downloads: a.downloads,
                    keywords: a.keywords,
                    hasPdf: Boolean(a.manuscriptUrl),
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {tab === "archives" && (
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              Published issues
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Browse volumes and issues published in this journal.
            </p>
            <div className="mt-6 space-y-2">
              {issues.length === 0 && (
                <p className="text-sm text-[var(--muted)]">
                  No archived issues listed yet.
                </p>
              )}
              {issues.map((issue, index) => (
                <div
                  key={issue.key}
                  className="card flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-[var(--ink)]">
                      {issue.title}
                      {index === 0 ? (
                        <span className="ml-2 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--accent)]">
                          Current
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {issue.count} articles ·{" "}
                      {issue.latest.toISOString().slice(0, 10)}
                    </p>
                  </div>
                  <Link
                    href={`/journals/${slug}/issues/${issue.key}`}
                    className="text-sm font-semibold text-[var(--accent)]"
                  >
                    View articles →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "board" && (
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              Editorial board
            </h2>
            {journal.editorInChief ? (
              <div className="card mt-6 p-5">
                <p className="font-semibold text-[var(--ink)]">
                  {journal.editorInChief}
                </p>
                <p className="mt-1 text-sm text-[var(--accent)]">
                  Editor-in-Chief
                </p>
              </div>
            ) : null}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {board.length === 0 && !journal.editorInChief && (
                <p className="text-sm text-[var(--muted)]">
                  Editorial board details will appear here. Contact the editorial
                  office to update this section.
                </p>
              )}
              {board.map((m) => (
                <div key={m.name + m.role} className="card p-5">
                  <p className="font-semibold text-[var(--ink)]">{m.name}</p>
                  <p className="mt-1 text-sm text-[var(--accent)]">{m.role}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {m.affiliation}, {m.country}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "submit" && (
          <div className="card max-w-2xl p-6">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              Author guidelines — {journal.shortTitle}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              Use the submission wizard to enter metadata, authors, statements,
              and files. APC for this journal:{" "}
              <strong>{journal.apc ?? "—"}</strong>. Review model:{" "}
              <strong>{reviewTypeLabel(journal.reviewType)}</strong>.
            </p>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
              <li>Read author guidelines before uploading</li>
              <li>Include ORCID for the corresponding author when available</li>
              <li>Prepare cover letter and ethics / COI statements</li>
              <li>Ensure the manuscript meets journal scope and formatting</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/submissions/new?journal=${journal.id}`}
                className="btn-primary"
              >
                Start submission
              </Link>
              <Link href="/authors/guidelines" className="btn-secondary">
                Full author guidelines
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
