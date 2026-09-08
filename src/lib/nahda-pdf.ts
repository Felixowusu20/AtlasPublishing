/**
 * Build an A4 PDF from the live Nahda article template in the admin browser.
 * Hobby-plan Vercel functions cannot run Chrome, so this never calls the server.
 *
 * Paged.js paginates like Chrome Print (whole A4 sheets, two columns, figures
 * stay together). Each sheet is captured once — never sliced through a line.
 * The Nahda footer is drawn in jsPDF so author PDFs have no admin chrome.
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
const SAFETY_GAP_MM = 7;
const PAGE_CONTENT_MM = CONTENT_HEIGHT_MM - SAFETY_GAP_MM;
const CAPTURE_SCALE = 2;
const MAX_CANVAS_PX = 16000;
const QUIET_GAP_ROWS = 12;
const UPLOAD_BUDGET_BYTES = CLOUDINARY_MAX_UPLOAD_BYTES - 128 * 1024;
const JPEG_QUALITIES = [0.76, 0.64, 0.52, 0.42, 0.34];
const PAGED_TIMEOUT_MS = 120000;
const MAX_PAGED_PAGES = 80;

const PAGED_CSS = `
@page {
  size: A4;
  margin: 12mm 14mm 18mm;
}

.pagedjs_pages,
.pagedjs_page {
  background: #fff !important;
  box-shadow: none !important;
  margin: 0 !important;
  padding: 0 !important;
}

.pagedjs_bleed,
.pagedjs_marks-crop,
.pagedjs_marks-middle,
.pagedjs_marks-cross {
  display: none !important;
}

.pagedjs_page_content > div {
  height: 100% !important;
  max-height: 100% !important;
  column-count: 2 !important;
  column-gap: 7mm !important;
  column-fill: auto !important;
}

.nahda-paged-article {
  font-family: Georgia, "Times New Roman", serif;
  color: #0b1f33;
}

.nahda-paged-article .nahda-article-inner,
.nahda-paged-article .nahda-article-flow,
.nahda-paged-article .nahda-article-body {
  display: contents !important;
}

.nahda-paged-article > header,
.nahda-paged-article .nahda-article-front,
.nahda-paged-article .nahda-article-abstract,
.nahda-paged-article .nahda-keywords,
.nahda-paged-article figure,
.nahda-paged-article .nahda-end-matter,
.nahda-paged-article .nahda-span-all,
.nahda-paged-article .nahda-workflow,
.nahda-paged-article .nahda-table-wrap {
  column-span: all;
  break-inside: avoid;
  page-break-inside: avoid;
  -webkit-column-break-inside: avoid;
}

.nahda-paged-article .nahda-article-body > figure,
.nahda-paged-article .nahda-article-body > .nahda-table-wrap,
.nahda-paged-article .nahda-article-body > .nahda-workflow,
.nahda-paged-article .nahda-article-body > .nahda-supplementary {
  column-span: all;
  width: 100%;
  max-width: 100%;
  break-inside: avoid;
  page-break-inside: avoid;
}

.nahda-paged-article .nahda-references ~ figure:has(img),
.nahda-paged-article .nahda-references ~ figure:has(table),
.nahda-paged-article .nahda-references ~ .nahda-table-wrap,
.nahda-paged-article .nahda-references ~ .nahda-workflow {
  column-span: all;
  break-inside: avoid;
  page-break-inside: avoid;
  width: 100%;
  max-width: 100%;
}

.nahda-paged-article .nahda-supplementary {
  column-span: all;
  display: block;
  width: 100%;
  max-width: 100%;
  break-inside: avoid;
  page-break-inside: avoid;
}

.nahda-paged-article h1,
.nahda-paged-article h2,
.nahda-paged-article h3,
.nahda-paged-article h4 {
  break-after: avoid;
  page-break-after: avoid;
}

.nahda-paged-article img {
  display: block;
  max-width: 100%;
  width: auto;
  height: auto;
  max-height: 220mm;
  object-fit: contain;
}

.nahda-paged-article figure,
.nahda-paged-article .nahda-workflow {
  max-height: 230mm;
  margin: 0.7em 0 0.85em;
}

.nahda-paged-article p,
.nahda-paged-article li {
  orphans: 3;
  widows: 3;
}
`;

type PageShot = {
  canvas: HTMLCanvasElement;
  heightMm: number;
  fullPage?: boolean;
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

type Html2CanvasFn = (
  element: HTMLElement,
  options?: Record<string, unknown>,
) => Promise<HTMLCanvasElement>;

type PagedPreviewer = {
  preview: (
    content: Node,
    stylesheets: Array<string | Record<string, string>>,
    renderTo: HTMLElement,
  ) => Promise<{ total?: number }>;
  polisher: { destroy: () => void };
};

let printTitleBefore = "";

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

/** Hide Chrome Print date/title headers (CSS cannot disable those). */
export function beginArticlePrint(_title?: string) {
  printTitleBefore = document.title;
  document.title = "\u200b";
  document.documentElement.classList.add("nahda-print-article");
}

export function endArticlePrint() {
  if (printTitleBefore) document.title = printTitleBefore;
  document.documentElement.classList.remove("nahda-print-article");
}

const PRINT_HEADER_MM = 13;
const MM_TO_PT = 72 / 25.4;

/**
 * Cover Chrome's Print date (top-left) and document title (top) so a
 * saved Print PDF can go to authors without that browser chrome.
 */
export async function stripChromePrintHeader(file: File): Promise<File> {
  try {
    const { PDFDocument, rgb } = await import("pdf-lib");
    const pdf = await PDFDocument.load(await file.arrayBuffer());
    const band = PRINT_HEADER_MM * MM_TO_PT;
    for (const page of pdf.getPages()) {
      const { width, height } = page.getSize();
      page.drawRectangle({
        x: 0,
        y: height - band,
        width,
        height: band,
        color: rgb(1, 1, 1),
      });
    }
    const bytes = await pdf.save();
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const base = file.name.replace(/\.pdf$/i, "") || "article";
    return new File([copy], `${base}.pdf`, { type: "application/pdf" });
  } catch (err) {
    console.warn("[nahda-pdf] could not strip print header", err);
    return file;
  }
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

function restoreCaptureStyles(root: HTMLElement, widthPx?: number) {
  root.style.opacity = "1";
  root.style.visibility = "visible";
  root.style.overflow = "visible";
  root.style.height = "auto";
  root.style.clipPath = "none";
  if (widthPx) {
    root.style.width = `${widthPx}px`;
    root.style.maxWidth = `${widthPx}px`;
  }
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const keepMax =
      el.tagName === "IMG" ||
      el.tagName === "FIGURE" ||
      el.tagName === "TABLE" ||
      el.classList.contains("nahda-workflow") ||
      el.classList.contains("nahda-table-wrap");
    el.style.opacity = "1";
    el.style.visibility = "visible";
    el.style.overflow = keepMax ? el.style.overflow : "visible";
    el.style.clipPath = "none";
    el.style.setProperty("-webkit-clip-path", "none");
    if (el.tagName === "IMG") {
      el.style.maxWidth = "100%";
      el.style.height = "auto";
      el.style.objectFit = "contain";
    }
  });
}

function fitUnbreakableBlocks(root: HTMLElement, maxCssPx: number) {
  const blocks = root.querySelectorAll<HTMLElement>(
    "figure, .nahda-workflow, .nahda-table-wrap",
  );
  blocks.forEach((el) => {
    el.style.breakInside = "avoid";
    el.style.pageBreakInside = "avoid";
    const height = Math.max(el.scrollHeight, el.offsetHeight);
    if (height <= maxCssPx) {
      el.style.maxHeight = `${maxCssPx}px`;
      return;
    }
    const scale = maxCssPx / height;
    el.style.transform = `scale(${scale})`;
    el.style.transformOrigin = "top center";
    el.style.width = "100%";
    el.style.marginBottom = `${-(height - maxCssPx)}px`;
    el.style.maxHeight = `${maxCssPx}px`;
  });
  root.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    img.style.maxHeight = `${maxCssPx}px`;
    img.style.width = "auto";
    img.style.maxWidth = "100%";
    img.style.objectFit = "contain";
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
  host.style.overflow = "visible";
  restoreCaptureStyles(host);
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

  const pageLabelWidth = pdf.getTextWidth(String(page)) + 4;
  const doiWidth = bits.doi ? pdf.getTextWidth(bits.doi) + 6 : 0;
  const copyMax = Math.max(
    24,
    A4_WIDTH_MM - MARGIN_X_MM - textX - doiWidth - pageLabelWidth,
  );
  pdf.text(pdf.splitTextToSize(bits.copyright, copyMax)[0], textX, textY);

  if (bits.doi) {
    pdf.text(bits.doi, A4_WIDTH_MM - MARGIN_X_MM - pageLabelWidth, textY, {
      align: "right",
    });
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text(String(page), A4_WIDTH_MM - MARGIN_X_MM, pageY, { align: "right" });
}

function sliceCanvas(
  source: HTMLCanvasElement,
  sy: number,
  sh: number,
): HTMLCanvasElement {
  const height = Math.max(1, Math.round(sh));
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = height;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Could not create a PDF page.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(
    source,
    0,
    Math.max(0, Math.round(sy)),
    source.width,
    height,
    0,
    0,
    source.width,
    height,
  );
  return out;
}

function rowProfile(ctx: CanvasRenderingContext2D, y: number, width: number) {
  const row = ctx.getImageData(0, y, width, 1).data;
  const gutter = Math.max(8, Math.round(width * 0.035));
  const col = Math.floor((width - gutter) / 2);
  const darkIn = (x0: number, x1: number) => {
    const start = Math.max(0, Math.floor(x0));
    const end = Math.min(width, Math.ceil(x1));
    let dark = 0;
    let samples = 0;
    for (let x = start; x < end; x += 2) {
      const i = x * 4;
      samples += 1;
      if (row[i] < 248 || row[i + 1] < 248 || row[i + 2] < 248) dark += 1;
    }
    return { dark, samples: Math.max(1, samples) };
  };
  const left = darkIn(2, col - 2);
  const right = darkIn(col + gutter + 2, width - 2);
  const mid = darkIn(col - 2, col + gutter + 2);
  const leftQuiet = left.dark <= 1;
  const rightQuiet = right.dark <= 1;
  const fullSpan =
    mid.dark / mid.samples > 0.12 ||
    (left.dark + right.dark) / (left.samples + right.samples) > 0.45;
  return { leftQuiet, rightQuiet, quiet: leftQuiet && rightQuiet, fullSpan };
}

function isQuietRow(
  ctx: CanvasRenderingContext2D,
  y: number,
  width: number,
): boolean {
  return rowProfile(ctx, y, width).quiet;
}

function consecutiveQuiet(
  ctx: CanvasRenderingContext2D,
  y: number,
  width: number,
  rows: number,
): boolean {
  const maxY = (ctx.canvas.height || 1) - 1;
  for (let i = 0; i < rows; i++) {
    const yy = Math.min(maxY, y + i);
    if (!isQuietRow(ctx, yy, width)) return false;
  }
  return true;
}

type InkBand = { start: number; end: number };

function figureBands(canvas: HTMLCanvasElement): InkBand[] {
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  const width = canvas.width;
  const bands: InkBand[] = [];
  let start = -1;
  for (let y = 0; y < canvas.height; y += 2) {
    const span = rowProfile(ctx, y, width).fullSpan;
    if (span && start < 0) start = y;
    if (!span && start >= 0) {
      bands.push({ start, end: y });
      start = -1;
    }
  }
  if (start >= 0) bands.push({ start, end: canvas.height });
  const merged: InkBand[] = [];
  for (const band of bands) {
    const prev = merged[merged.length - 1];
    if (prev && band.start - prev.end < 18) prev.end = band.end;
    else merged.push({ ...band });
  }
  return merged.filter((b) => b.end - b.start > 24);
}

function lastQuietGap(
  ctx: CanvasRenderingContext2D,
  from: number,
  to: number,
  width: number,
): number | null {
  for (let y = from; y >= to; y -= 1) {
    if (consecutiveQuiet(ctx, y, width, QUIET_GAP_ROWS)) {
      return Math.min(ctx.canvas.height, y + 4);
    }
  }
  for (let y = from; y >= to; y -= 1) {
    if (isQuietRow(ctx, y, width)) return y;
  }
  return null;
}

/** Never slice through a line of type or through a figure. */
function findBreakY(
  canvas: HTMLCanvasElement,
  pageStart: number,
  targetY: number,
): number {
  const maxY = canvas.height;
  const goal = Math.min(maxY, Math.max(pageStart + 8, Math.round(targetY) - 6));
  if (goal >= maxY) return maxY;
  const ctx = canvas.getContext("2d");
  if (!ctx) return goal;
  const minKeep = pageStart + Math.round((goal - pageStart) * 0.22);

  for (const band of figureBands(canvas)) {
    const cutsFigure = band.start < goal && band.end > goal;
    if (!cutsFigure) continue;
    if (band.start > pageStart + 16) {
      return Math.max(pageStart + 8, band.start - 6);
    }
    if (band.end - pageStart <= goal - pageStart + 12) {
      return Math.min(maxY, band.end + 6);
    }
  }

  const gap = lastQuietGap(ctx, goal, Math.max(pageStart + 8, minKeep), canvas.width);
  if (gap != null) return gap;
  const fallback = lastQuietGap(ctx, goal, pageStart + 8, canvas.width);
  if (fallback != null) return fallback;
  return goal;
}

function skipLeadingQuiet(canvas: HTMLCanvasElement, y: number): number {
  const ctx = canvas.getContext("2d");
  if (!ctx) return y;
  const maxSkip = Math.min(canvas.height - 1, y + 48);
  let t = y;
  while (t < maxSkip && isQuietRow(ctx, t, canvas.width)) t += 1;
  return t;
}

function pageHeightMm(canvas: HTMLCanvasElement): number {
  const ratio = canvas.height / Math.max(1, canvas.width);
  return Math.min(CONTENT_HEIGHT_MM, ratio * CONTENT_WIDTH_MM);
}

function paginateCanvas(
  source: HTMLCanvasElement,
  pageCssPx: number,
  cssWidth: number,
): PageShot[] {
  const scale = source.width / Math.max(1, cssWidth);
  const pageCanvasPx = Math.max(1, Math.round(pageCssPx * scale));
  const pages: PageShot[] = [];
  let y = 0;
  while (y < source.height - 1) {
    const remaining = source.height - y;
    if (remaining <= pageCanvasPx + 10) {
      const canvas = sliceCanvas(source, y, remaining);
      pages.push({ canvas, heightMm: pageHeightMm(canvas) });
      break;
    }
    const breakAt = findBreakY(source, y, y + pageCanvasPx);
    const sliceH = Math.max(1, breakAt - y);
    const canvas = sliceCanvas(source, y, sliceH);
    pages.push({ canvas, heightMm: pageHeightMm(canvas) });
    if (breakAt >= source.height - 1) break;
    const next = skipLeadingQuiet(source, breakAt);
    y = next > y ? next : y + sliceH;
  }
  return pages.length
    ? pages
    : [{ canvas: source, heightMm: CONTENT_HEIGHT_MM }];
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
    if (page.fullPage) {
      pdf.addImage(img, "JPEG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, "SLOW");
    } else {
      pdf.addImage(
        img,
        "JPEG",
        MARGIN_X_MM,
        MARGIN_TOP_MM,
        CONTENT_WIDTH_MM,
        Math.min(CONTENT_HEIGHT_MM, page.heightMm),
        undefined,
        "SLOW",
      );
    }
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

async function captureWindow(
  html2canvas: Html2CanvasFn,
  article: HTMLElement,
  widthPx: number,
  y: number,
  height: number,
  pageCssPx: number,
): Promise<HTMLCanvasElement> {
  return html2canvas(article, {
    scale: CAPTURE_SCALE,
    x: 0,
    y,
    width: widthPx,
    height,
    scrollX: 0,
    scrollY: 0,
    windowWidth: widthPx,
    windowHeight: Math.max(height, article.scrollHeight),
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    imageTimeout: 15000,
    onclone: (_doc: Document, cloned: HTMLElement) => {
      restoreCaptureStyles(cloned, widthPx);
      fitUnbreakableBlocks(cloned, Math.floor(pageCssPx * 0.92));
    },
  });
}

function preparePagedArticle(article: HTMLElement): HTMLElement {
  const clone = article.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.classList.add("nahda-paged-article");
  clone.classList.remove("nahda-pdf-print", "nahda-pdf-source");
  clone.querySelectorAll(".nahda-running-footer, tfoot").forEach((el) => el.remove());

  const table = clone.querySelector(".nahda-print-frame");
  const cell = table?.querySelector("tbody > tr > td");
  if (table && cell && table.parentElement) {
    while (cell.firstChild) table.parentElement.insertBefore(cell.firstChild, table);
    table.remove();
  }

  clone.style.margin = "0";
  clone.style.maxWidth = "none";
  clone.style.width = "100%";
  return clone;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function cleanupPaged(
  mount: HTMLElement | null,
  previewer: PagedPreviewer | null,
) {
  try {
    previewer?.polisher?.destroy();
  } catch {
    /* ignore */
  }
  mount?.remove();
  document
    .querySelectorAll("[data-nahda-paged], style[data-pagedjs-inserted-styles]")
    .forEach((el) => el.remove());
}

async function capturePagedPages(
  html2canvas: Html2CanvasFn,
  article: HTMLElement,
): Promise<PageShot[] | null> {
  let mount: HTMLElement | null = null;
  let previewer: PagedPreviewer | null = null;
  try {
    const { Previewer } = await import("pagedjs");
    const prepared = preparePagedArticle(article);
    markImagesCors(prepared);

    mount = document.createElement("div");
    mount.setAttribute("data-nahda-paged", "true");
    const vars = article.getAttribute("style") || "";
    mount.setAttribute(
      "style",
      `${vars};position:fixed;left:0;top:0;z-index:-1;background:#fff;width:210mm;`,
    );
    document.body.appendChild(mount);

    const sourceHolder = document.createElement("div");
    sourceHolder.style.position = "absolute";
    sourceHolder.style.left = "-12000px";
    sourceHolder.style.width = `${CONTENT_WIDTH_MM}mm`;
    sourceHolder.appendChild(prepared);
    mount.appendChild(sourceHolder);

    await waitForImages(prepared);
    const widthPx = Math.max(sourceHolder.offsetWidth, prepared.offsetWidth, 1);
    const pageCssPx = Math.round((CONTENT_HEIGHT_MM / CONTENT_WIDTH_MM) * widthPx);
    fitUnbreakableBlocks(prepared, Math.floor(pageCssPx * 0.92));

    previewer = new Previewer();
    const previewStyles = Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
    )
      .map((link) => link.href)
      .filter(Boolean);
    const sheets = [
      ...previewStyles,
      { [`${window.location.origin}/nahda-paged.css`]: PAGED_CSS },
    ];
    await withTimeout(
      previewer.preview(prepared, sheets, mount),
      PAGED_TIMEOUT_MS,
      "The journal template took too long to paginate. Try Publish again.",
    );

    sourceHolder.remove();

    const pageEls = Array.from(
      mount.querySelectorAll<HTMLElement>(".pagedjs_page"),
    ).filter((el) => !el.classList.contains("pagedjs_blank_page"));

    if (!pageEls.length || pageEls.length > MAX_PAGED_PAGES) return null;

    pageEls.forEach((pageEl) => {
      const area = pageEl.querySelector<HTMLElement>(".pagedjs_page_content");
      if (area) area.style.overflow = "hidden";
      pageEl.style.boxShadow = "none";
      pageEl.style.margin = "0";
      pageEl.style.background = "#ffffff";
    });

    await waitForImages(mount);
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
    });

    const pages: PageShot[] = [];
    for (const pageEl of pageEls) {
      const sheet =
        pageEl.querySelector<HTMLElement>(".pagedjs_sheet") || pageEl;
      const width = Math.max(sheet.offsetWidth, pageEl.offsetWidth, 1);
      const height = Math.max(sheet.offsetHeight, pageEl.offsetHeight, 1);
      const canvas = await html2canvas(sheet, {
        scale: CAPTURE_SCALE,
        width,
        height,
        windowWidth: width,
        windowHeight: height,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 15000,
        onclone: (_doc: Document, cloned: HTMLElement) => {
          cloned.style.opacity = "1";
          cloned.style.visibility = "visible";
          cloned.style.transform = "none";
          cloned.style.boxShadow = "none";
          cloned.style.margin = "0";
          cloned.style.background = "#ffffff";
        },
      });
      pages.push({ canvas, heightMm: A4_HEIGHT_MM, fullPage: true });
    }

    return pages.length ? pages : null;
  } catch (err) {
    console.warn("[nahda-pdf] paged layout failed, using fallback", err);
    return null;
  } finally {
    cleanupPaged(mount, previewer);
  }
}

async function captureSlicedPages(
  html2canvas: Html2CanvasFn,
  article: HTMLElement,
): Promise<PageShot[]> {
  const widthPx = Math.max(article.offsetWidth, 1);
  const heightPx = Math.max(article.scrollHeight, article.offsetHeight, 1);
  const pageCssPx = Math.max(
    1,
    Math.round(widthPx * (PAGE_CONTENT_MM / CONTENT_WIDTH_MM)),
  );

  const canCaptureWhole =
    heightPx * CAPTURE_SCALE < MAX_CANVAS_PX &&
    widthPx * CAPTURE_SCALE < MAX_CANVAS_PX;

  if (canCaptureWhole) {
    const full = await captureWindow(
      html2canvas,
      article,
      widthPx,
      0,
      heightPx,
      pageCssPx,
    );
    return paginateCanvas(full, pageCssPx, widthPx);
  }

  const pages: PageShot[] = [];
  let y = 0;
  while (y < heightPx - 2) {
    const remaining = heightPx - y;
    const captureCss = Math.min(remaining, Math.round(pageCssPx * 1.35));
    const shot = await captureWindow(
      html2canvas,
      article,
      widthPx,
      y,
      captureCss,
      pageCssPx,
    );
    if (remaining <= pageCssPx) {
      pages.push({ canvas: shot, heightMm: pageHeightMm(shot) });
      break;
    }
    const target = Math.round((pageCssPx / captureCss) * shot.height);
    const breakAt = findBreakY(shot, 0, target);
    const pageCanvas =
      breakAt >= shot.height - 1 ? shot : sliceCanvas(shot, 0, breakAt);
    const usedCss = (breakAt / shot.height) * captureCss;
    pages.push({
      canvas: pageCanvas,
      heightMm: pageHeightMm(pageCanvas),
    });
    y += Math.max(24, usedCss);
  }
  return pages.length ? pages : [{ canvas: document.createElement("canvas"), heightMm: CONTENT_HEIGHT_MM }];
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
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    void article.offsetHeight;

    const paged = await capturePagedPages(html2canvas, article);
    const pages = paged ?? (await captureSlicedPages(html2canvas, article));
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
