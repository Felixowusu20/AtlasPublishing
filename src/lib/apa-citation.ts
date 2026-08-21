import { authorDisplayName } from "@/lib/orcid";
import { doiToUrl, normalizeDoi } from "@/lib/doi";

export type ApaCitationInput = {
  authors: string[];
  title: string;
  journalTitle: string;
  publishedAt?: string | Date | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  doi?: string | null;
};

export type ApaCitationParts = {
  /** Plain APA 7 string for copy/paste. */
  text: string;
  authors: string;
  year: string;
  title: string;
  journal: string;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doiUrl: string | null;
};

function cleanField(value?: string | null) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  if (/^(—|--|n\/?a|pending|early view)$/i.test(trimmed)) return "";
  return trimmed;
}

/** Publication year for APA, e.g. 2025. */
export function citationYear(publishedAt?: string | Date | null) {
  if (publishedAt instanceof Date && !Number.isNaN(publishedAt.getTime())) {
    return String(publishedAt.getFullYear());
  }
  if (typeof publishedAt === "string") {
    const match = publishedAt.match(/\b(19|20)\d{2}\b/);
    if (match) return match[0];
    const parsed = new Date(publishedAt);
    if (!Number.isNaN(parsed.getTime())) return String(parsed.getFullYear());
  }
  return String(new Date().getFullYear());
}

function toInitials(given: string) {
  return given
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const hyphenated = part.split("-").filter(Boolean);
      if (hyphenated.length > 1) {
        return hyphenated
          .map((bit) => `${bit.replace(/[^A-Za-z]/g, "").charAt(0).toUpperCase()}.`)
          .filter((bit) => bit !== ".")
          .join("-");
      }
      const letter = part.replace(/[^A-Za-z]/g, "").charAt(0);
      return letter ? `${letter.toUpperCase()}.` : "";
    })
    .filter(Boolean)
    .join(" ");
}

/**
 * Invert a stored author name into APA: "Qiang Li" → "Li, Q."
 * Also accepts "Li, Qiang" and "Li, Q.".
 */
export function toApaAuthorName(raw: string) {
  const name = authorDisplayName(raw).replace(/\s+/g, " ").trim();
  if (!name) return "";

  if (name.includes(",")) {
    const [last, ...rest] = name.split(",");
    const given = rest.join(",").trim();
    const initials = given ? toInitials(given) : "";
    const surname = last.trim();
    return initials ? `${surname}, ${initials}` : surname;
  }

  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0];
  const surname = parts[parts.length - 1];
  const initials = toInitials(parts.slice(0, -1).join(" "));
  return initials ? `${surname}, ${initials}` : surname;
}

export function formatApaAuthors(authors: string[]) {
  const names = authors.map(toApaAuthorName).filter(Boolean);
  if (names.length === 0) return "Anonymous";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, & ${names[1]}`;
  if (names.length <= 20) {
    return `${names.slice(0, -1).join(", ")}, & ${names[names.length - 1]}`;
  }
  return `${names.slice(0, 19).join(", ")}, ... ${names[names.length - 1]}`;
}

function sentenceCaseTitle(title: string) {
  const trimmed = title.trim().replace(/[.]+$/g, "");
  if (!trimmed) return "Untitled";
  const tokens = trimmed.split(/(\s+)/);
  const words = tokens.filter((t) => !/^\s+$/.test(t));
  const titled =
    words.length > 2 &&
    words.filter((w) => /^[A-Z]/.test(w.replace(/^[^A-Za-z]+/, ""))).length /
      words.length >=
      0.7;

  if (!titled) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  let seenWord = false;
  let afterColon = false;
  return tokens
    .map((token) => {
      if (/^\s+$/.test(token)) {
        if (token.includes("\n")) afterColon = false;
        return token;
      }
      const prefix = token.match(/^[^A-Za-z0-9]*/)?.[0] ?? "";
      const suffix = token.match(/[^A-Za-z0-9]*$/)?.[0] ?? "";
      const core = token.slice(prefix.length, token.length - suffix.length);
      if (!core) return token;
      const acronym = /^[A-Z0-9][A-Z0-9-]{1,}$/.test(core);
      const capitalize = !seenWord || afterColon;
      afterColon = /:$/.test(suffix) || /:$/.test(core);
      seenWord = true;
      if (acronym) return `${prefix}${core}${suffix}`;
      const next = capitalize
        ? core.charAt(0).toUpperCase() + core.slice(1).toLowerCase()
        : core.toLowerCase();
      return `${prefix}${next}${suffix}`;
    })
    .join("");
}

function sourceLocator(volume: string, issue: string, pages: string) {
  if (volume && issue) {
    return pages ? `${volume}(${issue}), ${pages}` : `${volume}(${issue})`;
  }
  if (volume) return pages ? `${volume}, ${pages}` : volume;
  if (issue) return pages ? `(${issue}), ${pages}` : `(${issue})`;
  return pages;
}

/** APA 7th journal-article citation. */
export function buildApaCitation(input: ApaCitationInput): ApaCitationParts {
  const authors = formatApaAuthors(input.authors);
  const year = citationYear(input.publishedAt);
  const title = sentenceCaseTitle(input.title);
  const journal = cleanField(input.journalTitle) || "Journal";
  const volume = cleanField(input.volume) || null;
  const issue = cleanField(input.issue) || null;
  const pages = cleanField(input.pages) || null;
  const doi =
    input.doi && input.doi !== "Pending" ? normalizeDoi(input.doi) : "";
  const doiUrl = doi ? doiToUrl(doi) : null;

  const locator = sourceLocator(volume ?? "", issue ?? "", pages ?? "");
  const source = locator ? `${journal}, ${locator}` : journal;
  const titleMark = /[.?!]$/.test(title) ? "" : ".";
  const doiPart = doiUrl ? ` ${doiUrl}` : "";
  const text = `${authors} (${year}). ${title}${titleMark} ${source}.${doiPart}`;

  return {
    text,
    authors,
    year,
    title,
    journal,
    volume,
    issue,
    pages,
    doiUrl,
  };
}
