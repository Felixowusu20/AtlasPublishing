"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";

export type WordTableModel = {
  headers: string[];
  rows: string[][];
  caption: string;
  fullWidth: boolean;
};

type Props = {
  initial?: WordTableModel | null;
  onInsert: (markdown: string) => void;
  onCancel?: () => void;
  /** When true, button says “Update table in manuscript” */
  updateMode?: boolean;
};

function emptyGrid(rows: number, cols: number): WordTableModel {
  return {
    headers: Array.from({ length: cols }, (_, i) => `Column ${i + 1}`),
    rows: Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ""),
    ),
    caption: "",
    fullWidth: false,
  };
}

export function tableModelToMarkdown(model: WordTableModel): string {
  const cols = Math.max(1, model.headers.length);
  const headers = model.headers.map((h) => h.trim() || " ");
  const sep = Array.from({ length: cols }, () => "---").join(" | ");
  const body = model.rows
    .map((r) => {
      const cells = Array.from({ length: cols }, (_, i) =>
        (r[i] ?? "").trim() || " ",
      );
      return `| ${cells.join(" | ")} |`;
    })
    .join("\n");
  const full = model.fullWidth ? " |full" : "";
  const caption = model.caption.trim()
    ? `**Table.** ${model.caption.trim()}${full}\n`
    : model.fullWidth
      ? `**Table.** ${full.trim()}\n`
      : "";
  return `\n${caption}| ${headers.join(" | ")} |\n| ${sep} |\n${body}\n\n`;
}

export function parseMarkdownTable(block: string): WordTableModel | null {
  const lines = block.replace(/\r\n/g, "\n").trim().split("\n");
  let caption = "";
  let fullWidth = false;
  let i = 0;
  if (lines[0] && /^\*\*Table\.?\*\*/i.test(lines[0])) {
    const raw = lines[0].replace(/^\*\*Table\.?\*\*\s*/i, "").trim();
    fullWidth = /\|\s*full\s*$/i.test(raw);
    caption = raw.replace(/\|\s*full\s*$/i, "").trim();
    i = 1;
  }
  while (i < lines.length && !/^\|.+\|$/.test(lines[i].trim())) i += 1;
  if (i >= lines.length - 1) return null;
  if (!/^\|[\s:|-]+\|$/.test(lines[i + 1]?.trim() ?? "")) return null;

  const parseRow = (line: string) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());

  const headers = parseRow(lines[i]);
  const rows: string[][] = [];
  for (let j = i + 2; j < lines.length; j += 1) {
    if (!/^\|.+\|$/.test(lines[j].trim())) break;
    if (/^\|[\s:|-]+\|$/.test(lines[j].trim())) continue;
    rows.push(parseRow(lines[j]));
  }
  if (rows.length === 0) {
    rows.push(Array.from({ length: headers.length }, () => ""));
  }
  return { headers, rows, caption, fullWidth };
}

/**
 * Word-style visual table: click cells to type, drag rows/columns to reorder,
 * edge controls to add/remove rows and columns.
 */
export function WordTableEditor({
  initial,
  onInsert,
  onCancel,
  updateMode = false,
}: Props) {
  const [model, setModel] = useState<WordTableModel>(
    () => initial ?? emptyGrid(3, 3),
  );
  const [selected, setSelected] = useState<{
    r: number;
    c: number;
  } | null>({ r: -1, c: 0 }); // -1 = header
  const [dragRow, setDragRow] = useState<number | null>(null);
  const [dragCol, setDragCol] = useState<number | null>(null);
  const [hoverSize, setHoverSize] = useState<{ r: number; c: number } | null>(
    null,
  );
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    if (initial) setModel(initial);
  }, [initial]);

  const cols = model.headers.length;
  const rows = model.rows.length;

  const focusCell = useCallback((r: number, c: number) => {
    requestAnimationFrame(() => {
      cellRefs.current.get(`${r}:${c}`)?.focus();
    });
  }, []);

  const setHeader = (c: number, value: string) => {
    setModel((m) => {
      const headers = [...m.headers];
      headers[c] = value;
      return { ...m, headers };
    });
  };

  const setCell = (r: number, c: number, value: string) => {
    setModel((m) => {
      const nextRows = m.rows.map((row, ri) =>
        ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row,
      );
      return { ...m, rows: nextRows };
    });
  };

  const addColumn = (at = cols) => {
    setModel((m) => ({
      ...m,
      headers: [
        ...m.headers.slice(0, at),
        `Column ${m.headers.length + 1}`,
        ...m.headers.slice(at),
      ],
      rows: m.rows.map((row) => [
        ...row.slice(0, at),
        "",
        ...row.slice(at),
      ]),
    }));
    setSelected({ r: selected?.r ?? -1, c: at });
    focusCell(selected?.r ?? -1, at);
  };

  const removeColumn = (at: number) => {
    if (cols <= 1) return;
    setModel((m) => ({
      ...m,
      headers: m.headers.filter((_, i) => i !== at),
      rows: m.rows.map((row) => row.filter((_, i) => i !== at)),
    }));
    setSelected((s) =>
      s ? { r: s.r, c: Math.min(s.c, cols - 2) } : s,
    );
  };

  const addRow = (at = rows) => {
    setModel((m) => {
      const blank = Array.from({ length: m.headers.length }, () => "");
      return {
        ...m,
        rows: [...m.rows.slice(0, at), blank, ...m.rows.slice(at)],
      };
    });
    setSelected({ r: at, c: selected?.c ?? 0 });
    focusCell(at, selected?.c ?? 0);
  };

  const removeRow = (at: number) => {
    if (rows <= 1) return;
    setModel((m) => ({
      ...m,
      rows: m.rows.filter((_, i) => i !== at),
    }));
    setSelected((s) =>
      s && s.r >= 0 ? { r: Math.min(s.r, rows - 2), c: s.c } : s,
    );
  };

  const moveRow = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || to >= rows) return;
    setModel((m) => {
      const next = [...m.rows];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { ...m, rows: next };
    });
    setSelected({ r: to, c: selected?.c ?? 0 });
  };

  const moveCol = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || to >= cols) return;
    setModel((m) => {
      const headers = [...m.headers];
      const [h] = headers.splice(from, 1);
      headers.splice(to, 0, h);
      const nextRows = m.rows.map((row) => {
        const copy = [...row];
        const [cell] = copy.splice(from, 1);
        copy.splice(to, 0, cell);
        return copy;
      });
      return { ...m, headers, rows: nextRows };
    });
    setSelected({ r: selected?.r ?? -1, c: to });
  };

  const onRowDragStart = (e: DragEvent, index: number) => {
    setDragRow(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/atlas-table-row", String(index));
  };

  const onColDragStart = (e: DragEvent, index: number) => {
    setDragCol(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/atlas-table-col", String(index));
  };

  const applyQuickSize = (r: number, c: number) => {
    setModel((m) => {
      const headers = Array.from({ length: c }, (_, i) =>
        m.headers[i] ?? `Column ${i + 1}`,
      );
      const rows = Array.from({ length: r }, (_, ri) =>
        Array.from({ length: c }, (_, ci) => m.rows[ri]?.[ci] ?? ""),
      );
      return { ...m, headers, rows };
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">
            Table
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            Click a cell to type · Drag row/column handles to reorder · Use + to
            add rows and columns
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {onCancel ? (
            <button
              type="button"
              className="btn-secondary !px-2.5 !py-1.5 text-[11px]"
              onClick={onCancel}
            >
              Close
            </button>
          ) : null}
          <button
            type="button"
            className="btn-primary !px-3 !py-1.5 text-[11px]"
            onClick={() => onInsert(tableModelToMarkdown(model))}
          >
            {updateMode ? "Update in manuscript" : "Insert into manuscript"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[200px] flex-1 text-[11px] text-[var(--muted)]">
          Caption
          <input
            value={model.caption}
            onChange={(e) =>
              setModel((m) => ({ ...m, caption: e.target.value }))
            }
            placeholder="e.g. Patient characteristics"
            className="mt-0.5 block w-full rounded border border-[var(--line)] px-2 py-1.5 text-xs text-[var(--ink)]"
          />
        </label>
        <label className="flex items-center gap-1.5 pb-1.5 text-[11px] font-semibold text-[var(--ink)]">
          <input
            type="checkbox"
            checked={model.fullWidth}
            onChange={(e) =>
              setModel((m) => ({ ...m, fullWidth: e.target.checked }))
            }
          />
          Span both columns
        </label>
      </div>

      {/* Quick insert grid like Word */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Insert size
          </p>
          <div
            className="inline-grid gap-0.5 rounded-md border border-[var(--line)] bg-[var(--surface)] p-1.5"
            style={{ gridTemplateColumns: "repeat(8, 1fr)" }}
            onMouseLeave={() => setHoverSize(null)}
          >
            {Array.from({ length: 5 * 8 }, (_, i) => {
              const r = Math.floor(i / 8) + 1;
              const c = (i % 8) + 1;
              const active = hoverSize
                ? r <= hoverSize.r && c <= hoverSize.c
                : false;
              return (
                <button
                  key={i}
                  type="button"
                  title={`${r} × ${c}`}
                  className={`h-3.5 w-3.5 rounded-[2px] border transition ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent)]"
                      : "border-[var(--line)] bg-white hover:border-[var(--accent)]/40"
                  }`}
                  onMouseEnter={() => setHoverSize({ r, c })}
                  onClick={() => applyQuickSize(r, c)}
                />
              );
            })}
          </div>
          <span className="ml-2 text-[11px] text-[var(--muted)]">
            {hoverSize ? `${hoverSize.r} × ${hoverSize.c}` : `${rows} × ${cols}`}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="btn-secondary !px-2.5 !py-1.5 text-[11px]"
            onClick={() => addColumn(cols)}
          >
            + Column
          </button>
          <button
            type="button"
            className="btn-secondary !px-2.5 !py-1.5 text-[11px]"
            disabled={cols <= 1}
            onClick={() => removeColumn(cols - 1)}
          >
            − Column
          </button>
          <button
            type="button"
            className="btn-secondary !px-2.5 !py-1.5 text-[11px]"
            onClick={() => addRow(rows)}
          >
            + Row
          </button>
          <button
            type="button"
            className="btn-secondary !px-2.5 !py-1.5 text-[11px]"
            disabled={rows <= 1}
            onClick={() => removeRow(rows - 1)}
          >
            − Row
          </button>
        </div>
      </div>

      {/* Visual Word-like table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[#fafbfc]">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-8 border-b border-[var(--line)] bg-[var(--surface)]" />
              {model.headers.map((_, c) => (
                <th
                  key={`col-handle-${c}`}
                  draggable
                  onDragStart={(e) => onColDragStart(e, c)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = Number(
                      e.dataTransfer.getData("text/atlas-table-col"),
                    );
                    if (!Number.isNaN(from)) moveCol(from, c);
                    setDragCol(null);
                  }}
                  onDragEnd={() => setDragCol(null)}
                  className={`border-b border-l border-[var(--line)] bg-[var(--surface)] px-1 py-1 text-center text-[10px] font-semibold text-[var(--muted)] ${
                    dragCol === c ? "opacity-50" : "cursor-grab"
                  }`}
                  title="Drag to move column"
                >
                  ⋮⋮
                </th>
              ))}
              <th className="w-9 border-b border-l border-[var(--line)] bg-[var(--surface)] p-0">
                <button
                  type="button"
                  title="Add column"
                  className="flex h-full w-full items-center justify-center text-base font-bold text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                  onClick={() => addColumn(cols)}
                >
                  +
                </button>
              </th>
            </tr>
            <tr>
              <th className="border-b border-[var(--line)] bg-[var(--surface)]" />
              {model.headers.map((h, c) => (
                <th
                  key={`h-${c}`}
                  className={`border-b border-l border-[var(--line)] bg-[#eef2f6] p-0 ${
                    selected?.r === -1 && selected.c === c
                      ? "ring-2 ring-inset ring-[var(--accent)]"
                      : ""
                  }`}
                >
                  <div className="flex">
                    <input
                      ref={(el) => {
                        if (el) cellRefs.current.set(`-1:${c}`, el);
                        else cellRefs.current.delete(`-1:${c}`);
                      }}
                      value={h}
                      onChange={(e) => setHeader(c, e.target.value)}
                      onFocus={() => setSelected({ r: -1, c })}
                      className="min-w-[6.5rem] flex-1 bg-transparent px-2 py-2 text-left text-[12px] font-semibold text-[var(--ink)] outline-none"
                      placeholder={`Column ${c + 1}`}
                    />
                    <button
                      type="button"
                      title="Delete column"
                      disabled={cols <= 1}
                      onClick={() => removeColumn(c)}
                      className="px-1.5 text-[11px] text-rose-600 opacity-60 hover:opacity-100 disabled:opacity-20"
                    >
                      ×
                    </button>
                  </div>
                </th>
              ))}
              <th className="border-b border-l border-[var(--line)] bg-[var(--surface)]" />
            </tr>
          </thead>
          <tbody>
            {model.rows.map((row, r) => (
              <tr key={`r-${r}`} className={dragRow === r ? "opacity-50" : ""}>
                <th
                  draggable
                  onDragStart={(e) => onRowDragStart(e, r)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = Number(
                      e.dataTransfer.getData("text/atlas-table-row"),
                    );
                    if (!Number.isNaN(from)) moveRow(from, r);
                    setDragRow(null);
                  }}
                  onDragEnd={() => setDragRow(null)}
                  className="cursor-grab border-b border-[var(--line)] bg-[var(--surface)] px-1 text-center text-[10px] font-semibold text-[var(--muted)]"
                  title="Drag to move row"
                >
                  ⋮⋮
                </th>
                {Array.from({ length: cols }, (_, c) => (
                  <td
                    key={`c-${r}-${c}`}
                    className={`border-b border-l border-[var(--line)] bg-white p-0 ${
                      selected?.r === r && selected.c === c
                        ? "ring-2 ring-inset ring-[var(--accent)]"
                        : ""
                    }`}
                  >
                    <input
                      ref={(el) => {
                        if (el) cellRefs.current.set(`${r}:${c}`, el);
                        else cellRefs.current.delete(`${r}:${c}`);
                      }}
                      value={row[c] ?? ""}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      onFocus={() => setSelected({ r, c })}
                      onKeyDown={(e) => {
                        if (e.key === "Tab") {
                          e.preventDefault();
                          const nextC = e.shiftKey ? c - 1 : c + 1;
                          if (nextC >= 0 && nextC < cols) {
                            setSelected({ r, c: nextC });
                            focusCell(r, nextC);
                          } else if (!e.shiftKey && r + 1 < rows) {
                            setSelected({ r: r + 1, c: 0 });
                            focusCell(r + 1, 0);
                          } else if (!e.shiftKey && r + 1 >= rows) {
                            addRow(rows);
                          } else if (e.shiftKey && r > 0) {
                            setSelected({ r: r - 1, c: cols - 1 });
                            focusCell(r - 1, cols - 1);
                          }
                        } else if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (r + 1 < rows) {
                            setSelected({ r: r + 1, c });
                            focusCell(r + 1, c);
                          } else {
                            addRow(rows);
                          }
                        }
                      }}
                      className="min-w-[6.5rem] w-full bg-transparent px-2 py-2 text-[13px] text-[var(--ink)] outline-none"
                      placeholder="…"
                    />
                  </td>
                ))}
                <td className="border-b border-l border-[var(--line)] bg-[var(--surface)] p-0">
                  <button
                    type="button"
                    title="Delete row"
                    disabled={rows <= 1}
                    onClick={() => removeRow(r)}
                    className="flex h-full w-full items-center justify-center px-2 text-[11px] text-rose-600 hover:bg-rose-50 disabled:opacity-20"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td className="border-t border-[var(--line)] bg-[var(--surface)] p-0">
                <button
                  type="button"
                  title="Add row"
                  className="flex w-full items-center justify-center py-1.5 text-base font-bold text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                  onClick={() => addRow(rows)}
                >
                  +
                </button>
              </td>
              <td
                colSpan={cols + 1}
                className="border-t border-l border-[var(--line)] bg-[var(--surface)]/60"
              />
            </tr>
          </tbody>
        </table>
      </div>

      {selected ? (
        <p className="text-[10px] text-[var(--muted)]">
          Selected:{" "}
          {selected.r < 0
            ? `header · column ${selected.c + 1}`
            : `row ${selected.r + 1} · column ${selected.c + 1}`}
          {" · "}
          Tab / Enter moves like Word
        </p>
      ) : null}
    </div>
  );
}
