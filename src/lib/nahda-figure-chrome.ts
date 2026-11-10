/** Resize handles + width helpers for figures/tables in manuscript-wysiwyg. */

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
  const hasTable = Boolean(
    figure.querySelector(":scope > table, :scope > .nahda-table-wrap"),
  );
  figure.classList.toggle("figure-full", hasImg && clamped >= 96);
  figure.classList.toggle("table-full", hasTable && clamped >= 96);
  const img = figure.querySelector(":scope > img");
  if (img instanceof HTMLImageElement) {
    img.style.width = "100%";
    img.style.height = "auto";
    img.style.maxWidth = "100%";
  }
  const table = figure.querySelector(":scope > table, :scope > .nahda-table-wrap table");
  if (table instanceof HTMLElement) {
    table.style.width = "100%";
    table.style.maxWidth = "100%";
  }
}

function isResizableFigure(figure: HTMLElement): boolean {
  if (figure.tagName !== "FIGURE") return false;
  if (figure.querySelector(":scope > img")) return true;
  if (figure.querySelector(":scope > table, :scope > .nahda-table-wrap")) {
    return true;
  }
  return false;
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
  const isTable = Boolean(
    figure.querySelector(":scope > table, :scope > .nahda-table-wrap"),
  );
  if (isTable) {
    const rotated = figure.classList.contains("table-rotated");
    bar.innerHTML =
      '<button type="button" data-fig-action="full">Full width</button>' +
      `<button type="button" data-fig-action="rotate">${rotated ? "Upright" : "Rotate"}</button>` +
      '<span data-fig-hint="1">Drag edges to fit · Rotate turns a wide table on its side</span>';
  } else {
    bar.innerHTML =
      '<button type="button" data-fig-action="full">Full / column</button>' +
      '<span data-fig-hint="1">Drag corners to stretch</span>';
  }
  if (options?.tableHint && isTable) {
    const hint = bar.querySelector("[data-fig-hint]");
    if (hint) hint.textContent = "Drag edges to fit preview · double-click for rows/cols";
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
