/**
 * Nahda Identifier (NID) — pure helpers safe for client + server.
 * Not a Crossref/DOI Agency DOI. Stored in PublishedArticle.doi for compatibility.
 *
 * DB operations live in `@/lib/doi-db` so browser bundles never pull in `pg`.
 */

export const DEFAULT_NID_PREFIX = "nid";

/** @deprecated Use DEFAULT_NID_PREFIX — kept for older imports. */
export const ATLAS_DOI_PREFIX = DEFAULT_NID_PREFIX;

export type DoiSettingsRow = {
  id: string;
  prefix: string;
  label: string;
  publisherName: string;
  notes: string | null;
};

/**
 * Normalize an NID or legacy DOI string for lookup/storage.
 * Strips doi.org / nid: / doi: wrappers and lowercases.
 */
export function normalizeDoi(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^https?:\/\/[^/]+\/nid\//i, "")
    .replace(/^nid:\s*/i, "")
    .replace(/^doi:\s*/i, "")
    .toLowerCase();
}

export const normalizeNid = normalizeDoi;

/** True Crossref-style DOI (10.xxxx/…). House NIDs are not this. */
export function isCrossrefDoi(input: string): boolean {
  return /^10\.\d{4,9}\/\S+$/i.test(normalizeDoi(input));
}

/** Valid house NID or legacy Crossref-shaped id. */
export function isValidNidShape(input: string): boolean {
  const id = normalizeDoi(input);
  if (!id || id.length < 5 || !id.includes("/")) return false;
  if (isCrossrefDoi(id)) return true;
  return /^[a-z0-9][a-z0-9._-]{1,32}\/\S+$/i.test(id);
}

/** @deprecated Use isValidNidShape */
export function isValidDoiShape(input: string): boolean {
  return isValidNidShape(input);
}

/** Public Nahda NID path. */
export function nidPath(id: string): string {
  return `/nid/${normalizeDoi(id)}`;
}

/** @deprecated Use nidPath */
export function atlasDoiPath(doi: string): string {
  return nidPath(doi);
}

/** doi.org URL only for real Crossref DOIs; otherwise site NID path. */
export function doiToUrl(doi: string): string {
  const id = normalizeDoi(doi);
  if (isCrossrefDoi(id)) return `https://doi.org/${id}`;
  return nidPath(id);
}

/** Human label for citations / UI. */
export function identifierLabel(id?: string | null): "NID" | "DOI" {
  if (id && isCrossrefDoi(id)) return "DOI";
  return "NID";
}

/** Journal suffix code, e.g. journal doiPrefix `nid/ajs` → `ajs`. */
export function journalDoiCode(journal: {
  doiPrefix?: string | null;
  shortTitle: string;
}): string {
  if (journal.doiPrefix?.includes("/")) {
    return journal.doiPrefix.split("/").pop()!.toLowerCase();
  }
  if (journal.doiPrefix) {
    return journal.doiPrefix.toLowerCase();
  }
  return (
    journal.shortTitle.replace(/[^A-Za-z0-9]/g, "").toLowerCase().slice(0, 6) ||
    "nah"
  );
}

/** `nid/ajs.2026.0142` */
export function formatNid(
  journalCode: string,
  year: number,
  serial: number,
  prefix = DEFAULT_NID_PREFIX,
): string {
  return `${prefix}/${journalCode}.${year}.${String(serial).padStart(4, "0")}`;
}

/** @deprecated Use formatNid */
export function formatAtlasDoi(
  journalCode: string,
  year: number,
  serial: number,
  prefix = DEFAULT_NID_PREFIX,
): string {
  return formatNid(journalCode, year, serial, prefix);
}

/** Extract serial from `prefix/code.year.####`. */
export function serialFromNid(
  id: string,
  journalCode: string,
  year: number,
  prefix: string,
): number {
  const re = new RegExp(
    `^${prefix.replace(/\./g, "\\.")}/${journalCode}\\.${year}\\.(\\d+)$`,
    "i",
  );
  const m = normalizeDoi(id).match(re);
  return m ? Number.parseInt(m[1], 10) : 0;
}
