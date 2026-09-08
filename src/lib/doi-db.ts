import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  DEFAULT_NID_PREFIX,
  formatNid,
  journalDoiCode,
  normalizeDoi,
  serialFromNid,
  type DoiSettingsRow,
} from "@/lib/doi";
import { resolvePublishedPdfUrl } from "@/lib/submission-utils";

type JournalLike = {
  id: string;
  doiPrefix?: string | null;
  shortTitle: string;
};

type DbClient = Prisma.TransactionClient | typeof prisma;

/** Load (or create) NID settings. */
export async function getDoiSettings(
  db: DbClient = prisma,
): Promise<DoiSettingsRow> {
  const existing = await db.doiSettings.findUnique({ where: { id: "default" } });
  if (existing) {
    if (existing.prefix === "10.58000") {
      return db.doiSettings.update({
        where: { id: "default" },
        data: {
          prefix: DEFAULT_NID_PREFIX,
          label:
            existing.label === "Nahda DOI" || existing.label.includes("DOI")
              ? "Nahda Identifier (NID)"
              : existing.label,
        },
      });
    }
    return existing;
  }
  return db.doiSettings.create({
    data: {
      id: "default",
      prefix: DEFAULT_NID_PREFIX,
      label: "Nahda Identifier (NID)",
      publisherName: "Nahda Publications",
      notes:
        "Free NIDs minted by Nahda for published articles. Not Crossref DOIs.",
    },
  });
}

export async function getDoiPrefix(db: DbClient = prisma): Promise<string> {
  const settings = await getDoiSettings(db);
  const prefix = settings.prefix.trim().replace(/\/+$/, "").toLowerCase();
  return prefix || DEFAULT_NID_PREFIX;
}

/** Next free NID for a journal in the given publication year. */
export async function allocateNextAtlasDoi(
  db: DbClient,
  journal: JournalLike,
  year = new Date().getFullYear(),
): Promise<string> {
  const prefix = await getDoiPrefix(db);
  const code = journalDoiCode(journal);
  const startsWith = `${prefix}/${code}.${year}.`;

  const existing = await db.publishedArticle.findMany({
    where: {
      journalId: journal.id,
      doi: { startsWith },
    },
    select: { doi: true },
  });

  let maxSerial = 0;
  for (const row of existing) {
    if (!row.doi) continue;
    maxSerial = Math.max(
      maxSerial,
      serialFromNid(row.doi, code, year, prefix),
    );
  }

  return formatNid(code, year, maxSerial + 1, prefix);
}

export const allocateNextNid = allocateNextAtlasDoi;

/** Resolve an NID/DOI string to a published article, if any. */
export async function findArticleByDoi(db: DbClient, rawDoi: string) {
  const doi = normalizeDoi(rawDoi);
  if (!doi) return null;

  const select = {
    id: true,
    slug: true,
    title: true,
    doi: true,
    manuscriptUrl: true,
    authors: true,
    affiliations: true,
    keywords: true,
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
    submission: { select: { manuscriptUrl: true } },
    journal: {
      select: {
        title: true,
        shortTitle: true,
        slug: true,
        issn: true,
        eIssn: true,
      },
    },
  } as const;

  const exact = await db.publishedArticle.findFirst({
    where: {
      isActive: true,
      deletedAt: null,
      OR: [
        { doi: { equals: doi, mode: "insensitive" } },
        { doi: { equals: rawDoi.trim(), mode: "insensitive" } },
      ],
    },
    select,
  });
  if (exact) {
    return {
      ...exact,
      manuscriptUrl: resolvePublishedPdfUrl(
        exact.manuscriptUrl,
        exact.submission?.manuscriptUrl,
      ),
    };
  }

  const candidates = await db.publishedArticle.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      doi: { not: null },
    },
    select,
    take: 500,
  });

  const match =
    candidates.find((row) => row.doi && normalizeDoi(row.doi) === doi) ?? null;
  if (!match) return null;
  return {
    ...match,
    manuscriptUrl: resolvePublishedPdfUrl(
      match.manuscriptUrl,
      match.submission?.manuscriptUrl,
    ),
  };
}

export const findArticleByNid = findArticleByDoi;

/** Assign free NIDs to published articles that do not have one yet. */
export async function backfillMissingDois(db: DbClient) {
  const missing = await db.publishedArticle.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      OR: [{ doi: null }, { doi: "" }],
    },
    include: { journal: true },
    orderBy: { publishedAt: "asc" },
  });

  let updated = 0;
  for (const article of missing) {
    const year = article.publishedAt.getFullYear();
    const doi = await allocateNextNid(db, article.journal, year);
    await db.publishedArticle.update({
      where: { id: article.id },
      data: { doi },
    });
    updated += 1;
  }

  return updated;
}

export const backfillMissingNids = backfillMissingDois;

/** True if another live article already uses this NID. */
export async function isDoiTaken(
  db: DbClient,
  rawDoi: string,
  excludeArticleId?: string,
): Promise<boolean> {
  const doi = normalizeDoi(rawDoi);
  if (!doi) return false;
  const clash = await db.publishedArticle.findFirst({
    where: {
      deletedAt: null,
      id: excludeArticleId ? { not: excludeArticleId } : undefined,
      OR: [
        { doi: { equals: doi, mode: "insensitive" } },
        { doi: { equals: rawDoi.trim(), mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  return Boolean(clash);
}

export const isNidTaken = isDoiTaken;
