/** Shared formatting helpers for template + manuscript WYSIWYG toolbars. */

export const TEXT_COLORS = [
  { value: "#0b1f33", label: "Ink" },
  { value: "#5b6b7c", label: "Muted" },
  { value: "#b42318", label: "Red" },
  { value: "#c2410c", label: "Orange" },
  { value: "#a16207", label: "Gold" },
  { value: "#1a5f4a", label: "Green" },
  { value: "#1d4e89", label: "Blue" },
  { value: "#6b2d5b", label: "Plum" },
] as const;

export const HIGHLIGHT_COLORS = [
  { value: "#fef3c7", label: "Yellow" },
  { value: "#fecaca", label: "Red" },
  { value: "#bbf7d0", label: "Green" },
  { value: "#bfdbfe", label: "Blue" },
  { value: "#e9d5ff", label: "Purple" },
] as const;

export const FONT_OPTIONS = [
  { value: "", label: "Font" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Georgia", label: "Georgia" },
  { value: "Arial", label: "Arial" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Calibri", label: "Calibri" },
] as const;

/** Suggestions only — the toolbar also accepts any typed point size. */
export const FONT_SIZE_SUGGESTIONS = [
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "14",
  "16",
  "18",
  "24",
  "28",
  "36",
] as const;

/** Parse a typed point size. Allows sizes below 9. */
export function parseFontSizePt(raw: string): string | null {
  const n = Number(String(raw).replace(/pt$/i, "").replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 4 || n > 96) return null;
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export const TOOLBAR_SELECT_CLASS =
  "h-7 max-w-[9.5rem] rounded-md border border-[var(--line)] bg-white px-1.5 text-[11px] font-semibold text-[var(--ink)] outline-none hover:border-[var(--accent)]/40 focus:border-[var(--accent)]";

export function colorTargetFromSelection(): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const node = sel.anchorNode;
  const el = node instanceof HTMLElement ? node : node?.parentElement;
  if (!el) return null;
  return el.closest("h1, h2, h3, h4, th, td") as HTMLElement | null;
}

function editorSelection(root: HTMLElement): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const node = range.commonAncestorContainer;
  const el = node instanceof Element ? node : node.parentElement;
  if (!el || !root.contains(el)) return null;
  return range;
}

/**
 * Paint the current selection (or the caret, for the next characters).
 * Direct DOM edits keep working after the toolbar takes focus.
 */
function applyStyledText(
  root: HTMLElement,
  paint: (span: HTMLSpanElement) => void,
): boolean {
  const sel = window.getSelection();
  const range = editorSelection(root);
  if (!sel || !range) return false;

  if (range.collapsed) {
    const span = document.createElement("span");
    paint(span);
    const marker = document.createTextNode("\u200b");
    span.appendChild(marker);
    range.insertNode(span);
    const caret = document.createRange();
    caret.setStart(marker, marker.data.length);
    caret.collapse(true);
    sel.removeAllRanges();
    sel.addRange(caret);
    return true;
  }

  const scope =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentNode;
  if (!scope) return false;

  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  const slices: { text: Text; start: number; end: number }[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!(node instanceof Text) || !node.data) continue;
    try {
      if (!range.intersectsNode(node)) continue;
    } catch {
      continue;
    }
    const start = node === range.startContainer ? range.startOffset : 0;
    const end =
      node === range.endContainer ? range.endOffset : node.data.length;
    if (end > start) slices.push({ text: node, start, end });
  }
  if (!slices.length) return false;

  const spans: HTMLSpanElement[] = [];
  for (const slice of slices) {
    const piece = document.createRange();
    const start = Math.max(0, Math.min(slice.start, slice.text.data.length));
    const end = Math.max(start, Math.min(slice.end, slice.text.data.length));
    if (end <= start) continue;
    piece.setStart(slice.text, start);
    piece.setEnd(slice.text, end);
    const span = document.createElement("span");
    paint(span);
    try {
      piece.surroundContents(span);
    } catch {
      span.appendChild(piece.extractContents());
      piece.insertNode(span);
    }
    spans.push(span);
  }
  if (!spans.length) return false;

  const next = document.createRange();
  next.setStartBefore(spans[0]);
  next.setEndAfter(spans[spans.length - 1]);
  sel.removeAllRanges();
  sel.addRange(next);
  return true;
}

export function applyFontToEditor(root: HTMLElement, font: string) {
  const family = font.trim();
  if (!family) return false;
  return applyStyledText(root, (span) => {
    span.style.fontFamily = family;
  });
}

function selectionInRoot(root: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel?.anchorNode) return false;
  const node = sel.anchorNode;
  const el = node instanceof Element ? node : node.parentElement;
  return Boolean(el && root.contains(el));
}

export function applySizeToEditor(root: HTMLElement, size: string) {
  const pt = parseFontSizePt(size);
  if (!pt) return false;
  const heading = colorTargetFromSelection();
  const range = editorSelection(root);
  if (
    heading &&
    range &&
    root.contains(heading) &&
    heading.contains(range.commonAncestorContainer)
  ) {
    const full = document.createRange();
    full.selectNodeContents(heading);
    const covers =
      range.compareBoundaryPoints(Range.START_TO_START, full) <= 0 &&
      range.compareBoundaryPoints(Range.END_TO_END, full) >= 0;
    if (covers || range.collapsed) {
      heading.style.fontSize = `${pt}pt`;
      heading.style.letterSpacing = "normal";
      return true;
    }
  }
  return applyStyledText(root, (span) => {
    span.style.fontSize = `${pt}pt`;
    span.style.letterSpacing = "normal";
  });
}

export function applyColorToEditor(
  root: HTMLElement,
  color: string,
  kind: "fore" | "back",
) {
  if (!selectionInRoot(root)) root.focus();
  document.execCommand("styleWithCSS", false, "true");

  const heading = kind === "fore" ? colorTargetFromSelection() : null;
  if (heading && root.contains(heading)) {
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
    if (painted instanceof HTMLElement && root.contains(painted)) {
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
}

export function isPlaceholderTable(figure: Element | null): figure is HTMLElement {
  if (!(figure instanceof HTMLElement) || figure.tagName !== "FIGURE") {
    return false;
  }
  if (figure.querySelector("img, table, .nahda-table-wrap")) return false;
  if (figure.classList.contains("table-full")) return true;
  const cap = figure.querySelector("figcaption")?.textContent ?? "";
  return /^\s*table\b/i.test(cap);
}

export function closestTableTarget(
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

export function replaceTableTarget(target: HTMLElement, html: string): boolean {
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
