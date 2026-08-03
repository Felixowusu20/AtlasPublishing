import type { Metadata } from "next";
import { getAppBaseUrlOptional } from "@/lib/app-url";
import { atlasDoiPath, normalizeDoi } from "@/lib/doi";
import { articleDownloadPath } from "@/lib/submission-utils";

/** Absolute site origin for SEO tags (never throws). */
export function seoBaseUrl(): string {
  const fromEnv = getAppBaseUrlOptional();
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function absoluteUrl(path: string): string {
  const base = seoBaseUrl();
  if (!path) return base;
  if (/^https?:\/\//i.test(path)) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export type ScholarArticleInput = {
  slug: string;
  title: string;
  abstract: string;
  authors: string[];
  affiliations?: string[];
  keywords?: string[];
  doi?: string | null;
  publishedAt: Date | string;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  manuscriptUrl?: string | null;
  coverImageUrl?: string | null;
  license?: string | null;
  openAccess?: boolean;
  journal: {
    title: string;
    slug: string;
    issn?: string | null;
    eIssn?: string | null;
    shortTitle?: string | null;
  };
};

/** Parse "12-34" / "12–34" / "12" into first/last page. */
export function parsePageRange(pages?: string | null): {
  first?: string;
  last?: string;
} {
  if (!pages || pages === "—") return {};
  const cleaned = pages.replace(/\s+/g, "");
  const m = cleaned.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
  if (m) return { first: m[1], last: m[2] };
  if (/^\d+$/.test(cleaned)) return { first: cleaned, last: cleaned };
  return {};
}

export function formatScholarDate(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

export function articleCanonicalPath(slug: string) {
  return `/articles/${slug}`;
}

export function articlePdfUrl(slug: string) {
  return absoluteUrl(articleDownloadPath(slug));
}

/**
 * Google Scholar `citation_*` tags + Open Graph / Twitter / canonical.
 * Values are emitted via Next.js Metadata `other` so they appear in SSR HTML.
 */
export function buildArticleMetadata(article: ScholarArticleInput): Metadata {
  const canonical = absoluteUrl(articleCanonicalPath(article.slug));
  const pdfUrl = article.manuscriptUrl ? articlePdfUrl(article.slug) : undefined;
  const doi =
    article.doi && article.doi !== "Pending"
      ? normalizeDoi(article.doi)
      : undefined;
  const { first, last } = parsePageRange(article.pages);
  const date = formatScholarDate(article.publishedAt);
  const description =
    article.abstract.replace(/\s+/g, " ").trim().slice(0, 320) ||
    `${article.title} — ${article.journal.title}`;

  const other: Record<string, string | string[]> = {
    citation_title: article.title,
    citation_journal_title: article.journal.title,
    citation_abstract_html_url: canonical,
    citation_fulltext_html_url: canonical,
  };

  if (article.authors.length) {
    other.citation_author = article.authors;
  }
  if (date) other.citation_publication_date = date;
  if (article.volume && article.volume !== "—") {
    other.citation_volume = article.volume;
  }
  if (article.issue && article.issue !== "—" && article.issue !== "Early View") {
    other.citation_issue = article.issue;
  }
  if (first) other.citation_firstpage = first;
  if (last) other.citation_lastpage = last;
  if (pdfUrl) other.citation_pdf_url = pdfUrl;
  if (doi) {
    other.citation_doi = doi;
    other.citation_fulltext_world_readable = pdfUrl ?? canonical;
  }
  const issns = [article.journal.issn, article.journal.eIssn].filter(
    (v): v is string => Boolean(v),
  );
  if (issns.length === 1) other.citation_issn = issns[0];
  if (issns.length > 1) other.citation_issn = issns;
  if (article.keywords?.length) {
    other.citation_keywords = article.keywords.join("; ");
  }

  const authorsLine = article.authors.join(", ");

  return {
    title: `${article.title} | ${article.journal.shortTitle || article.journal.title}`,
    description,
    keywords: article.keywords,
    authors: article.authors.map((name) => ({ name })),
    alternates: {
      canonical,
      types: pdfUrl
        ? {
            "application/pdf": pdfUrl,
          }
        : undefined,
    },
    openGraph: {
      type: "article",
      url: canonical,
      title: article.title,
      description,
      siteName: "Nahda Publications",
      publishedTime:
        typeof article.publishedAt === "string"
          ? new Date(article.publishedAt).toISOString()
          : article.publishedAt.toISOString(),
      authors: article.authors,
      section: article.journal.title,
      tags: article.keywords,
      images: article.coverImageUrl
        ? [{ url: article.coverImageUrl }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    },
    other: {
      ...other,
      "DC.title": article.title,
      "DC.creator": authorsLine,
      "DC.publisher": "Nahda Publications",
      "DC.date": date.replace(/\//g, "-"),
      "DC.identifier": doi ? `doi:${doi}` : canonical,
      "DC.language": "en",
      "DC.rights": article.license ?? "CC BY 4.0",
    },
  };
}

export function buildJournalMetadata(input: {
  title: string;
  shortTitle: string;
  slug: string;
  description: string;
  issn?: string | null;
  eIssn?: string | null;
  coverImageUrl?: string | null;
}): Metadata {
  const canonical = absoluteUrl(`/journals/${input.slug}`);
  const description = input.description.replace(/\s+/g, " ").trim().slice(0, 320);
  return {
    title: `${input.title} | Nahda Publications`,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: input.title,
      description,
      siteName: "Nahda Publications",
      images: input.coverImageUrl ? [{ url: input.coverImageUrl }] : undefined,
    },
    twitter: {
      card: "summary",
      title: input.title,
      description,
    },
    other: {
      ...(input.issn ? { "citation_issn": input.issn } : {}),
      ...(input.eIssn ? { "DC.identifier": `eISSN:${input.eIssn}` } : {}),
    },
  };
}

export function doiLandingUrl(doi: string) {
  return absoluteUrl(atlasDoiPath(doi));
}
