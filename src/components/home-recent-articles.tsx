import Image from "next/image";
import Link from "next/link";
import { formatVolumeIssue } from "@/lib/article-preview-image";
import {
  DEFAULT_INDEXED_PLATFORMS,
  DEFAULT_INDEXED_SECTION,
} from "@/lib/home-cms-defaults";
import { authorDisplayName } from "@/lib/orcid";
import { htmlToPlainText } from "@/lib/import-manuscript";

export type RecentArticleCard = {
  id: string;
  slug: string;
  title: string;
  authors: string[];
  abstract: string;
  articleType: string;
  openAccess: boolean;
  publishedAt: string;
  journalTitle: string;
  journalSlug: string;
  volume?: string;
  issue?: string;
  imageUrl?: string | null;
};

export type RecentIndexedPlatform = {
  id?: string;
  name: string;
  blurb: string;
  href: string;
  logoUrl: string;
};

export type RecentIndexedSection = {
  eyebrow?: string | null;
  title: string;
  body?: string | null;
};

type Props = {
  articles: RecentArticleCard[];
  platforms?: RecentIndexedPlatform[];
  indexedSection?: RecentIndexedSection | null;
};

function typeLabel(articleType: string) {
  return (
    (articleType || "Article").replace(/\s+Article$/i, "").trim() || "Article"
  );
}

function Authors({ names, limit = 3 }: { names: string[]; limit?: number }) {
  const label =
    names.slice(0, limit).map(authorDisplayName).join(", ") +
    (names.length > limit ? " et al." : "");
  return (
    <p className="mt-1.5 text-sm font-semibold leading-snug text-[var(--brand-orange)] sm:mt-2 sm:text-base">
      {label}
    </p>
  );
}

function ImageFrame({
  src,
  className,
  sizes,
}: {
  src: string | null | undefined;
  className?: string;
  sizes: string;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-[var(--surface)] ${className ?? ""}`}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          className="object-cover object-center transition duration-700 group-hover:scale-[1.03]"
          sizes={sizes}
          unoptimized
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #1e6847 0%, #0b1f33 55%, #163d32 100%)",
          }}
        />
      )}
    </div>
  );
}

function IndexedAside({
  platforms,
  section,
  className,
}: {
  platforms: RecentIndexedPlatform[];
  section: RecentIndexedSection;
  className?: string;
}) {
  return (
    <aside
      className={className}
      aria-label={section.title || "Where Nahda publications appear"}
      data-aos="fade-up"
      data-aos-delay="100"
      data-aos-duration="700"
    >
      <div className="border-t border-[var(--line)]/80 pt-4 sm:pt-5">
        {section.eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)] sm:text-[11px]">
            {section.eyebrow}
          </p>
        ) : null}
        <h3 className="mt-1 font-[family-name:var(--font-display)] text-lg leading-snug text-[var(--ink)] sm:text-xl">
          {section.title}
        </h3>
        {section.body ? (
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
            {section.body}
          </p>
        ) : null}

        <ul className="mt-4 space-y-2 sm:space-y-2.5">
          {platforms.map((platform, index) => (
            <li key={platform.id ?? `${platform.name}-${index}`}>
              <Link
                href={platform.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3.5 rounded-xl px-1 py-2.5 transition hover:bg-white/70 sm:gap-4 sm:px-2 sm:py-3"
              >
                <span className="flex h-16 w-[4.75rem] shrink-0 items-center justify-center rounded-xl bg-white p-2 ring-1 ring-[var(--line)] sm:h-[4.5rem] sm:w-[5.5rem] sm:p-2.5">
                  <Image
                    src={platform.logoUrl}
                    alt=""
                    width={160}
                    height={88}
                    className="h-10 w-auto max-w-full object-contain sm:h-12"
                    unoptimized
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--accent)] sm:text-base">
                    {platform.name}
                  </span>
                  <span className="mt-0.5 block line-clamp-2 text-xs leading-snug text-[var(--muted)] sm:text-sm">
                    {platform.blurb}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="shrink-0 text-sm font-semibold text-[var(--accent)] opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

/**
 * Featured strip of the newest published papers — sits under the homepage carousel.
 * Desktop: indexed platforms fill the space under the featured paper (not separate cards).
 */
export function HomeRecentArticles({
  articles,
  platforms: platformsProp,
  indexedSection,
}: Props) {
  if (articles.length === 0) return null;

  const [featured, ...rest] = articles;
  const side = rest.slice(0, 2);
  const featuredMeta = [
    featured.journalTitle,
    formatVolumeIssue(featured.volume, featured.issue),
  ]
    .filter(Boolean)
    .join(" · ");

  const platforms =
    platformsProp && platformsProp.length > 0
      ? platformsProp
      : DEFAULT_INDEXED_PLATFORMS.map((p, i) => ({
          id: `default-${i}`,
          name: p.name,
          blurb: p.blurb,
          href: p.href,
          logoUrl: p.logoUrl,
        }));
  const section = indexedSection ?? DEFAULT_INDEXED_SECTION;

  return (
    <section
      className="border-b border-[var(--line)] bg-[var(--accent-soft)]/40"
      aria-label="Recently published articles"
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
        <div
          className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3"
          data-aos="fade-up"
          data-aos-duration="700"
        >
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)] sm:text-xs">
              Just published
            </p>
            <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--ink)] sm:mt-2 sm:text-4xl">
              Most recent papers
            </h2>
            <p className="mt-2 text-base leading-relaxed text-[var(--muted)] sm:mt-3 sm:text-lg">
              The newest open scholarship from the Nahda journal family.
            </p>
          </div>
          <Link
            href="/articles"
            className="shrink-0 self-start text-sm font-semibold text-[var(--accent)] hover:underline sm:self-auto sm:text-base"
            data-aos="fade-up"
            data-aos-delay="80"
          >
            View all articles →
          </Link>
        </div>

        <div className="mt-6 grid items-start gap-4 sm:mt-8 sm:gap-5 lg:grid-cols-[1.35fr_1fr]">
          {/* Featured + platforms (desktop fills height under the paper) */}
          <div className="flex flex-col gap-4 sm:gap-5">
            <Link
              href={`/articles/${featured.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl bg-[var(--ink)] text-white shadow-[0_20px_40px_-24px_rgba(11,31,51,0.55)] transition hover:-translate-y-1 hover:shadow-[0_28px_48px_-20px_rgba(30,104,71,0.45)] sm:rounded-3xl"
              data-aos="fade-up"
              data-aos-delay="60"
              data-aos-duration="800"
            >
              <div className="relative">
                <ImageFrame
                  src={featured.imageUrl}
                  className="h-[160px] w-full bg-[#061018] sm:h-[230px]"
                  sizes="(max-width: 1024px) 100vw, 55vw"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--ink)] to-transparent sm:h-12" />
                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 sm:left-5 sm:top-5 sm:gap-2">
                  <span className="rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white sm:px-3 sm:py-1 sm:text-[11px]">
                    Newest
                  </span>
                  {featured.openAccess ? (
                    <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white sm:px-3 sm:py-1 sm:text-[11px]">
                      Open access
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="relative z-10 flex flex-col px-4 py-3.5 sm:px-6 sm:py-5">
                <p className="line-clamp-2 text-xs font-medium text-emerald-200 sm:line-clamp-none sm:text-sm">
                  {featuredMeta}
                  <span className="text-white/45"> · {featured.publishedAt}</span>
                </p>
                <h3 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug text-white sm:mt-1.5 sm:text-2xl">
                  {featured.title}
                </h3>
                <Authors names={featured.authors} limit={3} />
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/70 sm:mt-2 sm:text-base">
                  {htmlToPlainText(featured.abstract).trim() ||
                    typeLabel(featured.articleType)}
                </p>
                <span className="mt-2.5 inline-flex items-center gap-1 text-sm font-semibold text-emerald-200 group-hover:underline sm:mt-3 sm:text-base">
                  Read paper
                  <span aria-hidden>→</span>
                </span>
              </div>
            </Link>

            {/* Desktop: fill the gap under the featured paper */}
            <IndexedAside
              platforms={platforms}
              section={section}
              className="hidden lg:block"
            />
          </div>

          {/* Next two */}
          <div className="flex flex-col gap-4 sm:gap-5">
            {side.length === 0 ? (
              <div
                className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-white p-5 text-sm text-[var(--muted)] sm:rounded-3xl sm:p-6 sm:text-base"
                data-aos="fade-up"
                data-aos-delay="120"
              >
                More papers will appear here as they are published.
              </div>
            ) : (
              side.map((article, index) => {
                const meta = [
                  article.journalTitle,
                  formatVolumeIssue(article.volume, article.issue),
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <Link
                    key={article.id}
                    href={`/articles/${article.slug}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm transition hover:-translate-y-1 hover:border-[var(--accent)]/30 hover:shadow-md sm:rounded-3xl"
                    data-aos="fade-up"
                    data-aos-delay={String(140 + index * 100)}
                    data-aos-duration="750"
                  >
                    <ImageFrame
                      src={article.imageUrl}
                      className="h-[140px] w-full border-b border-[var(--line)] bg-[#f4f7f5] sm:h-auto sm:aspect-[16/9]"
                      sizes="(max-width: 1024px) 100vw, 380px"
                    />
                    <div className="flex min-w-0 flex-col p-3.5 sm:p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--accent)] sm:text-[11px]">
                          {typeLabel(article.articleType)}
                        </span>
                        <span className="text-xs text-[var(--muted)] sm:text-sm">
                          {article.publishedAt}
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-1 text-xs font-semibold text-[var(--accent)] sm:mt-2 sm:line-clamp-none sm:text-sm">
                        {meta}
                      </p>
                      <h3 className="mt-1 font-[family-name:var(--font-display)] text-base font-semibold leading-snug text-[var(--ink)] group-hover:text-[var(--accent)] sm:text-xl">
                        {article.title}
                      </h3>
                      <Authors names={article.authors} limit={2} />
                      <span className="mt-2.5 text-sm font-semibold text-[var(--accent)] sm:mt-3 sm:text-base">
                        Read more →
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Mobile / tablet: platforms under the paper grid */}
        <IndexedAside
          platforms={platforms}
          section={section}
          className="mt-6 lg:hidden"
        />
      </div>
    </section>
  );
}
