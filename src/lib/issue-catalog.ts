import { prisma } from "@/lib/db";
import {
  deriveIssueRecords,
  resolveArticleIssue,
  type IssueArticleInput,
} from "@/lib/issues";

const issueArticleSelect = {
  volume: true,
  issue: true,
  publishedAt: true,
  journal: {
    select: {
      id: true,
      slug: true,
      title: true,
      shortTitle: true,
      frequency: true,
      foundedYear: true,
      issn: true,
      sortOrder: true,
    },
  },
} as const;

export async function persistNumberedIssues() {
  const rows = await prisma.publishedArticle.findMany({
    where: {
      deletedAt: null,
      OR: [
        { issue: null },
        { issue: "" },
        { issue: "—" },
        { issue: { equals: "Early View", mode: "insensitive" } },
        { volume: null },
        { volume: "" },
        { volume: "—" },
      ],
    },
    select: {
      id: true,
      volume: true,
      issue: true,
      publishedAt: true,
      journal: { select: { frequency: true, foundedYear: true } },
    },
  });

  for (const row of rows) {
    const resolved = resolveArticleIssue({
      volume: row.volume,
      issue: row.issue,
      publishedAt: row.publishedAt,
      frequency: row.journal.frequency,
      foundedYear: row.journal.foundedYear,
    });
    if (resolved.volume === (row.volume ?? "") && resolved.issue === (row.issue ?? "")) {
      continue;
    }
    await prisma.publishedArticle.update({
      where: { id: row.id },
      data: { volume: resolved.volume, issue: resolved.issue },
    });
  }

  return rows.length;
}

export async function loadPublishedIssueArticles(): Promise<IssueArticleInput[]> {
  return prisma.publishedArticle.findMany({
    where: { isActive: true, deletedAt: null },
    select: issueArticleSelect,
    orderBy: { publishedAt: "desc" },
  });
}

export async function loadIssueCatalog() {
  try {
    await persistNumberedIssues();
  } catch (err) {
    console.error("[issue-backfill]", err);
  }
  const articles = await loadPublishedIssueArticles();
  return deriveIssueRecords(articles);
}
