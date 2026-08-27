/**
 * Build an A4 PDF from the live Nahda article template in the admin browser.
 * Hobby-plan Vercel functions cannot run Chrome, so this never calls the server.
 *
 * Page box matches Print preview: 210×297 mm with 12/14/18 mm margins, plus
 * the running footer (logo, copyright, DOI, page number) on every page.
 */

import { CLOUDINARY_MAX_UPLOAD_BYTES } from "@/lib/prepare-upload-file";
import type { jsPDF } from "jspdf";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_TOP_MM = 12;
const MARGIN_X_MM = 14;
const MARGIN_BOTTOM_MM = 18;
const CONTENT_WIDTH_MM = A4_WIDTH_MM - MARGIN_X_MM * 2;
const CONTENT_HEIGHT_MM = A4_HEIGHT_MM - MARGIN_TOP_MM - MARGIN_BOTTOM_MM;
const CAPTURE_SCALE = 2;
const UPLOAD_BUDGET_BYTES = CLOUDINARY_MAX_UPLOAD_BYTES - 128 * 1024;
const JPEG_QUALITIES = [0.76, 0.64, 0.52, 0.42, 0.34];

type PageShot = {
  canvas: HTMLCanvasElement;
  heightMm: number;
};

type FooterBits = {
  copyright: string;
  doi: string;
};

type LogoPng = {
  dataUrl: string;
  width: number;
  height: number;
};

export function pdfErrorMessage(err: unknown, fallback: string) {
  let message = "";
  if (err instanceof Error && err.message.trim()) message = err.message;
  else if (typeof err === "string" && err.trim()) message = err;
  else if (err && typeof err === "object" && "message" in err) {
    message = String((err as { message: unknown }).message ?? "");
  }
  if (/google chrome is required/i.test(message) || /install chrome/i.test(message)) {
    return "This admin page is still running the old PDF printer. Hard-refresh (Cmd-Shift-R), then Publish again. Chrome is not required.";
  }
  if (message.trim()) return message;
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

function restoreOpacity(root: HTMLElement) {
  root.style.opacity = "1";
  root.style.visibility = "visible";
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    el.style.opacity = "1";
    el.style.visibility = "visible";
  });
}

async function withOnscreenSource<T>(
  host: HTMLElement,
  run: () => Promise<T>,
): Promise<T> {
  const previous = host.getAttribute("style");
  host.style.left = "0";
  host.style.top = "0";
  host.style.opacity = "1";
  host.style.zIndex = "-1";
  host.style.position = "fixed";
  restoreOpacity(host);
  try {
    return await run();
  } finally {
    if (previous == null) host.removeAttribute("style");
    else host.setAttribute("style", previous);
  }
}

function jpegDataUrl(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL("image/jpeg", quality);
}

function footerBits(root: HTMLElement): FooterBits {
  const footer = root.querySelector(".nahda-running-footer");
  const copyright =
    footer?.querySelector("p")?.textContent?.replace(/\s+/g, " ").trim() ||
    `© ${new Date().getFullYear()} The Authors. Published by Nahda Publications`;
  const doiLink = footer?.querySelector("a");
  const doi =
    doiLink?.textContent?.replace(/\s+/g, " ").trim() ||
    doiLink?.getAttribute("href")?.trim() ||
    "";
  return { copyright, doi };
}

async function loadLogo(): Promise<LogoPng | null> {
  try {
    const res = await fetch("/brand/logo-nahda.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("logo"));
      image.src = dataUrl;
    });
    if (!img.naturalWidth || !img.naturalHeight) return null;
    return {
      dataUrl,
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  } catch {
    return null;
  }
}

function paintFooter(
  pdf: jsPDF,
  page: number,
  bits: FooterBits,
  logo: LogoPng | null,
) {
  const textY = A4_HEIGHT_MM - 8;
  const pageY = A4_HEIGHT_MM - 5;
  let textX = MARGIN_X_MM;

  if (logo) {
    const heightMm = 4.2;
    const widthMm = (logo.width / logo.height) * heightMm;
    pdf.addImage(
      logo.dataUrl,
      "PNG",
      MARGIN_X_MM,
      A4_HEIGHT_MM - 12.2,
      widthMm,
      heightMm,
    );
    textX = MARGIN_X_MM + widthMm + 2.2;
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(91, 107, 124);

  const pageWidth = pdf.getTextWidth(String(page)) + 4;
  const doiWidth = bits.doi ? pdf.getTextWidth(bits.doi) + 6 : 0;
  const copyMax = Math.max(
    24,
    A4_WIDTH_MM - MARGIN_X_MM - textX - doiWidth - pageWidth,
  );
  pdf.text(pdf.splitTextToSize(bits.copyright, copyMax)[0], textX, textY);

  if (bits.doi) {
    pdf.text(bits.doi, A4_WIDTH_MM - MARGIN_X_MM - pageWidth, textY, {
      align: "right",
    });
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text(String(page), A4_WIDTH_MM - MARGIN_X_MM, pageY, { align: "right" });
}

function buildPdfFromPages(
  JsPDF: typeof jsPDF,
  pages: PageShot[],
  quality: number,
  bits: FooterBits,
  logo: LogoPng | null,
): Blob {
  const pdf = new JsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    compress: true,
  });

  pages.forEach((page, i) => {
    const img = jpegDataUrl(page.canvas, quality);
    if (i > 0) pdf.addPage();
    pdf.addImage(
      img,
      "JPEG",
      MARGIN_X_MM,
      MARGIN_TOP_MM,
      CONTENT_WIDTH_MM,
      page.heightMm,
      undefined,
      "SLOW",
    );
    paintFooter(pdf, i + 1, bits, logo);
  });

  return pdf.output("blob");
}

function packPdf(
  JsPDF: typeof jsPDF,
  pages: PageShot[],
  bits: FooterBits,
  logo: LogoPng | null,
): Blob {
  let best: Blob | null = null;
  for (const quality of JPEG_QUALITIES) {
    const blob = buildPdfFromPages(JsPDF, pages, quality, bits, logo);
    best = blob;
    if (blob.size <= UPLOAD_BUDGET_BYTES) return blob;
  }
  if (best && best.size <= CLOUDINARY_MAX_UPLOAD_BYTES) return best;
  throw new Error(
    "The journal PDF is still over the 10 MB upload limit after compression. Try Publish again.",
  );
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

  const bits = footerBits(source);
  const [{ default: html2canvas }, { jsPDF: JsPDF }, logo] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
    loadLogo(),
  ]);

  const blob = await withOnscreenSource(source, async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 80));

    const widthPx = Math.max(article.scrollWidth, article.offsetWidth, 1);
    const heightPx = Math.max(article.scrollHeight, article.offsetHeight, 1);
    const pagePx = Math.max(
      1,
      Math.round(widthPx * (CONTENT_HEIGHT_MM / CONTENT_WIDTH_MM)),
    );
    const pageCount = Math.max(1, Math.ceil(heightPx / pagePx));
    const pages: PageShot[] = [];

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
        onclone: (_doc, cloned) => restoreOpacity(cloned),
      });
      pages.push({
        canvas,
        heightMm: (slice / widthPx) * CONTENT_WIDTH_MM,
      });
    }

    return packPdf(JsPDF, pages, bits, logo);
  });

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
