import type { SubmissionStatus } from "@/generated/prisma/client";

const PROGRESS: Record<SubmissionStatus, number> = {
  DRAFT: 10,
  SUBMITTED: 20,
  TECHNICAL_CHECK: 30,
  UNDER_REVIEW: 45,
  MAJOR_REVISION: 55,
  MINOR_REVISION: 60,
  ACCEPTED: 75,
  REJECTED: 40,
  IN_PRODUCTION: 85,
  PUBLISHED: 100,
};

export function progressForStatus(status: SubmissionStatus): number {
  return PROGRESS[status] ?? 10;
}

export function labelStatus(status: SubmissionStatus): string {
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

/** Map Prisma enum → UI badge labels used by StatusBadge */
export function uiStatus(status: SubmissionStatus): string {
  const map: Record<SubmissionStatus, string> = {
    DRAFT: "Draft",
    SUBMITTED: "Submitted",
    TECHNICAL_CHECK: "Technical Check",
    UNDER_REVIEW: "Under Review",
    MAJOR_REVISION: "Major Revision",
    MINOR_REVISION: "Minor Revision",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
    IN_PRODUCTION: "In Production",
    PUBLISHED: "Published",
  };
  return map[status];
}

export function nextManuscriptId(shortTitle: string, year: number, seq: number) {
  const prefix = shortTitle.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6) || "NHD";
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

/** Author may upload a revised file + message during active review. */
export function canAuthorResubmit(
  status: string,
  actionRequired?: string | null,
) {
  // Terminal / production states never allow resubmit
  if (
    status === "PUBLISHED" ||
    status === "REJECTED" ||
    status === "ACCEPTED" ||
    status === "IN_PRODUCTION" ||
    status === "DRAFT"
  ) {
    return false;
  }
  if (actionRequired) return true;
  return (
    status === "MAJOR_REVISION" ||
    status === "MINOR_REVISION" ||
    status === "UNDER_REVIEW" ||
    status === "TECHNICAL_CHECK"
  );
}

/** Public PDF download path for a published article slug. */
export function articleDownloadPath(slug: string) {
  return `/api/articles/${encodeURIComponent(slug)}/download`;
}

/**
 * Same generated Nahda PDF as the author-email download, opened in the browser.
 */
export function articleViewPath(slug: string) {
  return `${articleDownloadPath(slug)}?view=1`;
}

/** True when the URL is a typeset Nahda PDF, not a Word/Office upload. */
export function isTypesetPdfUrl(url?: string | null) {
  const value = url?.trim() ?? "";
  if (!value) return false;
  const lower = value.toLowerCase();
  if (/\.(docx?|xlsx?|pptx?|rtf|odt|zip)(\?|#|$)/i.test(lower)) return false;
  if (lower.includes("published-pdfs")) return true;
  if (/\.pdf(\?|#|$)/i.test(lower)) return true;
  return false;
}

/**
 * Public download should be the Nahda-styled PDF created at publish,
 * never the author's original Word / Google Docs file.
 */
export function resolvePublishedPdfUrl(
  publishedUrl?: string | null,
  submissionUrl?: string | null,
) {
  if (isTypesetPdfUrl(publishedUrl)) return publishedUrl!.trim();
  if (isTypesetPdfUrl(submissionUrl)) return submissionUrl!.trim();
  return null;
}

/** Logged-in author checkout (no manuscript viewer). */
export function authorApcPayPath(submissionId: string) {
  return `/pay/s/${encodeURIComponent(submissionId)}`;
}
