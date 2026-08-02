import type { Prisma } from "@/generated/prisma/client";

/** Nahda house DOI prefix (replace with your Crossref prefix when registered). */
export const ATLAS_DOI_PREFIX = "10.58000";

type JournalLike = {
  id: string;
  doiPrefix?: string | null;
  shortTitle: string;
};

/** Strip URL / doi: prefix and lowercase for consistent lookups. */
export function normalizeDoi(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .toLowerCase();
}

export function doiToUrl(doi: string): string {
  return `https://doi.org/${normalizeDoi(doi)}`;
}

/** Public Nahda landing path for a DOI (resolves to article / PDF). */
export function atlasDoiPath(doi: string): string {
  return `/doi/${normalizeDoi(doi)}`;
}

/** Journal suffix code, e.g. `10.58000/ajs` → `ajs`. */
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
    "atl"
  );
}

/** `10.58000/ajs.2026.0142` */
export function formatAtlasDoi(
  journalCode: string,
  year: number,
  serial: number,
): string {
  return `${ATLAS_DOI_PREFIX}/${journalCode}.${year}.${String(serial).padStart(4, "0")}`;
}

function serialFromDoi(doi: string, journalCode: string, year: number): number {
  const re = new RegExp(
    `^${ATLAS_DOI_PREFIX.replace(".", "\\.")}/${journalCode}\\.${year}\\.(\\d+)$`,
    "i",
  );
  const m = normalizeDoi(doi).match(re);
  return m ? Number.parseInt(m[1], 10) : 0;
}

/** Next Nahda DOI for a journal in the given publication year. */
export async function allocateNextAtlasDoi(
  db: Prisma.TransactionClient | typeof import("@/lib/db").prisma,
  journal: JournalLike,
  year = new Date().getFullYear(),
): Promise<string> {
  const code = journalDoiCode(journal);
  const prefix = `${ATLAS_DOI_PREFIX}/${code}.${year}.`;

  const existing = await db.publishedArticle.findMany({
    where: {
      journalId: journal.id,
      doi: { startsWith: prefix },
    },
    select: { doi: true },
  });

  let maxSerial = 0;
  for (const row of existing) {
    if (!row.doi) continue;
    maxSerial = Math.max(maxSerial, serialFromDoi(row.doi, code, year));
  }

  return formatAtlasDoi(code, year, maxSerial + 1);
}

/** Resolve a DOI string to a published article, if any. */
export async function findArticleByDoi(
  db: Prisma.TransactionClient | typeof import("@/lib/db").prisma,
  rawDoi: string,
) {
  const doi = normalizeDoi(rawDoi);
  if (!doi) return null;

  // Exact / case-insensitive match first
  const exact = await db.publishedArticle.findFirst({
    where: {
      isActive: true,
      deletedAt: null,
      OR: [
        { doi: { equals: doi, mode: "insensitive" } },
        { doi: { equals: rawDoi.trim(), mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      doi: true,
      manuscriptUrl: true,
      authors: true,
      abstract: true,
      articleType: true,
      publishedAt: true,
      volume: true,
      issue: true,
      pages: true,
      views: true,
      downloads: true,
      citations: true,
      openAccess: true,
      license: true,
      journal: {
        select: {
          title: true,
          shortTitle: true,
          slug: true,
        },
      },
    },
  });
  if (exact) return exact;

  // Fallback: DOI stored with or without https://doi.org/ prefix
  const candidates = await db.publishedArticle.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      doi: { not: null },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      doi: true,
      manuscriptUrl: true,
      authors: true,
      abstract: true,
      articleType: true,
      publishedAt: true,
      volume: true,
      issue: true,
      pages: true,
      views: true,
      downloads: true,
      citations: true,
      openAccess: true,
      license: true,
      journal: {
        select: {
          title: true,
          shortTitle: true,
          slug: true,
        },
      },
    },
    take: 500,
  });

  return (
    candidates.find((row) => row.doi && normalizeDoi(row.doi) === doi) ?? null
  );
}

/** Assign Nahda DOIs to published articles that do not have one yet. */
export async function backfillMissingDois(
  db: Prisma.TransactionClient | typeof import("@/lib/db").prisma,
) {
  const missing = await db.publishedArticle.findMany({
    where: { isActive: true, OR: [{ doi: null }, { doi: "" }] },
    include: { journal: true },
    orderBy: { publishedAt: "asc" },
  });

  let updated = 0;
  for (const article of missing) {
    const year = article.publishedAt.getFullYear();
    const doi = await allocateNextAtlasDoi(db, article.journal, year);
    await db.publishedArticle.update({
      where: { id: article.id },
      data: { doi },
    });
    updated += 1;
  }

  return updated;
}
