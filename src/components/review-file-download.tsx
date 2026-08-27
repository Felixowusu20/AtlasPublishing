"use client";

import { reviewFileDownloadPath } from "@/lib/review-file";

export type ReviewFileFields = {
  id: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileBytes?: number | null;
};

export function hasReviewFile(item: ReviewFileFields) {
  return Boolean(item.fileUrl && item.fileName);
}

function formatSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return ` (${bytes} B)`;
  const kb = bytes / 1024;
  if (kb < 1024) return ` (${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB)`;
  const mb = bytes / (1024 * 1024);
  return ` (${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB)`;
}

export function ReviewFileDownload({
  submissionId,
  item,
  className,
}: {
  submissionId: string;
  item: ReviewFileFields;
  className?: string;
}) {
  if (!hasReviewFile(item) || !item.fileName) return null;
  return (
    <a
      href={reviewFileDownloadPath(submissionId, item.id)}
      className={
        className ??
        "mt-3 inline-flex items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
      }
    >
      Download {item.fileName}
      {formatSize(item.fileBytes)}
    </a>
  );
}
