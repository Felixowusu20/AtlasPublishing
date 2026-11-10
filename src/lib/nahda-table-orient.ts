/** Keep a rotated table inside its own box so it cannot paint over the article. */

const ROTATOR = "nahda-table-rotator";

function tableOf(figure: HTMLElement): HTMLTableElement | null {
  const table = figure.querySelector("table");
  return table instanceof HTMLTableElement ? table : null;
}

function clearInline(table: HTMLElement) {
  table.style.position = "";
  table.style.top = "";
  table.style.left = "";
  table.style.transform = "";
  table.style.transformOrigin = "";
  table.style.width = "";
  table.style.maxWidth = "";
  table.style.margin = "";
}

/** Drop the rotation box and put the table back in normal flow. */
export function clearRotatedLayout(figure: HTMLElement) {
  const table = tableOf(figure);
  if (!table) return;
  clearInline(table);
  const wrap = table.closest(`.${ROTATOR}`);
  if (wrap instanceof HTMLElement && wrap.parentElement) {
    wrap.replaceWith(table);
  }
}

/**
 * Turn the table 90° counter-clockwise inside a box as tall as the table is wide.
 * The box is real layout space, so the following text stays below the table.
 */
export function layoutRotatedFigure(figure: HTMLElement) {
  const table = tableOf(figure);
  if (!table) return;

  const existing = figure.querySelector(`:scope > .${ROTATOR}`);
  const wrap =
    existing instanceof HTMLElement ? existing : document.createElement("div");
  if (wrap !== existing) {
    wrap.className = ROTATOR;
    table.parentElement?.insertBefore(wrap, table);
    wrap.appendChild(table);
  }

  clearInline(table);
  table.style.width = "max-content";
  table.style.maxWidth = "none";
  wrap.style.height = "auto";
  wrap.style.overflow = "visible";

  const naturalW = Math.max(table.scrollWidth, table.offsetWidth, 1);
  const naturalH = Math.max(table.scrollHeight, table.offsetHeight, 1);
  const boxW = Math.max(figure.clientWidth, wrap.clientWidth, 1);
  const scale = naturalH > boxW - 8 ? (boxW - 8) / naturalH : 1;
  const visualH = Math.max(48, Math.ceil(naturalW * scale));
  const shift = Math.ceil(naturalH * scale);

  wrap.style.position = "relative";
  wrap.style.width = "100%";
  wrap.style.height = `${visualH}px`;
  wrap.style.overflow = "hidden";

  table.style.position = "absolute";
  table.style.top = "0";
  table.style.left = "0";
  table.style.width = `${naturalW}px`;
  table.style.maxWidth = "none";
  table.style.transformOrigin = "top left";
  table.style.transform = `translateX(${shift}px) rotate(-90deg) scale(${scale})`;
}

/** Apply or clear rotation for every table figure under root. */
export function layoutTableFigures(root: ParentNode) {
  root.querySelectorAll<HTMLElement>("figure").forEach((figure) => {
    if (!figure.querySelector("table")) return;
    if (figure.classList.contains("table-rotated")) layoutRotatedFigure(figure);
    else clearRotatedLayout(figure);
  });
}

export function toggleTableRotation(figure: HTMLElement) {
  const on = !figure.classList.contains("table-rotated");
  figure.classList.toggle("table-rotated", on);
  figure.classList.remove("table-landscape");
  if (on) layoutRotatedFigure(figure);
  else clearRotatedLayout(figure);
  return on;
}
