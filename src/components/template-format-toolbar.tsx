"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { uploadFileDirect } from "@/lib/client-upload";
import type { ManuscriptFigure } from "@/components/manuscript-editor";

type Props = {
  /** Element that wraps the template editables (abstract + body). */
  scopeRef: RefObject<HTMLElement | null>;
  onError?: (message: string) => void;
  onFigureAdded?: (figure: ManuscriptFigure) => void;
  journalPrimary?: string;
};

function ToolBtn({
  title,
  onClick,
  children,
  disabled,
  active,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
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

function Divider() {
  return (
    <span className="mx-1 hidden h-5 w-px self-center bg-[var(--line)] sm:block" />
  );
}

const IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

function figureHtml(caption: string, url: string) {
  return `<figure class="figure-full"><img src="${url}" alt="${caption}" /><figcaption>${caption}</figcaption></figure>`;
}

/** Empty figure slot that shows “Select image to insert” via CSS. */
function isEmptyImagePlaceholder(figure: Element | null): figure is HTMLElement {
  if (!(figure instanceof HTMLElement) || figure.tagName !== "FIGURE") {
    return false;
  }
  if (figure.querySelector("img, table, .nahda-table-wrap")) return false;
  if (figure.classList.contains("table-full")) return false;
  if (figure.classList.contains("figure-full")) return true;
  const cap = figure.querySelector("figcaption")?.textContent ?? "";
  return /^\s*figure\b/i.test(cap);
}

function applyImagesToFigure(
  figure: HTMLElement,
  images: Array<{ url: string; caption: string }>,
) {
  const first = images[0];
  if (!first) return;

  figure.querySelectorAll(":scope > img").forEach((img) => img.remove());

  const existingCap = figure.querySelector("figcaption");
  const captionText =
    existingCap?.textContent?.trim() || first.caption || "Figure";

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
  figure.classList.add("figure-full");

  let last: Element = figure;
  for (const extra of images.slice(1)) {
    const tmp = document.createElement("div");
    tmp.innerHTML = figureHtml(extra.caption, extra.url);
    const next = tmp.firstElementChild;
    if (!next) continue;
    last.after(next);
    last = next;
  }
}

function insertHtmlAtRange(html: string, range: Range) {
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

function notifyEditorChanged(el: HTMLElement) {
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * Formatting + image tools for in-template abstract/body editing.
 * Applies to whichever `[data-nahda-rich]` field last held the caret.
 */
export function TemplateFormatToolbar({
  scopeRef,
  onError,
  onFigureAdded,
  journalPrimary,
}: Props) {
  const fileId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const activeEditorRef = useRef<HTMLElement | null>(null);
  const targetFigureRef = useRef<HTMLElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [linkLabel, setLinkLabel] = useState("");

  const capture = useCallback(() => {
    const scope = scopeRef.current;
    if (!scope) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const node = sel.anchorNode;
    const el =
      (node instanceof Element ? node : node?.parentElement)?.closest(
        "[data-nahda-rich='true']",
      ) ?? null;
    if (!(el instanceof HTMLElement) || !scope.contains(el)) return;
    activeEditorRef.current = el;
    try {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    } catch {
      /* ignore */
    }
  }, [scopeRef]);

  useEffect(() => {
    const onSel = () => capture();
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, [capture]);

  // Click “Select image to insert” placeholder → open OS file picker.
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (uploading) return;
      const scope = scopeRef.current;
      if (!scope) return;
      const target = e.target;
      if (!(target instanceof HTMLElement) || !scope.contains(target)) return;
      if (target.closest("figcaption")) return;
      const fig = target.closest("figure");
      if (!isEmptyImagePlaceholder(fig) || !scope.contains(fig)) return;

      e.preventDefault();
      e.stopPropagation();
      targetFigureRef.current = fig;
      const editor = fig.closest("[data-nahda-rich='true']");
      if (editor instanceof HTMLElement) activeEditorRef.current = editor;
      fileInputRef.current?.click();
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [scopeRef, uploading]);

  const restore = useCallback(() => {
    const el = activeEditorRef.current;
    const range = savedRangeRef.current;
    if (!el) return false;
    el.focus();
    if (!range) return true;
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
    (command: string, value?: string) => {
      capture();
      if (!restore()) {
        onError?.("Click in the abstract or body first, then use the toolbar.");
        return;
      }
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand(command, false, value);
      const el = activeEditorRef.current;
      if (el) notifyEditorChanged(el);
      capture();
    },
    [capture, restore, onError],
  );

  const insertHtml = useCallback(
    (html: string) => {
      capture();
      if (!restore()) {
        onError?.("Click in the abstract or body first, then insert.");
        return;
      }
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        insertHtmlAtRange(html, sel.getRangeAt(0));
      } else {
        document.execCommand("insertHTML", false, html);
      }
      const el = activeEditorRef.current;
      if (el) notifyEditorChanged(el);
      capture();
    },
    [capture, restore, onError],
  );

  async function onPickImages(files: FileList | null) {
    const placeholder = targetFigureRef.current;
    targetFigureRef.current = null;
    if (!files?.length) return;
    const list = Array.from(files).filter((f) =>
      IMAGE_TYPES.includes(f.type),
    );
    if (!list.length) {
      onError?.("Choose a PNG, JPEG, WebP, GIF, or SVG image.");
      return;
    }
    setUploading(true);
    try {
      const uploaded: Array<{ url: string; caption: string }> = [];
      for (const file of list) {
        const data = await uploadFileDirect(file, {
          folder: "atlas/article-figures",
        });
        const caption = file.name.replace(/\.[^.]+$/, "") || "Figure";
        const fig: ManuscriptFigure = {
          id: `fig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          url: data.url,
          filename: file.name,
          caption,
        };
        onFigureAdded?.(fig);
        uploaded.push({ url: data.url, caption });
      }

      const scope = scopeRef.current;
      if (
        placeholder &&
        scope?.contains(placeholder) &&
        isEmptyImagePlaceholder(placeholder)
      ) {
        applyImagesToFigure(placeholder, uploaded);
        const editor =
          activeEditorRef.current ??
          placeholder.closest("[data-nahda-rich='true']");
        if (editor instanceof HTMLElement) notifyEditorChanged(editor);
      } else {
        insertHtml(uploaded.map((u) => figureHtml(u.caption, u.url)).join(""));
      }
    } catch (err) {
      onError?.(
        err instanceof Error ? err.message : "Could not upload the image.",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function openImagePicker(forPlaceholder: HTMLElement | null = null) {
    targetFigureRef.current = forPlaceholder;
    fileInputRef.current?.click();
  }

  function insertLink() {
    const url = linkUrl.trim();
    if (!url || url === "https://") {
      onError?.("Enter a link URL.");
      return;
    }
    const label = linkLabel.trim() || url;
    insertHtml(
      `<a href="${url.replace(/"/g, "&quot;")}" target="_blank" rel="noreferrer">${label}</a>`,
    );
    setLinkOpen(false);
    setLinkLabel("");
    setLinkUrl("https://");
  }

  return (
    <div
      className="sticky top-0 z-20 space-y-1.5 border border-[var(--line)] bg-white/95 px-2 py-2 shadow-sm backdrop-blur-sm print:hidden"
      style={
        journalPrimary
          ? ({ "--j-primary": journalPrimary } as CSSProperties)
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Format abstract &amp; body
        </p>
        <span className="text-[10px] text-[var(--muted)]">
          {uploading
            ? "Uploading image…"
            : "Click in the text, then use these tools"}
        </span>
      </div>
      <div className="-mx-1 flex flex-nowrap items-center gap-0.5 overflow-x-auto px-1 sm:flex-wrap sm:overflow-visible">
        <ToolBtn title="Bold" onClick={() => run("bold")}>
          <span className="font-extrabold">B</span>
        </ToolBtn>
        <ToolBtn title="Italic" onClick={() => run("italic")}>
          <span className="italic">I</span>
        </ToolBtn>
        <ToolBtn title="Underline" onClick={() => run("underline")}>
          <span className="underline">U</span>
        </ToolBtn>
        <ToolBtn title="Strikethrough" onClick={() => run("strikeThrough")}>
          <span className="line-through">S</span>
        </ToolBtn>
        <ToolBtn title="Superscript" onClick={() => run("superscript")}>
          X²
        </ToolBtn>
        <ToolBtn title="Subscript" onClick={() => run("subscript")}>
          X₂
        </ToolBtn>
        <ToolBtn title="Clear formatting" onClick={() => run("removeFormat")}>
          Clear
        </ToolBtn>
        <Divider />
        <ToolBtn title="Align left" onClick={() => run("justifyLeft")}>
          Left
        </ToolBtn>
        <ToolBtn title="Align center" onClick={() => run("justifyCenter")}>
          Center
        </ToolBtn>
        <ToolBtn title="Align right" onClick={() => run("justifyRight")}>
          Right
        </ToolBtn>
        <ToolBtn title="Justify" onClick={() => run("justifyFull")}>
          Justify
        </ToolBtn>
        <Divider />
        <ToolBtn title="Heading 1" onClick={() => run("formatBlock", "<h1>")}>
          H1
        </ToolBtn>
        <ToolBtn title="Heading 2" onClick={() => run("formatBlock", "<h2>")}>
          H2
        </ToolBtn>
        <ToolBtn title="Heading 3" onClick={() => run("formatBlock", "<h3>")}>
          H3
        </ToolBtn>
        <ToolBtn
          title="Bullet list"
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
        <Divider />
        <ToolBtn
          title="Insert / edit link"
          active={linkOpen}
          onClick={() => setLinkOpen((o) => !o)}
        >
          Link
        </ToolBtn>
        <ToolBtn
          title="Insert a 3×3 table with visible grid lines"
          onClick={() =>
            insertHtml(
              `<figure class="table-full"><figcaption>Table 1.</figcaption><table><thead><tr><th>Column 1</th><th>Column 2</th><th>Column 3</th></tr></thead><tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table></figure><p><br></p>`,
            )
          }
        >
          Table
        </ToolBtn>
        <ToolBtn
          title="Upload image from your computer"
          disabled={uploading}
          onClick={() => openImagePicker(null)}
        >
          {uploading ? "Uploading…" : "Image"}
        </ToolBtn>
        <input
          id={fileId}
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          multiple
          className="hidden"
          onChange={(e) => void onPickImages(e.target.files)}
        />
      </div>
      {linkOpen ? (
        <div className="flex flex-wrap items-end gap-2 border-t border-[var(--line)] bg-[var(--surface)]/40 px-1 py-2">
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
      ) : null}
    </div>
  );
}
