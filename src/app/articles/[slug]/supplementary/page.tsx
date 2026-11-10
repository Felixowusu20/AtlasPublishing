import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { parseSupplementaryFiles } from "@/lib/supplementary-files";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await prisma.publishedArticle.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    select: { title: true },
  });
  if (!article) return { title: "Supplementary material | Nahda Publications" };
  return {
    title: `Supplementary material | ${article.title}`,
    description: `Supplementary files published with ${article.title}.`,
  };
}

export default async function ArticleSupplementaryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await prisma.publishedArticle.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    select: {
      title: true,
      slug: true,
      authors: true,
      articleType: true,
      supplementaryFiles: true,
      journal: { select: { title: true, shortTitle: true, slug: true } },
    },
  });
  if (!article) notFound();

  const files = parseSupplementaryFiles(article.supplementaryFiles);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
        {article.journal.shortTitle} · {article.articleType}
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)] sm:text-4xl">
        Supplementary material
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
        These files belong only to{" "}
        <Link
          href={`/articles/${article.slug}`}
          className="font-semibold text-[var(--accent)] underline"
        >
          {article.title}
        </Link>
        . {article.authors.join(", ")}.
      </p>

      {files.length ? (
        <ul className="mt-8 space-y-3">
          {files.map((file, index) => (
            <li
              key={file.id}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[var(--line)]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                File {index + 1}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--ink)]">
                {file.label}
              </h2>
              <p className="mt-1 truncate text-xs text-[var(--muted)]">
                {file.fileName}
              </p>
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="btn-primary mt-4 inline-flex text-sm"
              >
                Open file
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 rounded-2xl bg-[var(--surface)] px-4 py-5 text-sm text-[var(--muted)] ring-1 ring-[var(--line)]">
          No supplementary files have been published with this paper yet.
        </p>
      )}

      <Link
        href={`/articles/${article.slug}`}
        className="mt-8 inline-flex text-sm font-semibold text-[var(--accent)]"
      >
        ← Back to the article
      </Link>
    </div>
  );
}
