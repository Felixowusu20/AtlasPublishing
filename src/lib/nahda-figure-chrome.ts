/** Resize handles + width helpers for figures/tables in manuscript-wysiwyg. */

import {
  layoutRotatedFigure,
  readTableAngle,
  tableAngleLabel,
} from "@/lib/nahda-table-orient";

export const FIGURE_HANDLES = ["nw", "ne", "sw", "se", "e", "w"] as const;
export type FigureHandle = (typeof FIGURE_HANDLES)[number];

export function clearFigureSelection(root: HTMLElement | null) {
  root
    ?.querySelectorAll("figure.nahda-fig-selected")
    .forEach((fig) => {
      fig.classList.remove("nahda-fig-selected");
      fig.querySelectorAll(".nahda-fig-chrome").forEach((n) => n.remove());
    });
}

export function setFigureWidthPct(figure: HTMLElement, pct: number) {
  const clamped = Math.min(100, Math.max(18, Math.round(pct)));
  figure.style.width = `${clamped}%`;
  figure.style.maxWidth = "100%";
  figure.style.marginInline = clamped >= 96 ? "0" : "auto";
  const hasImg = Boolean(figure.querySelector(":scope > img"));
  const hasTable = Boolean(figure.querySelector("table"));
  figure.classList.toggle("figure-full", hasImg && clamped >= 96);
  figure.classList.toggle("table-full", hasTable && clamped >= 96);
  const img = figure.querySelector(":scope > img");
  if (img instanceof HTMLImageElement) {
    img.style.width = "100%";
    img.style.height = "auto";
    img.style.maxWidth = "100%";
  }
  const angle = readTableAngle(figure);
  const table = figure.querySelector("table");
  if (table instanceof HTMLElement && angle === 0) {
    table.style.width = "100%";
    table.style.maxWidth = "100%";
  }
  if (angle !== 0) layoutRotatedFigure(figure);
}

function isResizableFigure(figure: HTMLElement): boolean {
  if (figure.tagName !== "FIGURE") return false;
  if (figure.querySelector(":scope > img")) return true;
  return Boolean(figure.querySelector("table"));
}

/** Select a figure/table and show drag handles (publish + manuscript editors). */
export function selectResizableFigure(
  figure: HTMLElement,
  root: HTMLElement,
  options?: { tableHint?: boolean },
) {
  if (!isResizableFigure(figure) || !root.contains(figure)) return;
  clearFigureSelection(root);
  figure.classList.add("nahda-fig-selected");
  figure.style.position = figure.style.position || "relative";
  if (figure.querySelector(":scope > .nahda-fig-chrome")) return;

  const chrome = document.createElement("div");
  chrome.className = "nahda-fig-chrome";
  chrome.contentEditable = "false";
  chrome.setAttribute("data-nahda-ui", "1");

  const bar = document.createElement("div");
  bar.className = "nahda-fig-toolbar";
  const isTable = Boolean(figure.querySelector("table"));
  if (isTable) {
    const label = tableAngleLabel(readTableAngle(figure));
    bar.innerHTML =
      '<button type="button" data-fig-action="full">Full width</button>' +
      `<button type="button" data-fig-action="rotate">${label}</button>` +
      '<span data-fig-hint="1">Click to cycle portrait, landscape, 180°, and 270°</span>';
  } else {
    bar.innerHTML =
      '<button type="button" data-fig-action="full">Full / column</button>' +
      '<span data-fig-hint="1">Drag corners to stretch</span>';
  }
  if (options?.tableHint && isTable) {
    const hint = bar.querySelector("[data-fig-hint]");
    if (hint) {
      hint.textContent =
        "Click the angle to cycle portrait, landscape, 180°, and 270°. Double-click for rows and columns.";
    }
  }
  chrome.appendChild(bar);

  for (const pos of FIGURE_HANDLES) {
    const handle = document.createElement("span");
    handle.className = `nahda-fig-handle nahda-fig-handle-${pos}`;
    handle.dataset.handle = pos;
    chrome.appendChild(handle);
  }
  figure.appendChild(chrome);
}

export function figureFromResizeHandle(
  handle: HTMLElement,
  root: HTMLElement,
): HTMLElement | null {
  const fig = handle.closest("figure");
  if (!(fig instanceof HTMLElement) || !root.contains(fig)) return null;
  return fig;
}

export function applyResizeDrag(
  fig: HTMLElement,
  handle: HTMLElement,
  startX: number,
  onDone: () => void,
) {
  const pos = (handle.dataset.handle || "e") as FigureHandle;
  const parentW = fig.parentElement?.clientWidth || fig.offsetWidth;
  const startW = fig.offsetWidth;
  const startPct = (startW / parentW) * 100;

  function onMove(ev: globalThis.MouseEvent) {
    const dx = ev.clientX - startX;
    const signed = pos === "w" || pos === "nw" || pos === "sw" ? -dx : dx;
    setFigureWidthPct(fig, startPct + (signed / parentW) * 100);
  }

  function onUp() {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    onDone();
  }

  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}
