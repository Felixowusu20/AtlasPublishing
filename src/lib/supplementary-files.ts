export type SupplementaryFile = {
  id: string;
  label: string;
  fileName: string;
  url: string;
};

export function supplementaryPath(slug: string) {
  return `/articles/${slug}/supplementary`;
}

export function parseSupplementaryFiles(value: unknown): SupplementaryFile[] {
  if (!Array.isArray(value)) return [];
  const files: SupplementaryFile[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const url = typeof row.url === "string" ? row.url.trim() : "";
    const fileName = typeof row.fileName === "string" ? row.fileName.trim() : "";
    const id = typeof row.id === "string" ? row.id.trim() : "";
    if (!url || !fileName || !id) continue;
    const label =
      typeof row.label === "string" && row.label.trim()
        ? row.label.trim()
        : fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
    files.push({ id, label, fileName, url });
  }
  return files;
}
