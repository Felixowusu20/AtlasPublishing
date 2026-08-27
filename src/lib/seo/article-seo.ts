import { prisma } from "@/lib/db";
import type { ScholarArticleInput } from "@/lib/seo/scholar";
import { resolvePublishedPdfUrl } from "@/lib/submission-utils";
import { htmlToPlainText } from "@/lib/import-manuscript";
import { resolveArticleIssue } from "@/lib/issues";

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
  submission: { select: { manuscriptUrl: true } },
  journal: {
    select: {
      title: true,
      slug: true,
      issn: true,
      eIssn: true,
      shortTitle: true,
      frequency: true,
      foundedYear: true,
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
  const numbered = resolveArticleIssue({
    volume: article.volume,
    issue: article.issue,
    publishedAt: article.publishedAt,
    frequency: article.journal.frequency,
    foundedYear: article.journal.foundedYear,
  });
  return {
    slug: article.slug,
    title: article.title,
    abstract: article.abstract,
    authors: article.authors,
    affiliations: article.affiliations,
    keywords: article.keywords,
    doi: article.doi,
    publishedAt: article.publishedAt,
    volume: numbered.volume,
    issue: numbered.issue,
    pages: article.pages,
    manuscriptUrl: resolvePublishedPdfUrl(
      article.manuscriptUrl,
      article.submission?.manuscriptUrl,
    ),
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
  const abstractText = htmlToPlainText(input.abstract ?? "").trim();
  if (!abstractText || abstractText.length < 40) {
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

export { issueKey, parseIssueKey } from "@/lib/issues";

