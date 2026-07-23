/** Helpers for in-browser manuscript preview (no forced download). */

export type FileKind = "pdf" | "image" | "office" | "other";

export function fileExtension(url: string): string {
  try {
    const path = new URL(url).pathname;
    const base = path.split("/").pop() ?? "";
    const match = base.match(/\.([a-z0-9]+)$/i);
    return (match?.[1] ?? "").toLowerCase();
  } catch {
    const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    return (match?.[1] ?? "").toLowerCase();
  }
}

export function detectFileKind(url: string): FileKind {
  const ext = fileExtension(url);
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext)) {
    return "image";
  }
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)) {
    return "office";
  }
  return "other";
}

export function mimeFromUrl(url: string): string {
  const ext = fileExtension(url);
  const map: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  return map[ext] ?? "application/octet-stream";
}

/** Strip Cloudinary attachment flags so browsers can render inline. */
export function toInlineCloudinaryUrl(url: string): string {
  return url
    .replace(/\/fl_attachment(?::[^/]+)?\//g, "/")
    .replace(/([?&])fl_attachment(?:=[^&]*)?/, "$1")
    .replace(/\?&/, "?")
    .replace(/[?&]$/, "");
}

export function officeEmbedUrl(fileUrl: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

export function googleEmbedUrl(fileUrl: string): string {
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`;
}
