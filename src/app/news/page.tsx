import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Science & research news | Nahda Publications",
  description:
    "Curated science, education, medicine, and social-science news for the Nahda research community.",
};

function formatDate(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function NewsIndexPage() {
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
      where: { isActive: true },
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        From the research world
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)] sm:text-4xl">
        Science & research news
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
        Stories in science, education, medicine, social sciences, and related
        fields — selected for Nahda’s scholarly audience. These also appear in
        homepage announcements and the hero when they carry a strong image.
      </p>

      {stories.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-[var(--line)] bg-white px-5 py-8 text-sm text-[var(--muted)]">
          No news stories yet. An editor can sync Free News from Admin →
          Announcements or Hero.
        </p>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <Link
              key={story.id}
              href={`/news/${story.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {story.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={story.imageUrl}
                  alt=""
                  className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              ) : (
                <div className="flex aspect-[16/10] items-end bg-gradient-to-br from-[var(--accent)] to-[var(--ink)] p-4">
                  <p className="font-[family-name:var(--font-display)] text-lg text-white">
                    Nahda News
                  </p>
                </div>
              )}
              <div className="flex flex-1 flex-col p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
                  {formatDate(story.publishedAt)}
                  {story.publisher ? ` · ${story.publisher}` : ""}
                </p>
                <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug text-[var(--ink)] group-hover:text-[var(--accent)]">
                  {story.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--muted)]">
                  {story.summary}
                </p>
                {story.topics.length > 0 ? (
                  <p className="mt-3 text-[11px] uppercase tracking-wide text-[var(--accent)]">
                    {story.topics.slice(0, 3).join(" · ")}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
