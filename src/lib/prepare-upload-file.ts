/** Browser-only helpers to get manuscripts under Cloudinary's per-file cap. */

export const CLOUDINARY_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : mb.toFixed(1)} MB`;
}

export function friendlyUploadSizeError(message: string, fileSize?: number): string | null {
  const match = message.match(
    /File size too large\.\s*Got\s*(\d+)\.\s*Maximum is\s*(\d+)/i,
  );
  if (!match) return null;
  const got = Number(match[1]);
  const max = Number(match[2]);
  const shown = fileSize && fileSize > 0 ? fileSize : got;
  return (
    `This file is ${formatBytes(shown)} and exceeds the ${formatBytes(max)} upload limit. ` +
    `Compress images in the Word document (or export a smaller PDF) and try again.`
  );
}

function isDocx(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

function isRasterImage(file: File): boolean {
  return /image\/(jpeg|jpg|png|webp|gif)/i.test(file.type);
}

async function blobToJpeg(
  blob: Blob,
  maxEdge: number,
  quality: number,
): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const jpeg = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((out) => resolve(out), "image/jpeg", quality);
    });
    return jpeg && jpeg.size < blob.size ? jpeg : null;
  } catch {
    return null;
  }
}

async function shrinkRasterImage(file: File, maxBytes: number): Promise<File> {
  if (file.size <= maxBytes) return file;
  let quality = 0.78;
  let maxEdge = 1920;
  let best: Blob = file;
  for (let i = 0; i < 4 && best.size > maxBytes; i += 1) {
    const next = await blobToJpeg(best, maxEdge, quality);
    if (!next || next.size >= best.size) break;
    best = next;
    quality = Math.max(0.5, quality - 0.1);
    maxEdge = Math.max(1280, Math.round(maxEdge * 0.85));
  }
  if (best === file) return file;
  const name = file.name.replace(/\.[^.]+$/, ".jpg");
  return new File([best], name, { type: "image/jpeg" });
}

async function shrinkDocx(file: File, maxBytes: number): Promise<File> {
  if (file.size <= maxBytes) return file;
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);
  const mediaPaths = Object.keys(zip.files).filter((path) =>
    /^word\/media\//i.test(path),
  );

  for (const path of mediaPaths) {
    const entry = zip.files[path];
    if (!entry || entry.dir) continue;
    const original = await entry.async("blob");
    const jpeg = await blobToJpeg(original, 1600, 0.72);
    if (!jpeg) continue;
    const jpegPath = path.replace(/\.[^.]+$/, ".jpg");
    const oldName = path.split("/").pop();
    const newName = jpegPath.split("/").pop();
    zip.remove(path);
    zip.file(jpegPath, jpeg);
    if (oldName && newName && oldName !== newName) {
      const textPaths = Object.keys(zip.files).filter((p) =>
        /\.(xml|rels)$/i.test(p),
      );
      for (const xmlPath of textPaths) {
        const xmlEntry = zip.files[xmlPath];
        if (!xmlEntry || xmlEntry.dir) continue;
        const text = await xmlEntry.async("string");
        if (!text.includes(oldName)) continue;
        zip.file(xmlPath, text.split(oldName).join(newName));
      }
    }
  }

  const typesFile = zip.file("[Content_Types].xml");
  if (typesFile) {
    let xml = await typesFile.async("string");
    if (!/Extension="jpg"/i.test(xml)) {
      xml = xml.replace(
        /<Types[^>]*>/,
        (open) =>
          `${open}<Default Extension="jpg" ContentType="image/jpeg"/>`,
      );
    }
    zip.file("[Content_Types].xml", xml);
  }

  const out = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
  return new File([out], file.name, {
    type:
      file.type ||
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

/**
 * Reduce oversized Word/image uploads so Cloudinary's 10 MB free-plan cap
 * does not block a typical illustrated manuscript.
 */
export async function prepareUploadFile(
  file: File,
  maxBytes = CLOUDINARY_MAX_UPLOAD_BYTES,
): Promise<File> {
  if (file.size <= maxBytes) return file;
  try {
    if (isRasterImage(file)) return await shrinkRasterImage(file, maxBytes);
    if (isDocx(file)) return await shrinkDocx(file, maxBytes);
  } catch (err) {
    console.warn("[prepare-upload] could not compress file", err);
  }
  return file;
}
