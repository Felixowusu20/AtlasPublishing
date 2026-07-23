import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { journalColorFromKey } from "@/lib/journal-colors";

export const dynamic = "force-dynamic";

const tabs = [
  { id: "about", label: "About" },
  { id: "articles", label: "Articles" },
  { id: "submit", label: "Submit" },
] as const;

type TabId = (typeof tabs)[number]["id"];

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
  let articles: Awaited<ReturnType<typeof prisma.publishedArticle.findMany>> = [];
  try {
    journal = await prisma.journal.findUnique({ where: { slug } });
    if (journal) {
      articles = await prisma.publishedArticle.findMany({
        where: { journalId: journal.id, isActive: true },
        orderBy: { publishedAt: "desc" },
        take: 20,
      });
    }
  } catch {
    journal = null;
  }

  if (!journal || !journal.isActive) notFound();

  const tab = (tabs.some((t) => t.id === rawTab) ? rawTab : "about") as TabId;
  const cover = journalColorFromKey(journal.slug, journal.coverColor);

  return (
    <div>
      <section
        className="border-b border-[var(--line)] text-white"
        style={{ background: cover }}
      >
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
            {journal.shortTitle}
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
            {journal.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/80">{journal.description}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/80">
            {journal.issn && <span>ISSN {journal.issn}</span>}
            {journal.frequency && <span>{journal.frequency}</span>}
            <span>{journal.openAccess ? "Open Access" : "Subscription"}</span>
            {journal.editorInChief && <span>EiC {journal.editorInChief}</span>}
          </div>
        </div>
      </section>

      <div className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={`/journals/${journal.slug}?tab=${t.id}`}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${
                tab === t.id
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-[var(--muted)]"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {tab === "about" && (
          <div className="max-w-3xl space-y-4 text-sm leading-relaxed text-[var(--muted)]">
            <p>{journal.aims || journal.description}</p>
            {journal.subjects.length > 0 && (
              <p>
                <span className="font-semibold text-[var(--ink)]">Subjects:</span>{" "}
                {journal.subjects.join(", ")}
              </p>
            )}
          </div>
        )}

        {tab === "articles" && (
          <div className="space-y-3">
            {articles.length === 0 && (
              <p className="text-sm text-[var(--muted)]">No articles published yet.</p>
            )}
            {articles.map((a) => (
              <Link
                key={a.id}
                href={`/articles/${a.slug}`}
                className="block card p-4 hover:border-[var(--accent)]/40"
              >
                <p className="text-xs text-[var(--accent)]">{a.articleType}</p>
                <h2 className="mt-1 font-semibold">{a.title}</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {a.authors.join(", ")}
                </p>
              </Link>
            ))}
          </div>
        )}

        {tab === "submit" && (
          <div className="max-w-xl">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              Submit to {journal.shortTitle}
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Start a guided submission. Reviewers will pick it up from the admin
              inbox and send feedback to your dashboard and email.
            </p>
            <Link href="/submissions/new" className="btn-primary mt-6 inline-flex">
              Start submission
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
