/** Keep a turned table inside its own box so it cannot paint over the article. */

const ROTATOR = "nahda-table-rotator";

/** Quarter turns. 90° is the landscape turn (top of the table points left). */
export const TABLE_ANGLES = [0, 90, 180, 270] as const;
export type TableAngle = (typeof TABLE_ANGLES)[number];

function tableOf(figure: HTMLElement): HTMLTableElement | null {
  const table = figure.querySelector("table");
  return table instanceof HTMLTableElement ? table : null;
}

function clearInline(table: HTMLElement) {
  table.style.position = "";
  table.style.top = "";
  table.style.left = "";
  table.style.visibility = "";
  table.style.transform = "";
  table.style.transformOrigin = "";
  table.style.removeProperty("width");
  table.style.removeProperty("max-width");
  table.style.removeProperty("table-layout");
  table.style.margin = "";
}

/** Read the table at its own width, not squeezed into the column. */
function measureTable(table: HTMLTableElement): { w: number; h: number } {
  table.style.position = "fixed";
  table.style.left = "0";
  table.style.top = "0";
  table.style.visibility = "hidden";
  table.style.transform = "none";
  table.style.setProperty("width", "max-content", "important");
  table.style.setProperty("max-width", "none", "important");
  table.style.setProperty("table-layout", "auto", "important");
  const w = Math.max(table.scrollWidth, table.offsetWidth, 1);
  const h = Math.max(table.scrollHeight, table.offsetHeight, 1);
  table.style.visibility = "";
  table.style.position = "";
  table.style.left = "";
  table.style.top = "";
  return { w, h };
}

export function readTableAngle(figure: Element | null | undefined): TableAngle {
  if (!figure) return 0;
  const raw = figure.getAttribute("data-table-angle");
  if (raw === "0" || raw === "90" || raw === "180" || raw === "270") {
    return Number(raw) as TableAngle;
  }
  if (figure.classList.contains("table-rotated")) return 90;
  return 0;
}

export function tableAngleLabel(angle: TableAngle): string {
  switch (angle) {
    case 90:
      return "Landscape";
    case 180:
      return "180°";
    case 270:
      return "270°";
    default:
      return "Portrait";
  }
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
 * Turn the table inside a box that reserves the space it occupies after rotation.
 * The following text stays below that box.
 */
export function layoutRotatedFigure(figure: HTMLElement) {
  const angle = readTableAngle(figure);
  if (angle === 0) {
    clearRotatedLayout(figure);
    return;
  }

  const table = tableOf(figure);
  if (!table) return;

  const parent = table.parentElement;
  const wrap =
    parent instanceof HTMLElement && parent.classList.contains(ROTATOR)
      ? parent
      : document.createElement("div");
  if (wrap !== parent) {
    wrap.className = ROTATOR;
    parent?.insertBefore(wrap, table);
    wrap.appendChild(table);
  }

  clearInline(table);
  wrap.style.height = "auto";
  wrap.style.overflow = "visible";

  const { w: naturalW, h: naturalH } = measureTable(table);
  const boxW = Math.max(figure.clientWidth, wrap.clientWidth, 1);
  const sideways = angle === 90 || angle === 270;
  const spanW = sideways ? naturalH : naturalW;
  const spanH = sideways ? naturalW : naturalH;
  const scale = spanW > boxW - 8 ? (boxW - 8) / spanW : 1;
  const visualH = Math.max(48, Math.ceil(spanH * scale));

  wrap.style.position = "relative";
  wrap.style.width = "100%";
  wrap.style.height = `${visualH}px`;
  wrap.style.overflow = "hidden";

  table.style.position = "absolute";
  table.style.top = "0";
  table.style.left = "0";
  table.style.setProperty("width", "max-content", "important");
  table.style.setProperty("max-width", "none", "important");
  table.style.setProperty("table-layout", "auto", "important");
  table.style.transformOrigin = "top left";

  const paint = (nextScale: number) => {
    const shiftX = Math.ceil((sideways ? naturalH : naturalW) * nextScale);
    const shiftY = Math.ceil(naturalW * nextScale);
    if (angle === 90) {
      table.style.transform = `translateY(${shiftY}px) rotate(-90deg) scale(${nextScale})`;
    } else if (angle === 270) {
      table.style.transform = `translateX(${shiftX}px) rotate(90deg) scale(${nextScale})`;
    } else {
      const shiftDown = Math.ceil(naturalH * nextScale);
      table.style.transform = `translate(${shiftX}px, ${shiftDown}px) rotate(180deg) scale(${nextScale})`;
    }
  };

  paint(scale);
  const placed = table.getBoundingClientRect();
  const room = Math.max(wrap.clientWidth - 8, 1);
  if (placed.width > room + 1) {
    paint(scale * (room / placed.width));
  }
  const fitted = table.getBoundingClientRect();
  const top = wrap.getBoundingClientRect().top;
  wrap.style.height = `${Math.max(48, Math.ceil(fitted.bottom - top) + 2)}px`;
}

/** Apply or clear rotation for every table figure under root. */
export function layoutTableFigures(root: ParentNode) {
  root.querySelectorAll<HTMLElement>("figure").forEach((figure) => {
    if (!figure.querySelector("table")) return;
    if (readTableAngle(figure) !== 0) layoutRotatedFigure(figure);
    else clearRotatedLayout(figure);
  });
}

export function setTableAngle(figure: HTMLElement, angle: TableAngle) {
  figure.dataset.tableAngle = String(angle);
  figure.classList.toggle("table-rotated", angle !== 0);
  figure.classList.remove("table-landscape");
  if (angle === 0) clearRotatedLayout(figure);
  else layoutRotatedFigure(figure);
}

/** Portrait → landscape → 180° → 270° → portrait. */
export function cycleTableAngle(figure: HTMLElement): TableAngle {
  const current = readTableAngle(figure);
  const next = TABLE_ANGLES[(TABLE_ANGLES.indexOf(current) + 1) % TABLE_ANGLES.length];
  setTableAngle(figure, next);
  return next;
}
