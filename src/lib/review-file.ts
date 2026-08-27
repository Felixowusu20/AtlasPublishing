export function reviewFileDownloadPath(
  submissionId: string,
  feedbackId: string,
  token?: string,
) {
  const path = `/api/submissions/${submissionId}/feedback/${feedbackId}/file`;
  if (!token) return path;
  return `${path}?token=${encodeURIComponent(token)}`;
}

export function safeDownloadName(name: string | null | undefined) {
  const cleaned = (name || "review-file")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 180) || "review-file";
}
