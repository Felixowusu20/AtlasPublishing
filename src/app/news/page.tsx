import Link from "next/link";
import type { Metadata } from "next";
import { NewsStoryCard } from "@/components/news-story-card";
import { prisma } from "@/lib/db";
import { ensureFreshFreeNews } from "@/lib/sync-freenews";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Science & research news | Nahda Publications",
  description:
    "Live science, education, medicine, and social-science news for the Nahda research community.",
};

const TOPIC_FILTERS = [
  { label: "All", value: "" },
  { label: "Science", value: "science" },
  { label: "Social sciences", value: "social sciences" },
  { label: "Education", value: "education" },
  { label: "Medicine", value: "medicine" },
  { label: "Environment", value: "environment" },
  { label: "Space", value: "space" },
  { label: "Technology", value: "technology" },
] as const;

export default async function NewsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic: topicParam = "" } = await searchParams;
  const topic = topicParam.trim().toLowerCase();

  // Refresh quietly when the feed is stale so the page stays dynamic.
  await ensureFreshFreeNews({ maxAgeMinutes: 90 }).catch((err) => {
    console.error("[news-fresh]", err);
  });

  let stories: Array<{
    id: string;
    slug: string;
    title: string;
    summary: string;
    imageUrl: string | null;
    publisher: string | null;
    topics: string[];
    publishedAt: Date;
  }> = [];

  try {
    stories = await prisma.newsStory.findMany({
      where: {
        isActive: true,
        ...(topic
          ? { topics: { has: topic } }
          : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: 48,
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
  } catch (err) {
    console.error("[news-index]", err);
  }

  const featured = stories[0] ?? null;
  const rest = stories.slice(1);

  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] opacity-90"
        style={{
          background:
            "radial-gradient(ellipse at 12% 0%, rgba(30,104,71,0.14), transparent 48%), radial-gradient(ellipse at 88% 8%, rgba(11,31,51,0.1), transparent 42%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Live from the research world
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)] sm:text-5xl">
            Science & research news
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            Fresh stories in science, education, medicine, social sciences, and
            related fields — updated throughout the day for Nahda’s scholarly
            audience. Editorial announcements stay on the homepage alongside this
            feed.
          </p>
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          {TOPIC_FILTERS.map((item) => {
            const active = topic === item.value;
            const href = item.value ? `/news?topic=${encodeURIComponent(item.value)}` : "/news";
            return (
              <Link
                key={item.label}
                href={href}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-[var(--ink)] text-white"
                    : "bg-white text-[var(--muted)] ring-1 ring-[var(--line)] hover:text-[var(--ink)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {stories.length === 0 ? (
          <div className="mt-10 rounded-[1.35rem] border border-dashed border-[var(--line)] bg-white/80 px-6 py-12 text-center">
            <p className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              News is refreshing
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
              New stories will appear here as soon as the live feed is available.
              You can also open Admin → Announcements and sync Free News.
            </p>
          </div>
        ) : (
          <div className="mt-10 space-y-8">
            {featured && !topic ? (
              <NewsStoryCard story={featured} featured />
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(topic || !featured ? stories : rest).map((story) => (
                <NewsStoryCard key={story.id} story={story} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
