import Link from "next/link";

export type NewsStoryCardData = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  imageUrl?: string | null;
  publisher?: string | null;
  topics?: string[];
  publishedAt: string | Date;
};

function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function NewsStoryCard({
  story,
  featured = false,
}: {
  story: NewsStoryCardData;
  featured?: boolean;
}) {
  const dateLabel = formatDate(story.publishedAt);
  const topics = (story.topics ?? []).slice(0, 3);

  if (featured) {
    return (
      <Link
        href={`/news/${story.slug}`}
        className="group grid overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-white shadow-[0_18px_50px_-36px_rgba(11,31,51,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_-34px_rgba(11,31,51,0.6)] lg:grid-cols-[1.15fr_0.85fr]"
      >
        <div className="relative min-h-[220px] overflow-hidden bg-[var(--ink)] sm:min-h-[280px]">
          {story.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={story.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)] via-[#163d32] to-[var(--ink)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/75 via-[var(--ink)]/15 to-transparent" />
          <p className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">
            Featured
          </p>
        </div>
        <div className="flex flex-col justify-center p-6 sm:p-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
            {[dateLabel, story.publisher].filter(Boolean).join(" · ")}
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl leading-snug text-[var(--ink)] transition group-hover:text-[var(--accent)] sm:text-3xl">
            {story.title}
          </h2>
          <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            {story.summary}
          </p>
          {topics.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {topics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]"
                >
                  {topic}
                </span>
              ))}
            </div>
          ) : null}
          <span className="mt-6 text-sm font-semibold text-[var(--accent)]">
            Read story →
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/news/${story.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_12px_36px_-28px_rgba(11,31,51,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-28px_rgba(11,31,51,0.5)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--surface)]">
        {story.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.imageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-end bg-gradient-to-br from-[var(--accent)] to-[var(--ink)] p-4">
            <p className="font-[family-name:var(--font-display)] text-lg text-white">
              Nahda News
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
          {[dateLabel, story.publisher].filter(Boolean).join(" · ")}
        </p>
        <h3 className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug text-[var(--ink)] transition group-hover:text-[var(--accent)]">
          {story.title}
        </h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-[var(--muted)]">
          {story.summary}
        </p>
        {topics.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]"
              >
                {topic}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
