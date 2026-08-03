import { prisma } from "@/lib/db";
import type { ScholarArticleInput } from "@/lib/seo/scholar";

const articleSelect = {
  slug: true,
  title: true,
  abstract: true,
  authors: true,
  affiliations: true,
  keywords: true,
  doi: true,
  publishedAt: true,
  volume: true,
  issue: true,
  pages: true,
  manuscriptUrl: true,
  coverImageUrl: true,
  license: true,
  openAccess: true,
  journal: {
    select: {
      title: true,
      slug: true,
      issn: true,
      eIssn: true,
      shortTitle: true,
    },
  },
} as const;

export async function loadScholarArticleBySlug(slug: string) {
  return prisma.publishedArticle.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    select: articleSelect,
  });
}

export function toScholarInput(
  article: NonNullable<Awaited<ReturnType<typeof loadScholarArticleBySlug>>>,
): ScholarArticleInput {
  return {
    slug: article.slug,
    title: article.title,
    abstract: article.abstract,
    authors: article.authors,
    affiliations: article.affiliations,
    keywords: article.keywords,
    doi: article.doi,
    publishedAt: article.publishedAt,
    volume: article.volume,
    issue: article.issue,
    pages: article.pages,
    manuscriptUrl: article.manuscriptUrl,
    coverImageUrl: article.coverImageUrl,
    license: article.license,
    openAccess: article.openAccess,
    journal: article.journal,
  };
}

/**
 * Validates Scholar-critical fields before / after publish.
 * Returns a list of blocking or advisory messages.
 */
export function validateScholarReadiness(input: {
  title?: string | null;
  authors?: string[] | null;
  abstract?: string | null;
  publishedAt?: Date | string | null;
  journalTitle?: string | null;
  issn?: string | null;
  eIssn?: string | null;
  doi?: string | null;
  manuscriptUrl?: string | null;
  slug?: string | null;
}): { ok: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input.title?.trim()) errors.push("Missing article title");
  if (!input.authors?.length) errors.push("Missing authors");
  if (!input.abstract?.trim() || (input.abstract?.trim().length ?? 0) < 40) {
    errors.push("Abstract missing or too short for indexing");
  }
  if (!input.publishedAt) errors.push("Missing publication date");
  if (!input.journalTitle?.trim()) errors.push("Missing journal title");
  if (!input.slug?.trim()) errors.push("Missing SEO slug");
  if (!input.issn && !input.eIssn) {
    warnings.push("Journal has no ISSN/eISSN — required for DOAJ and helpful for Scholar");
  }
  if (!input.doi || input.doi === "Pending") {
    warnings.push("DOI not assigned yet");
  }
  if (!input.manuscriptUrl) {
    warnings.push("PDF not attached — citation_pdf_url will be omitted");
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** Stable issue key used in URLs: vol-1-issue-2 or early-view */
export function issueKey(volume?: string | null, issue?: string | null) {
  const v = (volume || "").trim();
  const i = (issue || "").trim();
  if ((!v || v === "—") && (!i || i === "—" || i === "Early View")) {
    return "early-view";
  }
  const vol = v && v !== "—" ? `vol-${slugPart(v)}` : "vol-x";
  const iss = i && i !== "—" ? `issue-${slugPart(i)}` : "issue-x";
  return `${vol}-${iss}`;
}

function slugPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export function parseIssueKey(key: string): {
  volume: string | null;
  issue: string | null;
  earlyView: boolean;
} {
  if (key === "early-view") {
    return { volume: null, issue: null, earlyView: true };
  }
  const m = key.match(/^vol-([a-z0-9-]+)-issue-([a-z0-9-]+)$/i);
  if (!m) return { volume: null, issue: null, earlyView: false };
  return {
    volume: m[1] === "x" ? null : m[1].replace(/-/g, " "),
    issue: m[2] === "x" ? null : m[2].replace(/-/g, " "),
    earlyView: false,
  };
}
