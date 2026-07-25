"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
  type RefObject,
} from "react";

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
};

type ToolBtnProps = {
  title: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
};

function ToolBtn({ title, onClick, children, disabled }: ToolBtnProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md px-2 py-1 text-[11px] font-semibold text-[var(--ink)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-4 w-px self-center bg-[var(--line)]" />;
}

function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after = "",
  placeholder = "",
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end) || placeholder;
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  const cursorStart = start + before.length;
  const cursorEnd = cursorStart + selected.length;
  return { next, cursorStart, cursorEnd };
}

function insertAtCursor(textarea: HTMLTextAreaElement, text: string) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const next = value.slice(0, start) + text + value.slice(end);
  const cursor = start + text.length;
  return { next, cursorStart: cursor, cursorEnd: cursor };
}

function applyEdit(
  ref: RefObject<HTMLTextAreaElement | null>,
  onChange: (v: string) => void,
  edit: {
    next: string;
    cursorStart: number;
    cursorEnd: number;
  },
) {
  onChange(edit.next);
  requestAnimationFrame(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(edit.cursorStart, edit.cursorEnd);
  });
}

function figureSnippet(caption: string, url: string) {
  // |full marks page-width figure for Typst / preview
  return `\n![${caption}|full](${url})\n\n`;
}

const SECTION_TEMPLATES: { label: string; body: string }[] = [
  {
    label: "IMRaD skeleton",
    body: `# Introduction

State the research problem, background, and objectives.

## Methods

Describe study design, materials, procedures, and analysis.

## Results

Report key findings with tables and figures as needed.

## Discussion

Interpret results, limitations, and implications.

## Conclusion

Summarize the main contribution.

## References

1. Author A. Title. Journal. Year;vol(issue):pages.
`,
  },
  {
    label: "Methods block",
    body: `## Methods

### Study design

### Participants / materials

### Procedure

### Statistical analysis

`,
  },
  {
    label: "Results + figure",
    body: `## Results

Describe the primary outcome.

![Primary outcome figure|full](PASTE_FIGURE_URL)

**Table 1.** Summary statistics

| Variable | Group A | Group B | p |
| --- | --- | --- | --- |
| Age (years) |  |  |  |
| Outcome |  |  |  |

`,
  },
];

const IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

/**
 * Academic manuscript body editor with formatting, tables, figures, and math tools.
 * Drag images onto the editor to insert page-width figures.
 */
export function ManuscriptEditor({
  value,
  onChange,
  figures,
  onFiguresChange,
  rows = 16,
  label = "Full manuscript body",
  hint = "Drag images onto the editor to insert full-page figures. Use the toolbar for headings, tables, and equations.",
  onError,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileId = useId();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableCaption, setTableCaption] = useState("");
  const dragDepth = useRef(0);

  const run = useCallback(
    (fn: (el: HTMLTextAreaElement) => ReturnType<typeof wrapSelection>) => {
      const el = ref.current;
      if (!el) return;
      applyEdit(ref, onChange, fn(el));
    },
    [onChange],
  );

  const heading = (level: 1 | 2 | 3) => {
    const prefix = "#".repeat(level) + " ";
    run((el) => {
      const start = el.selectionStart;
      const lineStart = el.value.lastIndexOf("\n", start - 1) + 1;
      const lineEnd = el.value.indexOf("\n", start);
      const end = lineEnd === -1 ? el.value.length : lineEnd;
      const line = el.value.slice(lineStart, end).replace(/^#{1,3}\s+/, "");
      const next =
        el.value.slice(0, lineStart) + prefix + line + el.value.slice(end);
      return {
        next,
        cursorStart: lineStart + prefix.length,
        cursorEnd: lineStart + prefix.length + line.length,
      };
    });
  };

  const insertTable = () => {
    const cols = Math.min(8, Math.max(2, tableCols));
    const rowsN = Math.min(20, Math.max(1, tableRows));
    const header = Array.from({ length: cols }, (_, i) => `Col ${i + 1}`).join(
      " | ",
    );
    const sep = Array.from({ length: cols }, () => "---").join(" | ");
    const body = Array.from({ length: rowsN }, () =>
      Array.from({ length: cols }, () => " ").join(" | "),
    ).join("\n");
    const caption = tableCaption.trim()
      ? `\n**Table.** ${tableCaption.trim()}\n`
      : "\n";
    const block = `${caption}| ${header} |\n| ${sep} |\n${body
      .split("\n")
      .map((r) => `| ${r} |`)
      .join("\n")}\n\n`;
    run((el) => insertAtCursor(el, block));
    setTableOpen(false);
    setTableCaption("");
  };

  async function uploadImageFiles(files: File[]) {
    const images = files.filter(
      (f) => IMAGE_TYPES.includes(f.type) || /\.(png|jpe?g|gif|webp|svg)$/i.test(f.name),
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
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "atlas/article-figures");
        fd.append("resourceType", "image");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Figure upload failed");

        const url = data.url as string;
        const ext = (file.name.split(".").pop() || "png").toLowerCase();
        const id = `fig-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const filename = `${id}.${ext}`;
        const caption = file.name.replace(/\.[^.]+$/, "") || "Figure";

        added.push({ id, url, filename, caption });
        insertText += figureSnippet(caption, url);
      }

      onFiguresChange([...figures, ...added]);
      const el = ref.current;
      if (el) {
        applyEdit(ref, onChange, insertAtCursor(el, insertText));
      } else {
        onChange(value + insertText);
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
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) await uploadImageFiles(files);
  }

  function removeFigure(id: string) {
    const fig = figures.find((f) => f.id === id);
    onFiguresChange(figures.filter((f) => f.id !== id));
    if (fig) {
      const patterns = [
        `![${fig.caption}|full](${fig.url})`,
        `![${fig.caption}](${fig.url})`,
        fig.url,
      ];
      let next = value;
      for (const p of patterns) next = next.replaceAll(p, "");
      onChange(next.replace(/\n{3,}/g, "\n\n"));
    }
  }

  function updateCaption(id: string, caption: string) {
    const fig = figures.find((f) => f.id === id);
    if (!fig) return;
    const nextFigures = figures.map((f) =>
      f.id === id ? { ...f, caption } : f,
    );
    onFiguresChange(nextFigures);
    let next = value;
    next = next.replaceAll(
      `![${fig.caption}|full](${fig.url})`,
      `![${caption}|full](${fig.url})`,
    );
    next = next.replaceAll(
      `![${fig.caption}](${fig.url})`,
      `![${caption}|full](${fig.url})`,
    );
    onChange(next);
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

  return (
    <div className="space-y-3">
      {label ? (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-[var(--ink)]">{label}</span>
          <span className="text-[10px] text-[var(--muted)]">
            {value.length.toLocaleString()} chars · {figures.length} figure
            {figures.length === 1 ? "" : "s"}
          </span>
        </div>
      ) : null}

      <div
        className={`relative overflow-hidden rounded-xl border bg-white transition ${
          dragOver
            ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30"
            : "border-[var(--line)]"
        }`}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={(e) => void onDrop(e)}
      >
        {dragOver && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[var(--accent)]/10 backdrop-blur-[1px]">
            <p className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-[var(--accent)] shadow-sm">
              Drop images to insert full-page figures
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--line)] bg-[var(--surface)] px-1.5 py-1.5">
          <ToolBtn title="Heading 1" onClick={() => heading(1)}>
            H1
          </ToolBtn>
          <ToolBtn title="Heading 2" onClick={() => heading(2)}>
            H2
          </ToolBtn>
          <ToolBtn title="Heading 3" onClick={() => heading(3)}>
            H3
          </ToolBtn>
          <Divider />
          <ToolBtn
            title="Bold"
            onClick={() =>
              run((el) => wrapSelection(el, "**", "**", "bold text"))
            }
          >
            B
          </ToolBtn>
          <ToolBtn
            title="Italic"
            onClick={() =>
              run((el) => wrapSelection(el, "*", "*", "italic text"))
            }
          >
            <span className="italic">I</span>
          </ToolBtn>
          <Divider />
          <ToolBtn
            title="Bullet list"
            onClick={() =>
              run((el) =>
                insertAtCursor(el, "\n- Item one\n- Item two\n- Item three\n"),
              )
            }
          >
            • List
          </ToolBtn>
          <ToolBtn
            title="Numbered list"
            onClick={() =>
              run((el) =>
                insertAtCursor(el, "\n1. First\n2. Second\n3. Third\n"),
              )
            }
          >
            1. List
          </ToolBtn>
          <Divider />
          <ToolBtn title="Insert table" onClick={() => setTableOpen((o) => !o)}>
            Table
          </ToolBtn>
          <label
            htmlFor={fileId}
            className="cursor-pointer rounded-md px-2 py-1 text-[11px] font-semibold text-[var(--ink)] transition hover:bg-white"
            title="Upload figure (or drag & drop onto the editor)"
          >
            {uploading ? "Uploading…" : "Figure"}
          </label>
          <input
            id={fileId}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="hidden"
            multiple
            disabled={uploading}
            onChange={(e) => void onFigureUpload(e)}
          />
          <ToolBtn
            title="Inline equation"
            onClick={() => run((el) => wrapSelection(el, "$", "$", "x^2"))}
          >
            $ math
          </ToolBtn>
          <ToolBtn
            title="Display equation"
            onClick={() =>
              run((el) => wrapSelection(el, "\n$$\n", "\n$$\n", "E = m c^2"))
            }
          >
            $$ eq
          </ToolBtn>
          <Divider />
          <ToolBtn
            title="Page break"
            onClick={() =>
              run((el) => insertAtCursor(el, "\n\n:::pagebreak\n\n"))
            }
          >
            Page break
          </ToolBtn>
          {SECTION_TEMPLATES.map((t) => (
            <ToolBtn
              key={t.label}
              title={t.label}
              onClick={() => {
                if (!value.trim()) {
                  onChange(t.body);
                  return;
                }
                const replace = window.confirm(
                  `Replace current body with “${t.label}”? Cancel inserts at cursor.`,
                );
                if (replace) onChange(t.body);
                else run((el) => insertAtCursor(el, "\n" + t.body));
              }}
            >
              {t.label === "IMRaD skeleton" ? "IMRaD" : t.label.split(" ")[0]}
            </ToolBtn>
          ))}
        </div>

        {tableOpen && (
          <div className="flex flex-wrap items-end gap-2 border-b border-[var(--line)] bg-white px-3 py-2">
            <label className="text-[11px] text-[var(--muted)]">
              Rows
              <input
                type="number"
                min={1}
                max={20}
                value={tableRows}
                onChange={(e) => setTableRows(Number(e.target.value) || 1)}
                className="ml-1 w-14 rounded border border-[var(--line)] px-1.5 py-1 text-xs"
              />
            </label>
            <label className="text-[11px] text-[var(--muted)]">
              Cols
              <input
                type="number"
                min={2}
                max={8}
                value={tableCols}
                onChange={(e) => setTableCols(Number(e.target.value) || 2)}
                className="ml-1 w-14 rounded border border-[var(--line)] px-1.5 py-1 text-xs"
              />
            </label>
            <label className="min-w-[140px] flex-1 text-[11px] text-[var(--muted)]">
              Caption
              <input
                value={tableCaption}
                onChange={(e) => setTableCaption(e.target.value)}
                placeholder="Optional table title"
                className="ml-1 w-[calc(100%-4rem)] rounded border border-[var(--line)] px-1.5 py-1 text-xs"
              />
            </label>
            <button
              type="button"
              className="btn-secondary !px-2.5 !py-1.5 text-[11px]"
              onClick={insertTable}
            >
              Insert table
            </button>
          </div>
        )}

        <textarea
          ref={ref}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck
          className="block w-full resize-y border-0 bg-white px-3 py-3 font-mono text-[12.5px] leading-relaxed text-[var(--ink)] outline-none focus:ring-0"
          placeholder={"# Introduction\n\nWrite here — or drag images onto this panel for full-page figures…"}
        />

        <div className="border-t border-dashed border-[var(--line)] bg-[var(--surface)]/40 px-3 py-2 text-center text-[11px] text-[var(--muted)]">
          {uploading
            ? "Uploading image…"
            : "Drag & drop images here for page-width figures"}
        </div>
      </div>

      {figures.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-[var(--ink)]">
            Figures (page width)
          </p>
          {figures.map((fig, index) => (
            <figure
              key={fig.id}
              className="overflow-hidden rounded-lg bg-white"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/atlas-figure-id", fig.id);
                e.dataTransfer.effectAllowed = "move";
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fig.url}
                alt={fig.caption}
                className="block h-auto w-full max-h-[420px] object-contain bg-[#f5f7fa]"
              />
              <figcaption className="flex flex-wrap items-center gap-2 px-1 py-2">
                <span className="text-[10px] font-semibold text-[var(--muted)]">
                  Fig. {index + 1}
                </span>
                <input
                  value={fig.caption}
                  onChange={(e) => updateCaption(fig.id, e.target.value)}
                  className="min-w-0 flex-1 rounded border border-[var(--line)] px-2 py-1 text-xs"
                  placeholder="Caption"
                />
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

      {hint ? (
        <p className="text-[11px] text-[var(--muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
