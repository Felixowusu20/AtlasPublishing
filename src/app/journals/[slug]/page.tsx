import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getBoardByJournal,
  getIssuesByJournal,
} from "@/data/mock";
import { prisma } from "@/lib/db";
import { journalColorFromKey } from "@/lib/journal-colors";

export const dynamic = "force-dynamic";

const tabs = [
  { id: "about", label: "About" },
  { id: "current", label: "Current issue" },
  { id: "archives", label: "Archives" },
  { id: "board", label: "Editorial board" },
  { id: "submit", label: "Submit" },
] as const;

type TabId = (typeof tabs)[number]["id"];

function reviewTypeLabel(value: string) {
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
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
        where: { journalId: journal.id, isActive: true },
        orderBy: { publishedAt: "desc" },
        take: 30,
      });
    }
  } catch {
    journal = null;
  }

  if (!journal || !journal.isActive) notFound();

  const tab = (tabs.some((t) => t.id === rawTab) ? rawTab : "about") as TabId;
  const cover = journalColorFromKey(journal.slug, journal.coverColor);
  const issues = getIssuesByJournal(slug);
  const board = getBoardByJournal(slug);
  const currentIssue = issues.find((i) => i.isCurrent) ?? issues[0];

  return (
    <div>
      <section
        className="border-b border-[var(--line)] text-white"
        style={{ background: cover }}
      >
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <Link
            href="/journals"
            className="text-sm text-white/70 hover:text-white"
          >
            ← All journals
          </Link>
          <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-white/70">{journal.shortTitle}</p>
              <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
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
                ? `${currentIssue.articleCount} articles, Published ${currentIssue.publishedAt}`
                : "Latest published articles for this journal"}
            </p>
            <div className="mt-6 space-y-3">
              {articles.length === 0 && (
                <p className="text-sm text-[var(--muted)]">
                  No articles in the current issue yet. Publish them from Admin →
                  Latest articles.
                </p>
              )}
              {articles.map((a) => (
                <Link
                  key={a.id}
                  href={`/articles/${a.slug}`}
                  className="block card p-5 hover:border-[var(--accent)]/40"
                >
                  <p className="text-xs font-medium text-[var(--accent)]">
                    {a.articleType}
                    {a.openAccess ? ", Open Access" : ""}
                  </p>
                  <h3 className="mt-1 font-semibold text-[var(--ink)]">
                    {a.title}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {a.authors.join(", ")}
                    {a.pages ? `, pp. ${a.pages}` : ""}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {tab === "archives" && (
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              Archives
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Browse volumes and issues.
            </p>
            <div className="mt-6 space-y-2">
              {issues.length === 0 && (
                <p className="text-sm text-[var(--muted)]">
                  No archived issues listed yet.
                </p>
              )}
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="card flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-[var(--ink)]">{issue.title}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {issue.articleCount} articles, {issue.publishedAt}
                      {issue.isCurrent ? ", Current" : ""}
                    </p>
                  </div>
                  <Link
                    href={`/journals/${slug}?tab=current`}
                    className="text-sm font-semibold text-[var(--accent)]"
                  >
                    View articles
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
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {board.length === 0 && (
                <p className="text-sm text-[var(--muted)]">
                  Editorial board details will appear here.
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
              Submit to {journal.shortTitle}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              Use the submission wizard to enter metadata, authors, statements,
              and files. APC for this journal:{" "}
              <strong>{journal.apc ?? "—"}</strong>. Review model:{" "}
              <strong>{reviewTypeLabel(journal.reviewType)}</strong>.
            </p>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
              <li>Read author guidelines before uploading</li>
              <li>Include ORCID for the corresponding author</li>
              <li>Prepare cover letter and ethics / COI statements</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/submissions/new?journal=${journal.id}`}
                className="btn-primary"
              >
                Start submission
              </Link>
              <Link href="/authors/guidelines" className="btn-secondary">
                Author guidelines
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
