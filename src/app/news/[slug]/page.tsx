import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewsStoryCard } from "@/components/news-story-card";
import { prisma } from "@/lib/db";
import { ensureFreshFreeNews } from "@/lib/sync-freenews";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const story = await prisma.newsStory.findFirst({
      where: { slug, isActive: true },
      select: { title: true, summary: true, imageUrl: true },
    });
    if (!story) return { title: "News | Nahda Publications" };
    return {
      title: `${story.title} | Nahda Publications`,
      description: story.summary.slice(0, 160),
      openGraph: story.imageUrl
        ? { images: [{ url: story.imageUrl }] }
        : undefined,
    };
  } catch {
    return { title: "News | Nahda Publications" };
  }
}

export default async function NewsStoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await ensureFreshFreeNews({ maxAgeMinutes: 120 }).catch(() => undefined);

  const story = await prisma.newsStory.findFirst({
    where: { slug, isActive: true },
  });
  if (!story) notFound();

  const paragraphs = story.body
    .split(/\n{2,}|(?<=\.)\s+(?=[A-Z“"])/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40)
    .slice(0, 24);

  const bodyBlocks =
    paragraphs.length > 1
      ? paragraphs
      : story.body
          .replace(/\s+/g, " ")
          .trim()
          .match(/.{1,520}(?:\s|$)/g) ?? [story.body];

  const related = await prisma.newsStory.findMany({
    where: {
      isActive: true,
      id: { not: story.id },
      ...(story.topics[0]
        ? { topics: { hasSome: story.topics.slice(0, 2) } }
        : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      imageUrl: true,
      publisher: true,
      topics: true,
      publishedAt: true,
    },
  });

  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80"
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, rgba(30,104,71,0.12), transparent 50%)",
        }}
        aria-hidden
      />

      <article className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          <Link href="/news" className="hover:underline">
            Science & research news
          </Link>
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--ink)] sm:text-[2.6rem]">
          {story.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--muted)]">
          <span>{formatDate(story.publishedAt)}</span>
          {story.publisher ? <span>· {story.publisher}</span> : null}
          {story.authors.length ? (
            <span>· {story.authors.slice(0, 3).join(", ")}</span>
          ) : null}
        </div>
        {story.topics.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {story.topics.map((topic) => (
              <Link
                key={topic}
                href={`/news?topic=${encodeURIComponent(topic)}`}
                className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]"
              >
                {topic}
              </Link>
            ))}
          </div>
        ) : null}

        {story.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.imageUrl}
            alt=""
            className="mt-8 aspect-[16/9] w-full rounded-[1.25rem] object-cover shadow-[0_24px_60px_-40px_rgba(11,31,51,0.55)]"
          />
        ) : null}

        <p className="mt-8 border-l-2 border-[var(--accent)] pl-4 text-base font-medium leading-relaxed text-[var(--ink)] sm:text-lg">
          {story.summary}
        </p>

        <div className="mt-7 space-y-4 text-[15px] leading-relaxed text-[var(--ink)]/90 sm:text-base">
          {bodyBlocks.map((block, index) => (
            <p key={index}>{block.trim()}</p>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-[var(--line)] pt-6">
          <Link href="/news" className="btn-secondary !px-4 !py-2 text-sm">
            All news
          </Link>
          {story.originalUrl ? (
            <a
              href={story.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary !px-4 !py-2 text-sm"
            >
              Original publisher
            </a>
          ) : null}
        </div>
      </article>

      {related.length > 0 ? (
        <section className="mx-auto max-w-6xl border-t border-[var(--line)] px-4 py-12 sm:px-6">
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                Keep reading
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
                Related stories
              </h2>
            </div>
            <Link
              href="/news"
              className="text-sm font-semibold text-[var(--accent)] hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <NewsStoryCard key={item.id} story={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
