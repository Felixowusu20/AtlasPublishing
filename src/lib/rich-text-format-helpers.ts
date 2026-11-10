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

export const SIZE_OPTIONS = [
  { value: "", label: "Size" },
  { value: "9", label: "9 pt" },
  { value: "10", label: "10 pt" },
  { value: "11", label: "11 pt" },
  { value: "12", label: "12 pt" },
  { value: "14", label: "14 pt" },
  { value: "16", label: "16 pt" },
  { value: "18", label: "18 pt" },
  { value: "24", label: "24 pt" },
] as const;

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

export function applyFontToEditor(
  root: HTMLElement,
  font: string,
  run: (command: string, value?: string) => void,
) {
  const heading = colorTargetFromSelection();
  if (heading && root.contains(heading)) {
    heading.style.fontFamily = font;
    return;
  }
  run("fontName", font);
}

function selectionInRoot(root: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel?.anchorNode) return false;
  const node = sel.anchorNode;
  const el = node instanceof Element ? node : node.parentElement;
  return Boolean(el && root.contains(el));
}

export function applySizeToEditor(root: HTMLElement, size: string) {
  const heading = colorTargetFromSelection();
  if (heading && root.contains(heading)) {
    heading.style.fontSize = `${size}pt`;
    heading.style.letterSpacing = "normal";
    return;
  }
  if (!selectionInRoot(root)) root.focus();
  document.execCommand("styleWithCSS", false, "true");
  document.execCommand("fontSize", false, "7");
  root.querySelectorAll('font[size="7"], span[style*="xxx-large"]').forEach(
    (node) => {
      const span = document.createElement("span");
      span.style.fontSize = `${size}pt`;
      span.innerHTML = (node as HTMLElement).innerHTML;
      node.replaceWith(span);
    },
  );
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
