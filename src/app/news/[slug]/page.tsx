import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

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
      select: { title: true, summary: true },
    });
    if (!story) return { title: "News | Nahda Publications" };
    return {
      title: `${story.title} | Nahda Publications`,
      description: story.summary.slice(0, 160),
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

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        <Link href="/news" className="hover:underline">
          Science & research news
        </Link>
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--ink)] sm:text-4xl">
        {story.title}
      </h1>
      <p className="mt-3 text-sm text-[var(--muted)]">
        {formatDate(story.publishedAt)}
        {story.publisher ? ` · ${story.publisher}` : ""}
        {story.authors.length
          ? ` · ${story.authors.slice(0, 3).join(", ")}`
          : ""}
      </p>
      {story.topics.length > 0 ? (
        <p className="mt-2 text-[11px] uppercase tracking-wide text-[var(--accent)]">
          {story.topics.join(" · ")}
        </p>
      ) : null}

      {story.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={story.imageUrl}
          alt=""
          className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
        />
      ) : null}

      <p className="mt-8 text-base font-medium leading-relaxed text-[var(--ink)] sm:text-lg">
        {story.summary}
      </p>

      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-[var(--ink)]/90 sm:text-base">
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
  );
}
