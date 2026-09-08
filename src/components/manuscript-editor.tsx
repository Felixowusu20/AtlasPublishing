"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  WordTableEditor,
  htmlToTableModel,
  type WordTableModel,
} from "@/components/word-table-editor";
import { ManuscriptImportPanel } from "@/components/manuscript-import";
import { uploadFileDirect } from "@/lib/client-upload";
import {
  ensureManuscriptHtml,
  htmlToPlainText,
  sanitizeManuscriptHtml,
} from "@/lib/import-manuscript";

export type ManuscriptFigure = {
  id: string;
  url: string;
  filename: string;
  caption: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  figures: ManuscriptFigure[];
  onFiguresChange: (figures: ManuscriptFigure[]) => void;
  rows?: number;
  label?: string;
  hint?: string;
  onError?: (message: string) => void;
  showImport?: boolean;
  /** Journal heading color. Headings use this until you pick another. */
  journalPrimary?: string;
  /**
   * Seamlessly embeds inside the journal template page — no outer card chrome.
   */
  variant?: "card" | "template";
};

type ToolBtnProps = {
  title: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  active?: boolean;
};

function ToolBtn({ title, onClick, children, disabled, active }: ToolBtnProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-white text-[var(--accent)] shadow-sm ring-1 ring-[var(--accent)]/30"
          : "text-[var(--ink)] hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

function ToolGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-0.5 sm:flex-wrap">
      <span className="mr-0.5 hidden px-1 text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] xl:inline">
        {label}
      </span>
      {children}
    </div>
  );
}

function Divider() {
  return (
    <span className="mx-1 hidden h-5 w-px self-center bg-[var(--line)] sm:block" />
  );
}

const TEXT_COLORS = [
  { value: "#0b1f33", label: "Ink" },
  { value: "#5b6b7c", label: "Muted" },
  { value: "#b42318", label: "Red" },
  { value: "#c2410c", label: "Orange" },
  { value: "#a16207", label: "Gold" },
  { value: "#1a5f4a", label: "Green" },
  { value: "#1d4e89", label: "Blue" },
  { value: "#6b2d5b", label: "Plum" },
];

const HIGHLIGHT_COLORS = [
  { value: "#fef3c7", label: "Yellow" },
  { value: "#fecaca", label: "Red" },
  { value: "#bbf7d0", label: "Green" },
  { value: "#bfdbfe", label: "Blue" },
  { value: "#e9d5ff", label: "Purple" },
];

const FONT_OPTIONS = [
  { value: "", label: "Font" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Georgia", label: "Georgia" },
  { value: "Arial", label: "Arial" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Calibri", label: "Calibri" },
];

const SIZE_OPTIONS = [
  { value: "", label: "Size" },
  { value: "10", label: "10" },
  { value: "11", label: "11" },
  { value: "12", label: "12" },
  { value: "14", label: "14" },
  { value: "16", label: "16" },
  { value: "18", label: "18" },
  { value: "24", label: "24" },
];

const selectClass =
  "h-7 max-w-[9.5rem] rounded-md border border-[var(--line)] bg-white px-1.5 text-[11px] font-semibold text-[var(--ink)] outline-none hover:border-[var(--accent)]/40 focus:border-[var(--accent)]";

const IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

function figureHtml(caption: string, url: string, fullWidth: boolean) {
  const cls = fullWidth ? "figure-full" : "";
  return `<figure class="${cls}"><img src="${url}" alt="${caption}" /><figcaption>${caption}</figcaption></figure>`;
}

function isPlaceholderTable(figure: Element | null): figure is HTMLElement {
  if (!(figure instanceof HTMLElement) || figure.tagName !== "FIGURE") {
    return false;
  }
  if (figure.querySelector("img, table, .nahda-table-wrap")) return false;
  if (figure.classList.contains("table-full")) return true;
  const cap = figure.querySelector("figcaption")?.textContent ?? "";
  return /^\s*table\b/i.test(cap);
}

function isEditableFigure(figure: Element | null): figure is HTMLElement {
  if (!(figure instanceof HTMLElement) || figure.tagName !== "FIGURE") {
    return false;
  }
  if (figure.querySelector("table, .nahda-table-wrap") || isPlaceholderTable(figure)) {
    return false;
  }
  return true;
}

function closestTableTarget(
  node: Node | null,
  root: HTMLElement,
): HTMLElement | null {
  const el = node instanceof HTMLElement ? node : node?.parentElement;
  if (!el || !root.contains(el)) return null;
  const fig = el.closest("figure");
  if (
    fig &&
    root.contains(fig) &&
    (fig.querySelector("table, .nahda-table-wrap") || isPlaceholderTable(fig))
  ) {
    return fig;
  }
  const wrap = el.closest(".nahda-table-wrap");
  if (wrap && root.contains(wrap)) return wrap as HTMLElement;
  const table = el.closest("table");
  if (table && root.contains(table)) return table;
  return null;
}

function replaceTableTarget(target: HTMLElement, html: string): boolean {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const next = tmp.firstElementChild;
  if (!next) return false;
  const figure =
    target.tagName === "FIGURE" ? target : target.closest("figure");
  if (figure) {
    figure.replaceWith(next);
    return true;
  }
  const wrap = target.classList.contains("nahda-table-wrap")
    ? target
    : ((target.closest(".nahda-table-wrap") as HTMLElement | null) ?? target);
  const prev = wrap.previousElementSibling;
  if (
    prev &&
    /^table(?:\s+\d+)?(?:[.:]|\s|$)/i.test(prev.textContent?.trim() ?? "")
  ) {
    prev.remove();
  }
  wrap.replaceWith(next);
  return true;
}

function closestFigure(node: Node | null, root: HTMLElement): HTMLElement | null {
  const el = node instanceof HTMLElement ? node : node?.parentElement;
  if (!el || !root.contains(el)) return null;
  return el.closest("figure");
}

const FIGURE_HANDLES = ["nw", "ne", "sw", "se", "e", "w"] as const;
type FigureHandle = (typeof FIGURE_HANDLES)[number];

function clearFigureSelection(root: HTMLElement | null) {
  root
    ?.querySelectorAll("figure.nahda-fig-selected")
    .forEach((fig) => {
      fig.classList.remove("nahda-fig-selected");
      fig.querySelectorAll(".nahda-fig-chrome").forEach((n) => n.remove());
    });
}

function selectFigure(figure: HTMLElement, root: HTMLElement) {
  clearFigureSelection(root);
  figure.classList.add("nahda-fig-selected");
  if (figure.querySelector(":scope > .nahda-fig-chrome")) return;

  const chrome = document.createElement("div");
  chrome.className = "nahda-fig-chrome";
  chrome.contentEditable = "false";
  chrome.setAttribute("data-nahda-ui", "1");

  const bar = document.createElement("div");
  bar.className = "nahda-fig-toolbar";
  bar.innerHTML =
    '<button type="button" data-fig-action="replace">Replace</button>' +
    '<button type="button" data-fig-action="full">Full / column</button>' +
    '<span className="hint">Drag corners to stretch</span>';
  // fix: use text in span properly without className attribute in HTML
  bar.innerHTML =
    '<button type="button" data-fig-action="replace">Replace image</button>' +
    '<button type="button" data-fig-action="full">Full / column</button>' +
    '<button type="button" data-fig-action="supplementary">Supplementary</button>' +
    '<span data-fig-hint="1">Drag corners to stretch</span>';
  chrome.appendChild(bar);

  for (const pos of FIGURE_HANDLES) {
    const handle = document.createElement("span");
    handle.className = `nahda-fig-handle nahda-fig-handle-${pos}`;
    handle.dataset.handle = pos;
    chrome.appendChild(handle);
  }
  figure.appendChild(chrome);
}

function setFigureWidthPct(figure: HTMLElement, pct: number) {
  const clamped = Math.min(100, Math.max(18, Math.round(pct)));
  figure.style.width = `${clamped}%`;
  figure.style.maxWidth = "100%";
  figure.style.marginInline = clamped >= 96 ? "0" : "auto";
  figure.classList.toggle("figure-full", clamped >= 96);
  const img = figure.querySelector(":scope > img");
  if (img instanceof HTMLImageElement) {
    img.style.width = "100%";
    img.style.height = "auto";
    img.style.maxWidth = "100%";
  }
}

function insertFragmentAtRange(html: string, range: Range) {
  range.deleteContents();
  const frag = range.createContextualFragment(html);
  const last = frag.lastChild;
  range.insertNode(frag);
  if (!last) return;
  const after = document.createRange();
  after.setStartAfter(last);
  after.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(after);
}

function applyImagesToFigure(
  figure: HTMLElement,
  images: Array<{ url: string; caption: string }>,
  fullWidth: boolean,
) {
  const first = images[0];
  if (!first) return;

  figure.querySelectorAll(":scope > img").forEach((img) => img.remove());

  const existingCap = figure.querySelector("figcaption");
  const captionText =
    existingCap?.textContent?.trim() || first.caption || "Figure";
  const useFull = fullWidth || figure.classList.contains("figure-full");

  const img = document.createElement("img");
  img.src = first.url;
  img.alt = captionText;
  if (existingCap) figure.insertBefore(img, existingCap);
  else {
    figure.appendChild(img);
    const cap = document.createElement("figcaption");
    cap.textContent = captionText;
    figure.appendChild(cap);
  }
  figure.classList.toggle("figure-full", useFull);

  let last: Element = figure;
  for (const extra of images.slice(1)) {
    const tmp = document.createElement("div");
    tmp.innerHTML = figureHtml(extra.caption, extra.url, useFull);
    const next = tmp.firstElementChild;
    if (!next) continue;
    last.after(next);
    last = next;
  }
}

/**
 * Word-like body editor for imported Google Docs / .docx.
 * The journal template still owns title, authors, abstract, and keywords.
 */
export function ManuscriptEditor({
  value,
  onChange,
  figures,
  onFiguresChange,
  rows = 16,
  label = "Paper body (Introduction to References)",
  hint = "Import a Word or Google Doc, then bold, color, and tidy the text here. Header fields stay on the journal template.",
  onError,
  showImport = true,
  journalPrimary,
  variant = "card",
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const targetFigureRef = useRef<HTMLElement | null>(null);
  const targetTableRef = useRef<HTMLElement | null>(null);
  const lastEmitted = useRef(value);
  const seeded = useRef(false);
  const fileId = useId();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableSeed, setTableSeed] = useState<WordTableModel | null>(null);
  const [tableUpdateMode, setTableUpdateMode] = useState(false);
  const [tableEditorKey, setTableEditorKey] = useState(0);
  const [figureFullWidth, setFigureFullWidth] = useState(true);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [linkLabel, setLinkLabel] = useState("");
  const dragDepth = useRef(0);
  const resizingRef = useRef(false);

  const emit = useCallback(() => {
    const root = editorRef.current;
    if (!root) return;
    // Don't persist selection chrome into the manuscript HTML.
    const clone = root.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll(".nahda-fig-chrome, .nahda-fig-selected")
      .forEach((n) => {
        if (n.classList.contains("nahda-fig-chrome")) n.remove();
        else n.classList.remove("nahda-fig-selected");
      });
    const html = clone.innerHTML;
    lastEmitted.current = html;
    onChange(html);
  }, [onChange]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (!seeded.current) {
      const html = ensureManuscriptHtml(value);
      el.innerHTML = html;
      // Always leave a trailing empty paragraph so there is a place to click and type.
      if (!el.querySelector("p:last-of-type") || el.lastElementChild?.tagName === "FIGURE") {
        const spacer = document.createElement("p");
        spacer.innerHTML = "<br>";
        el.appendChild(spacer);
      }
      lastEmitted.current = el.innerHTML;
      seeded.current = true;
      if (el.innerHTML !== value) onChange(el.innerHTML);
      return;
    }
    if (value === lastEmitted.current) return;
    const html = ensureManuscriptHtml(value);
    el.innerHTML = html;
    lastEmitted.current = html;
  }, [value, onChange]);

  useEffect(() => {
    function onDocMouseDown(e: globalThis.MouseEvent) {
      const root = editorRef.current;
      if (!root || resizingRef.current) return;
      const t = e.target as Node | null;
      if (t && root.contains(t) && (t as HTMLElement).closest?.("figure.nahda-fig-selected")) {
        return;
      }
      if (t && root.contains(t) && (t as HTMLElement).closest?.("figure")) return;
      clearFigureSelection(root);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const captureInsertPoint = useCallback(
    (e?: { target?: EventTarget | null }) => {
      const root = editorRef.current;
      if (!root) return;

      const fromEvent =
        e?.target instanceof Node ? closestFigure(e.target, root) : null;
      if (isEditableFigure(fromEvent)) {
        targetFigureRef.current = fromEvent;
      }

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!root.contains(range.commonAncestorContainer)) return;
      savedRangeRef.current = range.cloneRange();
      if (!isEditableFigure(fromEvent)) {
        const fig = closestFigure(range.commonAncestorContainer, root);
        targetFigureRef.current = isEditableFigure(fig) ? fig : null;
      }
    },
    [],
  );

  const restoreInsertPoint = useCallback(() => {
    const root = editorRef.current;
    const range = savedRangeRef.current;
    if (!root || !range) return false;
    root.focus();
    const sel = window.getSelection();
    if (!sel) return false;
    try {
      sel.removeAllRanges();
      sel.addRange(range);
      return true;
    } catch {
      return false;
    }
  }, []);

  const run = useCallback(
    (command: string, commandValue?: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand(command, false, commandValue);
      emit();
    },
    [emit],
  );

  const insertHtml = useCallback(
    (html: string) => {
      const root = editorRef.current;
      if (!root) return;

      const sel = window.getSelection();
      const liveInEditor =
        Boolean(sel?.rangeCount) && root.contains(sel?.anchorNode ?? null);
      if (!liveInEditor) restoreInsertPoint();

      const nextSel = window.getSelection();
      const range =
        nextSel &&
        nextSel.rangeCount > 0 &&
        root.contains(nextSel.anchorNode)
          ? nextSel.getRangeAt(0)
          : savedRangeRef.current;

      if (range) {
        try {
          insertFragmentAtRange(html, range);
          emit();
          return;
        } catch {
          /* fall through */
        }
      }

      root.focus();
      document.execCommand("insertHTML", false, html);
      emit();
    },
    [emit, restoreInsertPoint],
  );

  function applyFont(font: string) {
    const heading = colorTargetFromSelection();
    const root = editorRef.current;
    if (heading && root?.contains(heading)) {
      heading.style.fontFamily = font;
      emit();
      return;
    }
    run("fontName", font);
  }

  function applySize(size: string) {
    const heading = colorTargetFromSelection();
    const root = editorRef.current;
    if (heading && root?.contains(heading)) {
      heading.style.fontSize = `${size}pt`;
      heading.style.letterSpacing = "normal";
      emit();
      return;
    }
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("fontSize", false, "7");
    el.querySelectorAll('font[size="7"], span[style*="xxx-large"]').forEach(
      (node) => {
        const span = document.createElement("span");
        span.style.fontSize = `${size}pt`;
        span.innerHTML = (node as HTMLElement).innerHTML;
        node.replaceWith(span);
      },
    );
    emit();
  }

  function colorTargetFromSelection(): HTMLElement | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const node = sel.anchorNode;
    const el = node instanceof HTMLElement ? node : node?.parentElement;
    if (!el) return null;
    return el.closest("h1, h2, h3, h4, th") as HTMLElement | null;
  }

  function applyColor(color: string, kind: "fore" | "back") {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand("styleWithCSS", false, "true");

    const heading = kind === "fore" ? colorTargetFromSelection() : null;
    if (heading && el.contains(heading)) {
      if (!color) {
        heading.style.removeProperty("color");
        heading.removeAttribute("data-custom-color");
      } else {
        heading.style.color = color;
        heading.setAttribute("data-custom-color", "true");
      }
      heading.querySelectorAll("span[style]").forEach((span) => {
        (span as HTMLElement).style.removeProperty("color");
        if (!(span as HTMLElement).getAttribute("style")?.trim()) {
          span.replaceWith(...Array.from(span.childNodes));
        }
      });
      emit();
      return;
    }

    if (kind === "fore") {
      if (!color) {
        document.execCommand("foreColor", false, "#0b1f33");
      } else {
        document.execCommand("foreColor", false, color);
      }
      const sel = window.getSelection();
      const node = sel?.anchorNode;
      const painted =
        (node instanceof HTMLElement ? node : node?.parentElement)?.closest(
          "span, font",
        ) ?? null;
      if (painted instanceof HTMLElement && el.contains(painted)) {
        if (color && color.toLowerCase() !== "#0b1f33") {
          painted.setAttribute("data-custom-color", "true");
        } else {
          painted.removeAttribute("data-custom-color");
          painted.style.removeProperty("color");
        }
      }
    } else {
      const ok = document.execCommand("hiliteColor", false, color);
      if (!ok) document.execCommand("backColor", false, color);
    }
    emit();
  }

  function insertLink() {
    const label = linkLabel.trim() || "link";
    const url = linkUrl.trim() || "https://";
    insertHtml(
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`,
    );
    setLinkOpen(false);
    setLinkLabel("");
    setLinkUrl("https://");
  }

  async function uploadImageFiles(files: File[]) {
    const images = files.filter(
      (f) =>
        IMAGE_TYPES.includes(f.type) ||
        /\.(png|jpe?g|gif|webp|svg)$/i.test(f.name),
    );
    if (images.length === 0) {
      onError?.("Drop image files only (PNG, JPG, WebP, GIF, SVG).");
      return;
    }

    setUploading(true);
    try {
      const added: ManuscriptFigure[] = [];
      let insertText = "";

      for (const file of images) {
        const data = await uploadFileDirect(file, {
          folder: "atlas/article-figures",
          resourceType: "image",
        });
        const ext = (file.name.split(".").pop() || "png").toLowerCase();
        const id = `fig-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const filename = `${id}.${ext}`;
        const caption = file.name.replace(/\.[^.]+$/, "") || "Figure";
        added.push({ id, url: data.url, filename, caption });
        insertText += figureHtml(caption, data.url, figureFullWidth);
      }

      onFiguresChange([...figures, ...added]);

      const placeholder = targetFigureRef.current;
      const root = editorRef.current;
      if (
        placeholder &&
        root?.contains(placeholder) &&
        isEditableFigure(placeholder)
      ) {
        applyImagesToFigure(
          placeholder,
          added.map((a) => ({ url: a.url, caption: a.caption })),
          figureFullWidth,
        );
        targetFigureRef.current = null;
        emit();
      } else {
        insertHtml(insertText);
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Figure upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onFigureUpload(e: ChangeEvent<HTMLInputElement>) {
    const list = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (list.length) await uploadImageFiles(list);
  }

  function onDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    if (e.dataTransfer.types.includes("Files")) setDragOver(true);
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
      setDragOver(true);
    }
  }

  async function onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setDragOver(false);
    const root = editorRef.current;
    const over =
      root && e.target instanceof Node ? closestFigure(e.target, root) : null;
    if (isEditableFigure(over)) {
      targetFigureRef.current = over;
    } else {
      captureInsertPoint();
    }
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) await uploadImageFiles(files);
  }

  function applyTableHtml(html: string) {
    const root = editorRef.current;
    const target = targetTableRef.current;
    if (target && root?.contains(target) && replaceTableTarget(target, html)) {
      targetTableRef.current = null;
      emit();
      setTableOpen(false);
      return;
    }
    insertHtml(html);
    setTableOpen(false);
  }

  function openTableEditor(el: HTMLElement) {
    const root = editorRef.current;
    if (!root) return;
    if (tableOpen && targetTableRef.current === el) return;
    targetTableRef.current = el;
    const siblingCaption =
      el.previousElementSibling &&
      /^table(?:\s+\d+)?(?:[.:]|\s|$)/i.test(
        el.previousElementSibling.textContent?.trim() ?? "",
      )
        ? el.previousElementSibling.textContent?.trim() ?? ""
        : "";
    setTableSeed(htmlToTableModel(el, siblingCaption));
    setTableUpdateMode(true);
    setTableEditorKey((k) => k + 1);
    setTableOpen(true);
    setLinkOpen(false);
  }

  function onEditorClick(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const root = editorRef.current;
    if (!root) return;

    if (target.closest(".nahda-fig-chrome")) {
      const action = target.closest("[data-fig-action]")?.getAttribute("data-fig-action");
      const fig = target.closest("figure");
      if (!fig || !root.contains(fig)) return;
      e.preventDefault();
      e.stopPropagation();
      if (action === "replace") {
        targetFigureRef.current = fig;
        fileInputRef.current?.click();
      } else if (action === "full") {
        const nextFull = !fig.classList.contains("figure-full");
        setFigureWidthPct(fig, nextFull ? 100 : 62);
        emit();
      } else if (action === "supplementary") {
        fig.classList.toggle("nahda-supplementary");
        emit();
      }
      return;
    }

    const tableTarget = closestTableTarget(target, root);
    if (tableTarget) {
      e.preventDefault();
      openTableEditor(tableTarget);
      return;
    }

    if (target.closest("figcaption")) {
      clearFigureSelection(root);
      return;
    }

    const fig = target.closest("figure");
    if (isEditableFigure(fig) && root.contains(fig)) {
      e.preventDefault();
      targetFigureRef.current = fig;
      // Empty “Select image to insert” slot → open the OS file picker.
      if (!fig.querySelector("img")) {
        fileInputRef.current?.click();
        return;
      }
      selectFigure(fig, root);
      return;
    }

    clearFigureSelection(root);
  }

  function onEditorDoubleClick(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const root = editorRef.current;
    if (!root) return;
    if (target.closest("figcaption, .nahda-fig-chrome")) return;
    const fig = target.closest("figure");
    if (!isEditableFigure(fig) || !root.contains(fig)) return;
    e.preventDefault();
    targetFigureRef.current = fig;
    fileInputRef.current?.click();
  }

  function onEditorMouseDown(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const root = editorRef.current;
    if (!root) return;
    const handle = target.closest(".nahda-fig-handle") as HTMLElement | null;
    if (!handle) return;
    const fig = handle.closest("figure");
    if (!fig || !root.contains(fig)) return;
    e.preventDefault();
    e.stopPropagation();

    const pos = (handle.dataset.handle || "e") as FigureHandle;
    const startX = e.clientX;
    const parentW = fig.parentElement?.clientWidth || fig.offsetWidth;
    const startW = fig.offsetWidth;
    const startPct = (startW / parentW) * 100;
    resizingRef.current = true;

    function onMove(ev: globalThis.MouseEvent) {
      const dx = ev.clientX - startX;
      const signed =
        pos === "w" || pos === "nw" || pos === "sw" ? -dx : dx;
      setFigureWidthPct(fig!, startPct + (signed / parentW) * 100);
    }

    function onUp() {
      resizingRef.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      emit();
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function removeFigure(id: string) {
    const fig = figures.find((f) => f.id === id);
    onFiguresChange(figures.filter((f) => f.id !== id));
    const el = editorRef.current;
    if (!el || !fig) return;
    el.querySelectorAll("img").forEach((img) => {
      if (img.getAttribute("src") !== fig.url) return;
      const wrap = img.closest("figure") ?? img;
      wrap.remove();
    });
    emit();
  }

  function updateCaption(id: string, caption: string) {
    const fig = figures.find((f) => f.id === id);
    if (!fig) return;
    onFiguresChange(
      figures.map((f) => (f.id === id ? { ...f, caption } : f)),
    );
    const el = editorRef.current;
    if (!el) return;
    el.querySelectorAll("img").forEach((img) => {
      if (img.getAttribute("src") !== fig.url) return;
      img.setAttribute("alt", caption);
      const cap = img.closest("figure")?.querySelector("figcaption");
      if (cap) cap.textContent = caption;
    });
    emit();
  }

  function toggleFigureWidth(id: string) {
    const fig = figures.find((f) => f.id === id);
    const el = editorRef.current;
    if (!el || !fig) return;
    el.querySelectorAll("img").forEach((img) => {
      if (img.getAttribute("src") !== fig.url) return;
      const wrap = img.closest("figure");
      if (!wrap) return;
      wrap.classList.toggle("figure-full");
    });
    emit();
  }

  function moveFigure(id: string, dir: -1 | 1) {
    const i = figures.findIndex((f) => f.id === id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= figures.length) return;
    const next = [...figures];
    [next[i], next[j]] = [next[j], next[i]];
    onFiguresChange(next);
  }

  const wordCount = htmlToPlainText(value).split(/\s+/).filter(Boolean).length;
  const minHeight = Math.max(12, rows) * 22;
  const isTemplate = variant === "template";

  return (
    <div className={isTemplate ? "space-y-2" : "space-y-3"}>
      {!isTemplate && label ? (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-[var(--ink)]">{label}</span>
          <span className="text-[10px] text-[var(--muted)]">
            {wordCount.toLocaleString()} words · {figures.length} figure
            {figures.length === 1 ? "" : "s"}
          </span>
        </div>
      ) : null}

      {!isTemplate && hint ? (
        <p className="text-[11px] leading-relaxed text-[var(--muted)]">{hint}</p>
      ) : null}

      {showImport ? (
        <ManuscriptImportPanel
          hasExistingBody={Boolean(htmlToPlainText(value))}
          onError={onError}
          onImported={(result) => {
            onChange(result.body);
            onFiguresChange(result.figures);
          }}
        />
      ) : null}

      <div
        className={`relative overflow-hidden bg-white transition ${
          isTemplate
            ? dragOver
              ? "rounded-lg ring-2 ring-[var(--accent)]/35"
              : "rounded-none"
            : dragOver
              ? "rounded-xl border border-[var(--accent)] shadow-sm ring-2 ring-[var(--accent)]/30"
              : "rounded-xl border border-[var(--line)] shadow-sm"
        }`}
        style={
          journalPrimary
            ? ({ "--j-primary": journalPrimary } as CSSProperties)
            : undefined
        }
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={(e) => void onDrop(e)}
      >
        {dragOver && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[var(--accent)]/12 backdrop-blur-[1px]">
            <div className="rounded-xl bg-white px-5 py-4 text-center shadow-lg">
              <p className="text-sm font-semibold text-[var(--accent)]">
                Drop images to insert figures
              </p>
            </div>
          </div>
        )}

        <div
          className={`sticky top-0 z-[5] space-y-1.5 border-b border-[var(--line)] px-2 py-2 ${
            isTemplate
              ? "bg-white/95 backdrop-blur-sm"
              : "bg-gradient-to-b from-[#f7f9fb] to-[var(--surface)]"
          }`}
        >
          {isTemplate ? (
            <div className="flex items-center justify-between gap-2 px-1 pb-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Article body · click to place cursor
              </p>
              <span className="text-[10px] text-[var(--muted)]">
                {wordCount.toLocaleString()} words · {figures.length} figure
                {figures.length === 1 ? "" : "s"}
              </span>
            </div>
          ) : null}
          <div
            className="-mx-1 flex flex-nowrap items-center gap-y-1.5 overflow-x-auto px-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
            onMouseDownCapture={(e) => {
              const t = e.target as HTMLElement;
              if (t.closest("input, textarea")) return;
              captureInsertPoint();
            }}
          >
            <ToolGroup label="Font">
              <select
                className={selectClass}
                defaultValue=""
                title="Font family"
                aria-label="Font family"
                onChange={(e) => {
                  const font = e.target.value;
                  e.target.value = "";
                  if (font) applyFont(font);
                }}
              >
                {FONT_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value} disabled={!o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                className={`${selectClass} max-w-[4.5rem]`}
                defaultValue=""
                title="Font size"
                aria-label="Font size"
                onChange={(e) => {
                  const size = e.target.value;
                  e.target.value = "";
                  if (size) applySize(size);
                }}
              >
                {SIZE_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value} disabled={!o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </ToolGroup>
            <Divider />
            <ToolGroup label="Style">
              <ToolBtn title="Bold (Ctrl/Cmd+B)" onClick={() => run("bold")}>
                <span className="font-extrabold">B</span>
              </ToolBtn>
              <ToolBtn title="Italic" onClick={() => run("italic")}>
                <span className="italic">I</span>
              </ToolBtn>
              <ToolBtn title="Underline" onClick={() => run("underline")}>
                <span className="underline">U</span>
              </ToolBtn>
              <ToolBtn
                title="Strikethrough"
                onClick={() => run("strikeThrough")}
              >
                <span className="line-through">S</span>
              </ToolBtn>
              <ToolBtn
                title="Superscript"
                onClick={() => run("superscript")}
              >
                X²
              </ToolBtn>
              <ToolBtn title="Subscript" onClick={() => run("subscript")}>
                X₂
              </ToolBtn>
              <ToolBtn
                title="Clear formatting"
                onClick={() => run("removeFormat")}
              >
                Clear
              </ToolBtn>
            </ToolGroup>
            <Divider />
            <ToolGroup label="Color">
              <button
                type="button"
                title="Journal heading color"
                className="h-5 w-5 rounded-sm border border-black/15 ring-1 ring-black/5"
                style={{
                  background: journalPrimary || "var(--j-primary, var(--accent))",
                }}
                onClick={() => applyColor("", "fore")}
              />
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={`Text ${c.label}`}
                  className="h-5 w-5 rounded-sm border border-black/10"
                  style={{ background: c.value }}
                  onClick={() => applyColor(c.value, "fore")}
                />
              ))}
              <label
                className="ml-1 flex h-6 w-6 cursor-pointer items-center overflow-hidden rounded-sm border border-[var(--line)]"
                title="Custom text color"
              >
                <input
                  type="color"
                  defaultValue="#0b1f33"
                  className="h-8 w-8 -translate-x-1 -translate-y-1 cursor-pointer"
                  onChange={(e) => applyColor(e.target.value, "fore")}
                />
              </label>
              <span className="mx-1 text-[10px] text-[var(--muted)]">Hi</span>
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={`Highlight ${c.label}`}
                  className="h-5 w-5 rounded-sm border border-black/10"
                  style={{ background: c.value }}
                  onClick={() => applyColor(c.value, "back")}
                />
              ))}
            </ToolGroup>
            <Divider />
            <ToolGroup label="Align">
              <ToolBtn title="Align left" onClick={() => run("justifyLeft")}>
                Left
              </ToolBtn>
              <ToolBtn
                title="Align center"
                onClick={() => run("justifyCenter")}
              >
                Center
              </ToolBtn>
              <ToolBtn title="Align right" onClick={() => run("justifyRight")}>
                Right
              </ToolBtn>
              <ToolBtn title="Justify" onClick={() => run("justifyFull")}>
                Justify
              </ToolBtn>
            </ToolGroup>
            <Divider />
            <ToolGroup label="Lists">
              <ToolBtn
                title="Bulleted list"
                onClick={() => run("insertUnorderedList")}
              >
                • List
              </ToolBtn>
              <ToolBtn
                title="Numbered list"
                onClick={() => run("insertOrderedList")}
              >
                1. List
              </ToolBtn>
              <ToolBtn
                title="Increase indent"
                onClick={() => run("indent")}
              >
                → Indent
              </ToolBtn>
              <ToolBtn
                title="Decrease indent"
                onClick={() => run("outdent")}
              >
                ← Outdent
              </ToolBtn>
            </ToolGroup>
            <Divider />
            <ToolGroup label="Para">
              <ToolBtn
                title="Heading 1 — section"
                onClick={() => run("formatBlock", "<h1>")}
              >
                H1
              </ToolBtn>
              <ToolBtn
                title="Heading 2 — subsection"
                onClick={() => run("formatBlock", "<h2>")}
              >
                H2
              </ToolBtn>
              <ToolBtn
                title="Heading 3"
                onClick={() => run("formatBlock", "<h3>")}
              >
                H3
              </ToolBtn>
              <ToolBtn
                title="Block quote"
                onClick={() => run("formatBlock", "<blockquote>")}
              >
                Quote
              </ToolBtn>
              <ToolBtn
                title="Insert / edit hyperlink"
                active={linkOpen}
                onClick={() => {
                  setLinkOpen((o) => !o);
                  setTableOpen(false);
                }}
              >
                Link
              </ToolBtn>
            </ToolGroup>
            <Divider />
            <ToolGroup label="Insert">
              <ToolBtn
                title="Insert or edit table"
                active={tableOpen}
                onClick={() => {
                  const root = editorRef.current;
                  const sel = window.getSelection();
                  const fromSel =
                    root && sel?.anchorNode
                      ? closestTableTarget(sel.anchorNode, root)
                      : null;
                  if (fromSel) {
                    openTableEditor(fromSel);
                    return;
                  }
                  if (
                    targetFigureRef.current &&
                    isPlaceholderTable(targetFigureRef.current) &&
                    root?.contains(targetFigureRef.current)
                  ) {
                    openTableEditor(targetFigureRef.current);
                    return;
                  }
                  targetTableRef.current = null;
                  setTableUpdateMode(false);
                  setTableSeed({
                    headers: ["Column 1", "Column 2", "Column 3"],
                    rows: [
                      ["", "", ""],
                      ["", "", ""],
                      ["", "", ""],
                    ],
                    caption: "",
                    fullWidth: true,
                    orientation: "normal",
                    supplementary: false,
                  });
                  setTableEditorKey((k) => k + 1);
                  setTableOpen((o) => !o);
                  setLinkOpen(false);
                }}
              >
                Table
              </ToolBtn>
              <label
                htmlFor={fileId}
                className="cursor-pointer rounded-md px-2 py-1.5 text-[11px] font-semibold text-[var(--ink)] transition hover:bg-white"
                title="Upload figure (or drag & drop)"
              >
                {uploading ? "Uploading…" : "Figure"}
              </label>
              <input
                id={fileId}
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                className="hidden"
                multiple
                disabled={uploading}
                onChange={(e) => void onFigureUpload(e)}
              />
              <ToolBtn
                title={
                  figureFullWidth
                    ? "Figures: full width — click to use one column"
                    : "Figures: one column — click for full width"
                }
                active={figureFullWidth}
                onClick={() => setFigureFullWidth((v) => !v)}
              >
                {figureFullWidth ? "Fig: Full" : "Fig: Col"}
              </ToolBtn>
            </ToolGroup>
          </div>
          <p className="px-1 text-[10px] text-[var(--muted)]">
            Select text, then Bold / color / highlight. Edits stay in this
            journal&apos;s article layout.
          </p>
        </div>

        {linkOpen && (
          <div className="flex flex-wrap items-end gap-2 border-b border-[var(--line)] bg-white px-3 py-2.5">
            <label className="min-w-[120px] flex-1 text-[11px] text-[var(--muted)]">
              Label
              <input
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                placeholder="Link text"
                className="mt-0.5 block w-full rounded border border-[var(--line)] px-2 py-1.5 text-xs"
              />
            </label>
            <label className="min-w-[180px] flex-[2] text-[11px] text-[var(--muted)]">
              URL
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://"
                className="mt-0.5 block w-full rounded border border-[var(--line)] px-2 py-1.5 text-xs"
              />
            </label>
            <button
              type="button"
              className="btn-secondary !px-2.5 !py-1.5 text-[11px]"
              onClick={insertLink}
            >
              Insert link
            </button>
          </div>
        )}

        {tableOpen && (
          <div className="border-b border-[var(--line)] bg-[var(--surface)]/30 px-3 py-3">
            <WordTableEditor
              key={tableEditorKey}
              initial={tableSeed}
              updateMode={tableUpdateMode}
              onCancel={() => {
                setTableOpen(false);
                targetTableRef.current = null;
              }}
              onInsert={applyTableHtml}
            />
          </div>
        )}

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          data-placeholder="Click here to place the cursor and type — or import a Word / Google Doc"
          className={`manuscript-wysiwyg nahda-article-body block w-full overflow-auto bg-white text-[15px] leading-[1.7] text-[var(--ink)] outline-none ${
            isTemplate ? "min-h-[28rem] px-0 py-3" : "resize-y px-4 py-4"
          }`}
          style={{
            minHeight,
            caretColor: journalPrimary || "var(--accent, #1d4e89)",
            fontFamily: "Georgia, 'Times New Roman', 'Liberation Serif', serif",
          }}
          onInput={emit}
          onMouseDown={onEditorMouseDown}
          onMouseUp={captureInsertPoint}
          onKeyUp={captureInsertPoint}
          onClick={onEditorClick}
          onDoubleClick={onEditorDoubleClick}
          onPaste={(e) => {
            const html = e.clipboardData.getData("text/html");
            if (!html) return;
            e.preventDefault();
            insertHtml(sanitizeManuscriptHtml(html));
          }}
        />

        <div
          className={`flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-[var(--line)] px-3 py-2 text-[11px] text-[var(--muted)] ${
            isTemplate ? "bg-transparent" : "bg-[var(--surface)]/50"
          }`}
        >
          <span>
            {uploading
              ? "Uploading image…"
              : "Click a figure to select · drag corners to stretch · double-click to replace"}
          </span>
          <span className="font-medium text-[var(--ink)]/70">
            Blinking cursor marks the insert point
          </span>
        </div>
      </div>

      {!isTemplate && figures.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-[var(--ink)]">
            Figures in manuscript
          </p>
          {figures.map((fig, index) => (
            <figure
              key={fig.id}
              className="overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fig.url}
                alt={fig.caption}
                className="block h-auto w-full max-h-[420px] bg-[#f5f7fa] object-contain"
              />
              <figcaption className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                <span className="text-[10px] font-semibold text-[var(--muted)]">
                  Fig. {index + 1}
                </span>
                <input
                  value={fig.caption}
                  onChange={(e) => updateCaption(fig.id, e.target.value)}
                  className="min-w-0 flex-1 rounded border border-[var(--line)] px-2 py-1.5 text-xs"
                  placeholder="Caption"
                />
                <button
                  type="button"
                  className="rounded-md border border-[var(--line)] px-2 py-1 text-[11px] font-semibold text-[var(--ink)]"
                  onClick={() => toggleFigureWidth(fig.id)}
                >
                  Width
                </button>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-[var(--muted)]"
                  disabled={index === 0}
                  onClick={() => moveFigure(fig.id, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-[var(--muted)]"
                  disabled={index === figures.length - 1}
                  onClick={() => moveFigure(fig.id, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-rose-700"
                  onClick={() => removeFigure(fig.id)}
                >
                  Remove
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
