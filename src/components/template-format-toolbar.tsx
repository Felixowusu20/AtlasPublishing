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
import {
  WordTableEditor,
  htmlToTableModel,
  type WordTableModel,
} from "@/components/word-table-editor";
import { sanitizeManuscriptHtml } from "@/lib/import-manuscript";
import {
  FONT_OPTIONS,
  FONT_SIZE_SUGGESTIONS,
  HIGHLIGHT_COLORS,
  TEXT_COLORS,
  TOOLBAR_SELECT_CLASS,
  applyColorToEditor,
  applyFontToEditor,
  applySizeToEditor,
  closestTableTarget,
  isPlaceholderTable,
  replaceTableTarget,
} from "@/lib/rich-text-format-helpers";
import {
  applyResizeDrag,
  clearFigureSelection,
  figureFromResizeHandle,
  selectResizableFigure,
  setFigureWidthPct,
} from "@/lib/nahda-figure-chrome";
import {
  cycleTableAngle,
  layoutTableFigures,
  tableAngleLabel,
} from "@/lib/nahda-table-orient";

type Props = {
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
      onMouseDown={(e) => {
        // Keep the article selection, and run now — some browsers drop click
        // after preventDefault, which made the whole toolbar look dead.
        e.preventDefault();
        if (!disabled) onClick();
      }}
      onClick={(e) => {
        if (e.detail === 0 && !disabled) onClick();
      }}
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

const EMPTY_TABLE: WordTableModel = {
  headers: ["Column 1", "Column 2", "Column 3"],
  rows: [
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ],
  caption: "Table 1.",
  fullWidth: true,
  orientation: 0,
  supplementary: false,
};

function figureHtml(caption: string, url: string) {
  return `<figure class="figure-full"><img src="${url}" alt="${caption}" /><figcaption>${caption}</figcaption></figure>`;
}

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

export function TemplateFormatToolbar({
  scopeRef,
  onError,
  onFigureAdded,
  journalPrimary,
}: Props) {
  const fileId = useId();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const activeEditorRef = useRef<HTMLElement | null>(null);
  const preserveSelectionRef = useRef(false);
  const sizeListId = useId();
  const targetFigureRef = useRef<HTMLElement | null>(null);
  const targetTableRef = useRef<HTMLElement | null>(null);

  const [uploading, setUploading] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableUpdateMode, setTableUpdateMode] = useState(false);
  const [tableEditorKey, setTableEditorKey] = useState(0);
  const [tableSeed, setTableSeed] = useState<WordTableModel>(EMPTY_TABLE);
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
    const onSel = () => {
      // Focusing a toolbar control collapses the highlight. Keep the range
      // captured on pointerdown so font, size, and style still hit that text.
      if (preserveSelectionRef.current) return;
      if (toolbarRef.current?.contains(document.activeElement)) return;
      capture();
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, [capture]);

  /** Keep the last text highlight before toolbar controls steal focus. */
  useEffect(() => {
    const bar = toolbarRef.current;
    if (!bar) return;
    const stash = () => {
      preserveSelectionRef.current = true;
      capture();
    };
    const release = () => {
      window.setTimeout(() => {
        preserveSelectionRef.current = false;
      }, 0);
    };
    bar.addEventListener("pointerdown", stash, true);
    bar.addEventListener("pointerup", release, true);
    bar.addEventListener("pointercancel", release, true);
    return () => {
      bar.removeEventListener("pointerdown", stash, true);
      bar.removeEventListener("pointerup", release, true);
      bar.removeEventListener("pointercancel", release, true);
    };
  }, [capture]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (uploading) return;
      const scope = scopeRef.current;
      if (!scope) return;
      const target = e.target;
      if (!(target instanceof HTMLElement) || !scope.contains(target)) return;
      if (toolbarRef.current?.contains(target)) return;
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

  const emit = useCallback(() => {
    const el = activeEditorRef.current;
    if (el) notifyEditorChanged(el);
    capture();
  }, [capture]);

  const run = useCallback(
    (command: string, value?: string) => {
      if (!restore()) {
        onError?.("Highlight text in the abstract or body, then use the toolbar.");
        return;
      }
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand(command, false, value);
      emit();
    },
    [restore, onError, emit],
  );

  const insertHtml = useCallback(
    (html: string) => {
      if (!restore()) {
        onError?.("Click in the abstract or body first, then insert.");
        return;
      }
      const safe = sanitizeManuscriptHtml(html);
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        insertHtmlAtRange(safe, sel.getRangeAt(0));
      } else {
        document.execCommand("insertHTML", false, safe);
      }
      emit();
    },
    [restore, onError, emit],
  );

  const applyTableHtml = useCallback(
    (html: string) => {
      const editor = activeEditorRef.current;
      const target = targetTableRef.current;
      const safe = sanitizeManuscriptHtml(html);
      if (target && editor?.contains(target) && replaceTableTarget(target, safe)) {
        targetTableRef.current = null;
        layoutTableFigures(editor);
        notifyEditorChanged(editor);
        setTableOpen(false);
        return;
      }
      insertHtml(safe);
      if (editor) layoutTableFigures(editor);
      setTableOpen(false);
    },
    [insertHtml],
  );

  const openTableEditor = useCallback((el: HTMLElement, editor: HTMLElement) => {
    activeEditorRef.current = editor;
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
  }, []);

  const toggleTablePanel = useCallback(() => {
    const scope = scopeRef.current;
    const sel = window.getSelection();
    const editorFromSel =
      sel?.anchorNode instanceof Node
        ? (sel.anchorNode instanceof Element
            ? sel.anchorNode
            : sel.anchorNode.parentElement
          )?.closest("[data-nahda-rich='true']")
        : null;

    if (editorFromSel instanceof HTMLElement && scope?.contains(editorFromSel)) {
      activeEditorRef.current = editorFromSel;
      const fromSel = closestTableTarget(sel?.anchorNode ?? null, editorFromSel);
      if (fromSel) {
        openTableEditor(fromSel, editorFromSel);
        return;
      }
    }

    if (
      targetFigureRef.current &&
      isPlaceholderTable(targetFigureRef.current) &&
      scope?.contains(targetFigureRef.current)
    ) {
      const editor =
        targetFigureRef.current.closest("[data-nahda-rich='true']") ??
        editorFromSel;
      if (editor instanceof HTMLElement) {
        openTableEditor(targetFigureRef.current, editor);
        return;
      }
    }

    targetTableRef.current = null;
    setTableUpdateMode(false);
    setTableSeed(EMPTY_TABLE);
    setTableEditorKey((k) => k + 1);
    setTableOpen((o) => !o);
    setLinkOpen(false);
  }, [openTableEditor, scopeRef]);

  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;
    const openFromTableEvent = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (toolbarRef.current?.contains(t)) return;
      const editor = t.closest("[data-nahda-rich='true']");
      if (!(editor instanceof HTMLElement) || !scope.contains(editor)) return;
      if (t.closest("a[href]")) return;
      const tableTarget = closestTableTarget(t, editor);
      if (!tableTarget) return;
      e.preventDefault();
      openTableEditor(tableTarget, editor);
    };

    const onClick = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (toolbarRef.current?.contains(t)) return;

      const chromeAction = t
        .closest("[data-fig-action]")
        ?.getAttribute("data-fig-action");
      const figForChrome = t.closest("figure");
      const editorForFig = t.closest("[data-nahda-rich='true']");
      if (
        chromeAction === "full" &&
        figForChrome instanceof HTMLElement &&
        editorForFig instanceof HTMLElement &&
        scope.contains(editorForFig)
      ) {
        e.preventDefault();
        const full = !figForChrome.classList.contains("table-full") &&
          !figForChrome.classList.contains("figure-full");
        setFigureWidthPct(figForChrome, full ? 100 : 62);
        activeEditorRef.current = editorForFig;
        notifyEditorChanged(editorForFig);
        return;
      }

      if (
        chromeAction === "rotate" &&
        figForChrome instanceof HTMLElement &&
        editorForFig instanceof HTMLElement &&
        scope.contains(editorForFig)
      ) {
        e.preventDefault();
        const angle = cycleTableAngle(figForChrome);
        const button = figForChrome.querySelector("[data-fig-action='rotate']");
        if (button) button.textContent = tableAngleLabel(angle);
        activeEditorRef.current = editorForFig;
        notifyEditorChanged(editorForFig);
        return;
      }

      if (t.closest(".nahda-fig-chrome, .nahda-fig-handle")) return;

      const editor = t.closest("[data-nahda-rich='true']");
      if (!(editor instanceof HTMLElement) || !scope.contains(editor)) return;

      // Single click inside cells: select text and use font/size/color tools.
      if (t.closest("th, td")) return;

      const fig = t.closest("figure");
      if (
        fig instanceof HTMLElement &&
        (fig.querySelector(":scope > img") ||
          fig.querySelector(":scope > table, :scope > .nahda-table-wrap"))
      ) {
        selectResizableFigure(fig, editor, { tableHint: true });
        activeEditorRef.current = editor;
        return;
      }

      clearFigureSelection(editor);
    };

    const onDblClick = (e: MouseEvent) => {
      openFromTableEvent(e);
    };

    scope.addEventListener("click", onClick);
    scope.addEventListener("dblclick", onDblClick);
    return () => {
      scope.removeEventListener("click", onClick);
      scope.removeEventListener("dblclick", onDblClick);
    };
  }, [scopeRef, openTableEditor]);

  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;

    const onMouseDown = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const handle = t.closest(".nahda-fig-handle");
      if (!(handle instanceof HTMLElement)) return;
      const fig = figureFromResizeHandle(handle, scope);
      if (!fig) return;
      e.preventDefault();
      e.stopPropagation();
      const editor = fig.closest("[data-nahda-rich='true']");
      if (editor instanceof HTMLElement) activeEditorRef.current = editor;
      applyResizeDrag(fig, handle, e.clientX, () => {
        if (editor instanceof HTMLElement) notifyEditorChanged(editor);
      });
    };

    scope.addEventListener("mousedown", onMouseDown, true);
    return () => scope.removeEventListener("mousedown", onMouseDown, true);
  }, [scopeRef]);

  function withEditor(runFn: () => void) {
    if (!restore()) {
      onError?.("Highlight text in the abstract or body, then use the toolbar.");
      return;
    }
    runFn();
    emit();
  }

  function press(action: () => void) {
    return {
      onMouseDown: (e: { preventDefault: () => void }) => {
        e.preventDefault();
        action();
      },
      onClick: (e: { detail: number }) => {
        if (e.detail === 0) action();
      },
    };
  }

  function commitFontSize(raw: string) {
    const size = raw.trim();
    if (!size) return;
    withEditor(() => {
      const root = activeEditorRef.current;
      if (!root || !applySizeToEditor(root, size)) {
        onError?.("Type a font size between 4 and 96 points.");
      }
    });
  }

  async function onPickImages(files: FileList | null) {
    const placeholder = targetFigureRef.current;
    targetFigureRef.current = null;
    if (!files?.length) return;
    const list = Array.from(files).filter((f) => IMAGE_TYPES.includes(f.type));
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
      ref={toolbarRef}
      className="template-format-toolbar sticky top-0 z-20 space-y-1.5 border border-[var(--line)] bg-white/95 px-2 py-2 shadow-sm backdrop-blur-sm print:hidden"
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
            : "Highlight text, then format. Type any point size (including below 9) and press Enter."}
        </span>
      </div>
      <div className="-mx-1 flex flex-nowrap items-center gap-0.5 overflow-x-auto px-1 sm:flex-wrap sm:overflow-visible">
        <select
          className={TOOLBAR_SELECT_CLASS}
          defaultValue=""
          title="Font family"
          aria-label="Font family"
          onChange={(e) => {
            const font = e.target.value;
            e.target.value = "";
            if (!font) return;
            withEditor(() => {
              const root = activeEditorRef.current;
              if (root) applyFontToEditor(root, font);
            });
          }}
        >
          {FONT_OPTIONS.map((o) => (
            <option key={o.label} value={o.value} disabled={!o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1" title="Font size in points">
          <input
            type="text"
            inputMode="decimal"
            list={sizeListId}
            placeholder="Size"
            aria-label="Font size in points"
            className={`${TOOLBAR_SELECT_CLASS} w-14 max-w-[3.5rem] text-center`}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              commitFontSize(e.currentTarget.value);
            }}
            onBlur={(e) => commitFontSize(e.currentTarget.value)}
          />
          <span className="text-[10px] font-semibold text-[var(--muted)]">pt</span>
          <datalist id={sizeListId}>
            {FONT_SIZE_SUGGESTIONS.map((size) => (
              <option key={size} value={size} />
            ))}
          </datalist>
        </label>
        <Divider />
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
        <button
          type="button"
          title="Journal heading color"
          className="h-5 w-5 rounded-sm border border-black/15 ring-1 ring-black/5"
          style={{
            background: journalPrimary || "var(--j-primary, var(--accent))",
          }}
          {...press(() =>
            withEditor(() => {
              const root = activeEditorRef.current;
              if (root) applyColorToEditor(root, "", "fore");
            }),
          )}
        />
        {TEXT_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            title={`Text ${c.label}`}
            className="h-5 w-5 rounded-sm border border-black/10"
            style={{ background: c.value }}
            {...press(() =>
              withEditor(() => {
                const root = activeEditorRef.current;
                if (root) applyColorToEditor(root, c.value, "fore");
              }),
            )}
          />
        ))}
        <span className="mx-0.5 text-[10px] text-[var(--muted)]">Hi</span>
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            title={`Highlight ${c.label}`}
            className="h-5 w-5 rounded-sm border border-black/10"
            style={{ background: c.value }}
            {...press(() =>
              withEditor(() => {
                const root = activeEditorRef.current;
                if (root) applyColorToEditor(root, c.value, "back");
              }),
            )}
          />
        ))}
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
          title="Block quote"
          onClick={() => run("formatBlock", "<blockquote>")}
        >
          Quote
        </ToolBtn>
        <ToolBtn title="Increase indent" onClick={() => run("indent")}>
          →
        </ToolBtn>
        <ToolBtn title="Decrease indent" onClick={() => run("outdent")}>
          ←
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
          onClick={() => {
            setLinkOpen((o) => !o);
            setTableOpen(false);
          }}
        >
          Link
        </ToolBtn>
        <ToolBtn
          title="Insert or edit table (click a table in the article to edit)"
          active={tableOpen}
          onClick={toggleTablePanel}
        >
          Table
        </ToolBtn>
        <ToolBtn
          title="Upload image from your computer"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
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
      {tableOpen ? (
        <div className="border-t border-[var(--line)] bg-[var(--surface)]/40 px-1 py-2">
          <WordTableEditor
            key={tableEditorKey}
            initial={tableSeed}
            updateMode={tableUpdateMode}
            onCancel={() => {
              setTableOpen(false);
              targetTableRef.current = null;
            }}
            onInsert={(html) => applyTableHtml(html)}
          />
        </div>
      ) : null}
    </div>
  );
}
