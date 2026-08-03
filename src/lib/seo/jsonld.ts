import { absoluteUrl, articleCanonicalPath, articlePdfUrl } from "@/lib/seo/scholar";
import { normalizeDoi } from "@/lib/doi";

type ScholarlyArticleJsonLdInput = {
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
  license?: string | null;
  openAccess?: boolean;
  journal: {
    title: string;
    slug: string;
    issn?: string | null;
    eIssn?: string | null;
  };
};

export function scholarlyArticleJsonLd(article: ScholarlyArticleJsonLdInput) {
  const url = absoluteUrl(articleCanonicalPath(article.slug));
  const doi =
    article.doi && article.doi !== "Pending"
      ? normalizeDoi(article.doi)
      : undefined;
  const published =
    typeof article.publishedAt === "string"
      ? new Date(article.publishedAt).toISOString()
      : article.publishedAt.toISOString();

  const authors = article.authors.map((name, i) => {
    const affiliation = article.affiliations?.[i] || article.affiliations?.[0];
    return {
      "@type": "Person",
      name,
      ...(affiliation
        ? {
            affiliation: {
              "@type": "Organization",
              name: affiliation,
            },
          }
        : {}),
    };
  });

  const isPartOf: Record<string, unknown> = {
    "@type": "Periodical",
    name: article.journal.title,
    url: absoluteUrl(`/journals/${article.journal.slug}`),
  };
  if (article.journal.issn || article.journal.eIssn) {
    isPartOf.issn = article.journal.eIssn || article.journal.issn;
  }

  const encoding = article.manuscriptUrl
    ? [
        {
          "@type": "MediaObject",
          encodingFormat: "application/pdf",
          contentUrl: articlePdfUrl(article.slug),
        },
      ]
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    "@id": doi ? `https://doi.org/${doi}` : url,
    mainEntityOfPage: url,
    headline: article.title,
    name: article.title,
    description: article.abstract,
    datePublished: published,
    author: authors,
    isPartOf,
    ...(article.volume ? { volumeNumber: article.volume } : {}),
    ...(article.issue && article.issue !== "Early View"
      ? { issueNumber: article.issue }
      : {}),
    ...(article.pages ? { pagination: article.pages } : {}),
    ...(article.keywords?.length ? { keywords: article.keywords.join(", ") } : {}),
    ...(doi
      ? {
          identifier: {
            "@type": "PropertyValue",
            propertyID: "DOI",
            value: doi,
          },
          sameAs: [`https://doi.org/${doi}`, absoluteUrl(`/doi/${doi}`)],
        }
      : {}),
    ...(article.license
      ? {
          license: article.license.startsWith("http")
            ? article.license
            : "https://creativecommons.org/licenses/by/4.0/",
        }
      : {}),
    ...(article.openAccess
      ? {
          isAccessibleForFree: true,
        }
      : {}),
    ...(encoding ? { encoding, associatedMedia: encoding } : {}),
    publisher: {
      "@type": "Organization",
      name: "Nahda Publications",
      url: absoluteUrl("/"),
    },
  };
}

export function periodicalJsonLd(journal: {
  title: string;
  slug: string;
  description: string;
  issn?: string | null;
  eIssn?: string | null;
  editorInChief?: string | null;
}) {
  const url = absoluteUrl(`/journals/${journal.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Periodical",
    name: journal.title,
    url,
    description: journal.description,
    ...(journal.issn ? { issn: journal.issn } : {}),
    ...(journal.eIssn ? { eIssn: journal.eIssn } : {}),
    ...(journal.editorInChief
      ? {
          editor: {
            "@type": "Person",
            name: journal.editorInChief,
            jobTitle: "Editor-in-Chief",
          },
        }
      : {}),
    publisher: {
      "@type": "Organization",
      name: "Nahda Publications",
      url: absoluteUrl("/"),
    },
  };
}
