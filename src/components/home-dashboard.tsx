import Link from "next/link";
import { formatMetric } from "@/components/article-metrics";
import { HomeGreeting } from "@/components/home-greeting";
import { journalCardColor } from "@/lib/journal-colors";
import { authorDisplayName } from "@/lib/orcid";
import { articleDownloadPath } from "@/lib/submission-utils";

export type HomeArticle = {
  id: string;
  slug: string;
  title: string;
  authors: string[];
  articleType: string;
  openAccess: boolean;
  journalTitle: string;
  journalSlug: string;
  journalShortTitle: string;
  coverImageUrl: string | null;
  coverColor: string;
  publishedAt: string;
  doi?: string | null;
  hasPdf?: boolean;
};

export type HomeAnnouncement = {
  id: string;
  title: string;
  summary: string;
  href: string | null;
  publishedAt: string;
};

type Stats = {
  articleCount: number;
  journalCount: number;
  totalViews: number;
  totalDownloads: number;
};

type Props = {
  articles: HomeArticle[];
  announcements: HomeAnnouncement[];
  stats: Stats | null;
  q: string;
};

export function HomeDashboard({ articles, announcements, stats, q }: Props) {
  const featured = q ? [] : articles.slice(0, 6);
  const catalog = articles;

  return (
    <div className="bg-[var(--paper)]">
      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 sm:pt-8">
        <HomeGreeting />

        {stats ? (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            <StatCard label="Papers" value={formatMetric(stats.articleCount)} />
            <StatCard
              label="Journals"
              value={formatMetric(stats.journalCount)}
            />
            <StatCard label="Views" value={formatMetric(stats.totalViews)} />
          </div>
        ) : null}
      </div>

      {featured.length > 0 ? (
        <section className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
          <SectionHead kicker="Featured" title="Latest papers" href="/articles" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {featured.map((article, i) => (
              <ProductCard key={article.id} article={article} index={i} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
        <SectionHead
          kicker={q ? "Search" : "Catalog"}
          title={q ? `Results for “${q}”` : "All papers"}
          href="/articles"
        />
        <ProductTable
          articles={catalog}
          empty={
            q ? "No papers match that search." : "No published articles yet."
          }
        />
      </section>

      {!q && announcements.length > 0 ? (
        <section className="mx-auto mt-8 max-w-6xl px-4 pb-10 sm:px-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Announcements
          </h2>
          <ul className="mt-3 divide-y divide-[var(--line)] overflow-hidden rounded-2xl bg-white ring-1 ring-[var(--line)]">
            {announcements.map((a) => (
              <li key={a.id} className="px-4 py-3">
                {a.href ? (
                  <Link href={a.href} className="block">
                    <AnnouncementBody item={a} />
                  </Link>
                ) : (
                  <AnnouncementBody item={a} />
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="h-8" />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-3 shadow-sm ring-1 ring-[var(--line)] sm:px-4 sm:py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)] sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

function SectionHead({
  kicker,
  title,
  href,
}: {
  kicker: string;
  title: string;
  href: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          {kicker}
        </p>
        <h2 className="mt-0.5 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
          {title}
        </h2>
      </div>
      <Link
        href={href}
        className="text-sm font-semibold text-[var(--accent)] hover:underline"
      >
        See all
      </Link>
    </div>
  );
}

function ProductCard({
  article,
  index,
}: {
  article: HomeArticle;
  index: number;
}) {
  const color = journalCardColor(article.coverColor, index);

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[var(--line)] transition hover:-translate-y-0.5 hover:shadow-md">
      <Link
        href={`/articles/${article.slug}`}
        className="relative flex aspect-[3/4] items-center justify-center overflow-hidden text-[11px] font-bold uppercase tracking-wide text-white"
        style={
          article.coverImageUrl
            ? { background: "#eef1f4" }
            : { background: color }
        }
      >
        {article.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.coverImageUrl}
            alt=""
            className="h-full w-full object-contain p-2"
          />
        ) : (
          article.journalShortTitle.slice(0, 6)
        )}
      </Link>
      <div className="flex min-h-[4.5rem] flex-1 flex-col p-2.5">
        <Link
          href={`/articles/${article.slug}`}
          className="line-clamp-3 text-[12px] font-semibold leading-snug text-[var(--ink)] hover:text-[var(--accent)]"
        >
          {article.title}
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="truncate text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
            {article.journalShortTitle}
          </span>
          {article.hasPdf ? (
            <a
              href={articleDownloadPath(article.slug)}
              className="shrink-0 text-[10px] font-semibold text-[var(--accent)] hover:underline"
            >
              PDF
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ProductTable({
  articles,
  empty,
}: {
  articles: HomeArticle[];
  empty: string;
}) {
  if (articles.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-5 text-sm text-[var(--muted)] ring-1 ring-[var(--line)]">
        {empty}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-[var(--line)]">
      <table className="w-full table-fixed border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--line)] bg-[var(--surface)]/80 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            <th className="px-3 py-2.5 sm:w-[52%] sm:px-4">Paper</th>
            <th className="hidden px-3 py-2.5 sm:table-cell sm:w-[22%]">
              Journal
            </th>
            <th className="hidden px-3 py-2.5 sm:table-cell">Date</th>
            <th className="w-[4.5rem] px-2 py-2.5 text-right sm:w-28">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article, i) => (
            <ProductRow key={article.id} article={article} index={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductRow({
  article,
  index,
}: {
  article: HomeArticle;
  index: number;
}) {
  const color = journalCardColor(article.coverColor, index);
  const authors = article.authors
    .slice(0, 2)
    .map(authorDisplayName)
    .join(", ");

  return (
    <tr className="border-b border-[var(--line)] last:border-b-0">
      <td className="px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-[8px] font-bold uppercase tracking-wide text-white"
            style={
              article.coverImageUrl
                ? { background: "#f4f6f8" }
                : { background: color }
            }
          >
            {article.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.coverImageUrl}
                alt=""
                className="h-full w-full object-contain p-1"
              />
            ) : (
              article.journalShortTitle.slice(0, 4)
            )}
          </span>
          <div className="min-w-0">
            <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--ink)]">
              {article.title}
            </p>
            <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--muted)]">
              {article.journalShortTitle}
              {authors ? ` · ${authors}` : ""}
              {article.authors.length > 2 ? " et al." : ""}
              <span className="sm:hidden"> · {article.publishedAt}</span>
            </p>
          </div>
        </div>
      </td>
      <td className="hidden px-3 py-2.5 text-sm text-[var(--ink)] sm:table-cell">
        {article.journalShortTitle}
      </td>
      <td className="hidden whitespace-nowrap px-3 py-2.5 text-sm text-[var(--muted)] sm:table-cell">
        {article.publishedAt}
      </td>
      <td className="px-2 py-2.5 text-right">
        <div className="flex items-center justify-end gap-2">
          {article.hasPdf ? (
            <a
              href={articleDownloadPath(article.slug)}
              className="text-xs font-semibold text-[var(--ink)] hover:text-[var(--accent)]"
            >
              PDF
            </a>
          ) : null}
          <Link
            href={`/articles/${article.slug}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-lg font-semibold leading-none text-white"
            aria-label={`Read ${article.title}`}
          >
            +
          </Link>
        </div>
      </td>
    </tr>
  );
}

function AnnouncementBody({ item }: { item: HomeAnnouncement }) {
  return (
    <>
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
        {item.publishedAt}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-[var(--ink)]">
        {item.title}
      </p>
      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--muted)]">
        {item.summary}
      </p>
    </>
  );
}
