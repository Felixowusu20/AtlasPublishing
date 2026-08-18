/** Official ORCID green (iD icon). Do not recolor. */
export const ORCID_GREEN = "#A6CE39";
/** Darker ORCID green — a scholarly hyperlink color instead of default blue. */
export const ORCID_GREEN_DARK = "#638C1C";

const ORCID_ID_RE = /\d{4}-\d{4}-\d{4}-\d{3}[\dXx]/;
const ORCID_IN_TEXT_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:orcid\.org\/)?(\d{4}-\d{4}-\d{4}-\d{3}[\dXx])/i;

export type ParsedAuthor = {
  name: string;
  orcid: string | null;
};

export function normalizeOrcid(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const match = value.trim().match(ORCID_IN_TEXT_RE);
  if (!match?.[1]) return null;
  const id = match[1].toUpperCase();
  return ORCID_ID_RE.test(id) ? id : null;
}

export function orcidUrl(orcid: string): string {
  const id = normalizeOrcid(orcid) ?? orcid.trim();
  return `https://orcid.org/${id}`;
}

/**
 * Pull an ORCID iD out of an author string so we can keep using `String[]`
 * storage: `"Jane Doe 0000-0002-1825-0097"` or a full orcid.org URL.
 */
export function parseAuthorOrcid(raw: string): ParsedAuthor {
  const trimmed = raw.replace(/\*+\s*$/g, "").trim();
  if (!trimmed) return { name: "", orcid: null };

  const match = trimmed.match(ORCID_IN_TEXT_RE);
  if (!match?.[1] || match.index === undefined) {
    return { name: trimmed, orcid: null };
  }

  const orcid = match[1].toUpperCase();
  const before = trimmed.slice(0, match.index);
  const after = trimmed.slice(match.index + match[0].length);
  const name = `${before} ${after}`
    .replace(/\bORCID:?\b/gi, " ")
    .replace(/[|<>()[\]{}]/g, " ")
    .replace(/[,;]\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return { name: name || trimmed.replace(match[0], "").trim() || trimmed, orcid };
}

export function authorDisplayName(raw: string): string {
  return parseAuthorOrcid(raw).name || raw.trim();
}

export function formatAuthorWithOrcid(
  name: string,
  orcid?: string | null,
): string {
  const parsed = parseAuthorOrcid(name);
  const id = normalizeOrcid(orcid) || parsed.orcid;
  return id ? `${parsed.name} ${id}` : parsed.name;
}
