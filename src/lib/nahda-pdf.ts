/**
 * Build an A4 PDF from the live Nahda article template in the admin browser.
 * Hobby-plan Vercel functions cannot run Chrome, so this never calls the server.
 */

import { CLOUDINARY_MAX_UPLOAD_BYTES } from "@/lib/prepare-upload-file";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const JPEG_QUALITY = 0.82;
const CAPTURE_SCALE = 2;

export function pdfErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message.trim()) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message: unknown }).message ?? "");
    if (message.trim()) return message;
  }
  return fallback;
}

function waitForImages(root: ParentNode) {
  const images = Array.from(root.querySelectorAll("img"));
  return Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        window.setTimeout(done, 4000);
      });
    }),
  );
}

function markImagesCors(root: ParentNode) {
  root.querySelectorAll("img").forEach((img) => {
    if (img.src && !img.src.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
  });
}

async function withOnscreenSource<T>(
  host: HTMLElement,
  run: () => Promise<T>,
): Promise<T> {
  const previous = host.getAttribute("style");
  host.style.left = "0";
  host.style.top = "0";
  host.style.opacity = "0";
  host.style.zIndex = "-1";
  host.style.position = "fixed";
  try {
    return await run();
  } finally {
    if (previous == null) host.removeAttribute("style");
    else host.setAttribute("style", previous);
  }
}

/** Rasterize the journal template in the browser and return an A4 PDF blob. */
export async function articleTemplateToPdf(
  source: HTMLElement,
): Promise<Blob> {
  const article =
    source.matches(".nahda-article")
      ? source
      : source.querySelector<HTMLElement>(".nahda-article");
  if (!article) {
    throw new Error("The Nahda article template is not ready yet.");
  }

  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready.catch(() => undefined);
  }
  markImagesCors(article);
  await waitForImages(article);

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const blob = await withOnscreenSource(source, async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 80));

    const widthPx = Math.max(article.scrollWidth, article.offsetWidth, 1);
    const heightPx = Math.max(article.scrollHeight, article.offsetHeight, 1);
    const pagePx = Math.max(1, Math.round(widthPx * (A4_HEIGHT_MM / A4_WIDTH_MM)));
    const pageCount = Math.max(1, Math.ceil(heightPx / pagePx));

    const pdf = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
      compress: true,
    });

    for (let i = 0; i < pageCount; i++) {
      const y = i * pagePx;
      const slice = Math.min(pagePx, heightPx - y);
      const canvas = await html2canvas(article, {
        scale: CAPTURE_SCALE,
        x: 0,
        y,
        width: widthPx,
        height: slice,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 15000,
      });
      const img = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      const heightMm = (slice / widthPx) * A4_WIDTH_MM;
      if (i > 0) pdf.addPage();
      pdf.addImage(img, "JPEG", 0, 0, A4_WIDTH_MM, heightMm, undefined, "FAST");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(91, 107, 124);
      pdf.text(String(i + 1), A4_WIDTH_MM - 14, A4_HEIGHT_MM - 8, {
        align: "right",
      });
    }

    return pdf.output("blob");
  });

  if (blob.size > CLOUDINARY_MAX_UPLOAD_BYTES) {
    throw new Error(
      "The printed PDF is too large to upload. Shorten figures or try again.",
    );
  }
  if (blob.size < 100) {
    throw new Error(
      "The Nahda print PDF was empty. Try Print preview, then Publish again.",
    );
  }
  return blob;
}

export function nahdaPdfFile(title: string, blob: Blob) {
  const base = (title || "article")
    .replace(/[^\w\s-]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return new File([blob], `${base || "nahda-article"}.pdf`, {
    type: "application/pdf",
  });
}
