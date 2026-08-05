"use client";

import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  WordTableEditor,
  parseMarkdownTable,
  type WordTableModel,
} from "@/components/word-table-editor";
import { uploadFileDirect } from "@/lib/client-upload";

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
  active?: boolean;
};

function ToolBtn({ title, onClick, children, disabled, active }: ToolBtnProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
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

function ToolGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-0.5 sm:flex-wrap">
      <span className="mr-0.5 hidden px-1 text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] xl:inline">
        {label}
      </span>
      {children}
    </div>
  );
}

function Divider() {
  return <span className="mx-1 hidden h-5 w-px self-center bg-[var(--line)] sm:block" />;
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

/** Transform selected lines (or current line) with a mapper. */
function mapSelectedLines(
  textarea: HTMLTextAreaElement,
  mapper: (line: string, index: number) => string,
) {
  const value = textarea.value;
  let start = textarea.selectionStart;
  let end = textarea.selectionEnd;
  if (start === end) {
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEnd = value.indexOf("\n", start);
    start = lineStart;
    end = lineEnd === -1 ? value.length : lineEnd;
  } else {
    start = value.lastIndexOf("\n", start - 1) + 1;
    const after = value.indexOf("\n", end);
    end = after === -1 ? value.length : after;
  }
  const block = value.slice(start, end);
  const lines = block.split("\n");
  const nextBlock = lines.map(mapper).join("\n");
  const next = value.slice(0, start) + nextBlock + value.slice(end);
  return {
    next,
    cursorStart: start,
    cursorEnd: start + nextBlock.length,
  };
}

function wrapAlignBlock(
  textarea: HTMLTextAreaElement,
  align: "left" | "center" | "right" | "justify",
) {
  const value = textarea.value;
  let start = textarea.selectionStart;
  let end = textarea.selectionEnd;
  if (start === end) {
    // Expand to the whole paragraph (blank-line bounded), not just one line
    let lineStart = value.lastIndexOf("\n", start - 1) + 1;
    let lineEnd = value.indexOf("\n", start);
    if (lineEnd === -1) lineEnd = value.length;

    while (lineStart > 0) {
      const prevBreak = value.lastIndexOf("\n", lineStart - 2);
      const prevStart = prevBreak + 1;
      const prevLine = value.slice(prevStart, lineStart - 1);
      if (!prevLine.trim()) break;
      lineStart = prevStart;
    }
    while (lineEnd < value.length) {
      const nextBreak = value.indexOf("\n", lineEnd + 1);
      const nextEnd = nextBreak === -1 ? value.length : nextBreak;
      const nextLine = value.slice(lineEnd + 1, nextEnd);
      if (!nextLine.trim()) break;
      lineEnd = nextEnd;
    }
    start = lineStart;
    end = lineEnd;
  } else {
    start = value.lastIndexOf("\n", start - 1) + 1;
    const after = value.indexOf("\n", end);
    end = after === -1 ? value.length : after;
  }

  let selected = value.slice(start, end).trim();
  if (!selected) {
    selected =
      align === "justify"
        ? "This paragraph is justified. Add enough words so the lines wrap across the column and the spacing between words will even out."
        : "Aligned text";
  }
  selected = selected
    .replace(/^:::(left|center|right|justify)\s*\n?/i, "")
    .replace(/\n?:::\s*$/i, "")
    .trim();

  const block = `:::${align}\n${selected}\n:::\n\n`;
  const next = value.slice(0, start) + block + value.slice(end);
  return {
    next,
    cursorStart: start + `:::${align}\n`.length,
    cursorEnd: start + `:::${align}\n`.length + selected.length,
  };
}

function clearInlineFormatting(text: string) {
  return text
    .replace(/\{\{(?:size|font):[^}]+\}\}/g, "")
    .replace(/\{\{\/(?:size|font)\}\}/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\+\+([^+]+)\+\+/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/==([^=]+)==/g, "$1")
    .replace(/\^([^^]+)\^/g, "$1")
    .replace(/~([^~]+)~/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

function toggleListLines(
  textarea: HTMLTextAreaElement,
  kind: "ul" | "ol",
) {
  return mapSelectedLines(textarea, (line, index) => {
    const indent = line.match(/^(\s*)/)?.[1] ?? "";
    const body = line
      .replace(/^\s+/, "")
      .replace(/^[-*\u2022]\s+/, "")
      .replace(/^\d+\.\s+/, "");
    if (!body.trim()) return line;
    if (kind === "ul") {
      if (/^\s*[-*\u2022]\s+/.test(line)) return `${indent}${body}`;
      return `${indent}- ${body}`;
    }
    if (/^\s*\d+\.\s+/.test(line)) return `${indent}${body}`;
    return `${indent}${index + 1}. ${body}`;
  });
}

function indentLines(textarea: HTMLTextAreaElement, dir: 1 | -1) {
  return mapSelectedLines(textarea, (line) => {
    if (dir > 0) return `  ${line}`;
    return line.replace(/^ {1,2}/, "");
  });
}

const FONT_OPTIONS = [
  { value: "", label: "Font" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Georgia", label: "Georgia" },
  { value: "Arial", label: "Arial" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Calibri", label: "Calibri" },
  { value: "Courier New", label: "Courier New" },
  { value: "Palatino", label: "Palatino" },
];

const SIZE_OPTIONS = [
  { value: "", label: "Size" },
  { value: "10", label: "10" },
  { value: "11", label: "11" },
  { value: "12", label: "12" },
  { value: "14", label: "14" },
  { value: "16", label: "16" },
  { value: "18", label: "18" },
  { value: "20", label: "20" },
  { value: "24", label: "24" },
  { value: "28", label: "28" },
  { value: "36", label: "36" },
];

const selectClass =
  "h-7 max-w-[9.5rem] rounded-md border border-[var(--line)] bg-white px-1.5 text-[11px] font-semibold text-[var(--ink)] outline-none hover:border-[var(--accent)]/40 focus:border-[var(--accent)]";


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

function figureSnippet(caption: string, url: string, fullWidth: boolean) {
  const flag = fullWidth ? "|full" : "|col";
  return `\n![${caption}${flag}](${url})\n\n`;
}

/** Find last markdown pipe table; return range and parsed model. */
function findLastPipeTable(value: string): {
  start: number;
  end: number;
  model: WordTableModel;
} | null {
  const lines = value.split("\n");
  let last: {
    startLine: number;
    endLine: number;
  } | null = null;

  for (let i = 0; i < lines.length - 1; i += 1) {
    if (!/^\|.+\|$/.test(lines[i].trim())) continue;
    if (!/^\|[\s:|-]+\|$/.test(lines[i + 1]?.trim() ?? "")) continue;
    let j = i + 2;
    while (j < lines.length && /^\|.+\|$/.test(lines[j].trim())) j += 1;
    last = { startLine: i, endLine: j - 1 };
    i = j - 1;
  }
  if (!last) return null;

  let startLine = last.startLine;
  if (startLine > 0) {
    const prev = lines[startLine - 1]?.trim() ?? "";
    if (/^\*\*Table\.?\*\*/i.test(prev) || /^Table\./i.test(prev)) {
      startLine -= 1;
    }
  }

  let start = 0;
  for (let i = 0; i < startLine; i += 1) start += lines[i].length + 1;
  let end = start;
  for (let i = startLine; i <= last.endLine; i += 1) {
    end += lines[i].length + (i < last.endLine ? 1 : 0);
  }
  if (value[end] === "\n") end += 1;

  const block = value.slice(start, end);
  const model = parseMarkdownTable(block);
  if (!model) return null;
  return { start, end, model };
}

const SECTION_TEMPLATES: { label: string; short: string; body: string }[] = [
  {
    label: "IMRaD skeleton",
    short: "IMRaD",
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
    short: "Methods",
    body: `## Methods

### Study design

### Participants / materials

### Procedure

### Statistical analysis

`,
  },
  {
    label: "Results + table",
    short: "Results",
    body: `## Results

Describe the primary outcome.

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
 * Rich academic manuscript editor — Word-like formatting, tables, and
 * drag-and-drop figures for the Typst publication pipeline.
 */
export function ManuscriptEditor({
  value,
  onChange,
  figures,
  onFiguresChange,
  rows = 16,
  label = "Full manuscript body",
  hint = "Word-style toolbar: font, size, align, bullets, tables. Drag images onto the editor.",
  onError,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileId = useId();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableEditRange, setTableEditRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [tableSeed, setTableSeed] = useState<WordTableModel | null>(null);
  const [figureFullWidth, setFigureFullWidth] = useState(true);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [linkLabel, setLinkLabel] = useState("");
  const dragDepth = useRef(0);

  const lastTable = useMemo(() => findLastPipeTable(value), [value]);

  const run = useCallback(
    (fn: (el: HTMLTextAreaElement) => ReturnType<typeof wrapSelection>) => {
      const el = ref.current;
      if (!el) return;
      applyEdit(ref, onChange, fn(el));
    },
    [onChange],
  );

  const openNewTable = () => {
    setTableEditRange(null);
    setTableSeed({
      headers: ["Column 1", "Column 2", "Column 3"],
      rows: [
        ["", "", ""],
        ["", "", ""],
        ["", "", ""],
      ],
      caption: "",
      fullWidth: false,
    });
    setTableOpen(true);
    setLinkOpen(false);
  };

  const openEditLastTable = () => {
    if (!lastTable) {
      openNewTable();
      return;
    }
    setTableEditRange({ start: lastTable.start, end: lastTable.end });
    setTableSeed(lastTable.model);
    setTableOpen(true);
    setLinkOpen(false);
  };

  const toggleTable = () => {
    if (tableOpen) {
      setTableOpen(false);
      setTableEditRange(null);
      return;
    }
    // Prefer editing last table if one exists (Word-like reopen)
    if (lastTable) openEditLastTable();
    else openNewTable();
  };

  const applyTableMarkdown = (markdown: string) => {
    if (tableEditRange) {
      const next =
        value.slice(0, tableEditRange.start) +
        markdown.trimEnd() +
        "\n" +
        value.slice(tableEditRange.end);
      onChange(next);
    } else {
      const el = ref.current;
      if (el) applyEdit(ref, onChange, insertAtCursor(el, markdown));
      else onChange(value + markdown);
    }
    setTableOpen(false);
    setTableEditRange(null);
  };

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

  async function uploadImageFiles(files: File[]) {
    const images = files.filter(
      (f) =>
        IMAGE_TYPES.includes(f.type) ||
        /\.(png|jpe?g|gif|webp|svg)$/i.test(f.name),
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
        const data = await uploadFileDirect(file, {
          folder: "atlas/article-figures",
          resourceType: "image",
        });

        const url = data.url;
        const ext = (file.name.split(".").pop() || "png").toLowerCase();
        const id = `fig-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const filename = `${id}.${ext}`;
        const caption = file.name.replace(/\.[^.]+$/, "") || "Figure";

        added.push({ id, url, filename, caption });
        insertText += figureSnippet(caption, url, figureFullWidth);
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
        `![${fig.caption}|col](${fig.url})`,
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
    for (const flag of ["|full", "|col", ""] as const) {
      const from = `![${fig.caption}${flag}](${fig.url})`;
      const to = `![${caption}${flag || "|full"}](${fig.url})`;
      next = next.replaceAll(from, to);
    }
    onChange(next);
  }

  function toggleFigureWidth(id: string) {
    const fig = figures.find((f) => f.id === id);
    if (!fig) return;
    let next = value;
    if (next.includes(`![${fig.caption}|full](${fig.url})`)) {
      next = next.replaceAll(
        `![${fig.caption}|full](${fig.url})`,
        `![${fig.caption}|col](${fig.url})`,
      );
    } else if (next.includes(`![${fig.caption}|col](${fig.url})`)) {
      next = next.replaceAll(
        `![${fig.caption}|col](${fig.url})`,
        `![${fig.caption}|full](${fig.url})`,
      );
    } else {
      next = next.replaceAll(
        `![${fig.caption}](${fig.url})`,
        `![${fig.caption}|full](${fig.url})`,
      );
    }
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

  function insertLink() {
    const label = linkLabel.trim() || "link text";
    const url = linkUrl.trim() || "https://";
    run((el) => wrapSelection(el, "[", `](${url})`, label));
    setLinkOpen(false);
    setLinkLabel("");
    setLinkUrl("https://");
  }

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-3">
      {label ? (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-[var(--ink)]">{label}</span>
          <span className="text-[10px] text-[var(--muted)]">
            {wordCount.toLocaleString()} words · {value.length.toLocaleString()}{" "}
            chars · {figures.length} figure
            {figures.length === 1 ? "" : "s"}
          </span>
        </div>
      ) : null}

      <div
        className={`relative overflow-hidden rounded-xl border bg-white shadow-sm transition ${
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
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-[var(--accent)]/12 backdrop-blur-[1px]">
            <div className="rounded-xl bg-white px-5 py-4 text-center shadow-lg">
              <p className="text-sm font-semibold text-[var(--accent)]">
                Drop images to insert figures
              </p>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                {figureFullWidth
                  ? "Will span both columns (full width)"
                  : "Will sit in one column"}
              </p>
            </div>
          </div>
        )}

        {/* Word-style formatting ribbon */}
        <div className="space-y-1.5 border-b border-[var(--line)] bg-gradient-to-b from-[#f7f9fb] to-[var(--surface)] px-2 py-2">
          <div className="-mx-1 flex flex-nowrap items-center gap-y-1.5 overflow-x-auto px-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <ToolGroup label="Font">
              <select
                className={selectClass}
                defaultValue=""
                title="Font family"
                aria-label="Font family"
                onChange={(e) => {
                  const font = e.target.value;
                  e.target.value = "";
                  if (!font) return;
                  run((el) =>
                    wrapSelection(
                      el,
                      `{{font:${font}}}`,
                      "{{/font}}",
                      "text",
                    ),
                  );
                }}
              >
                {FONT_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value} disabled={!o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                className={`${selectClass} max-w-[4.5rem]`}
                defaultValue=""
                title="Font size"
                aria-label="Font size"
                onChange={(e) => {
                  const size = e.target.value;
                  e.target.value = "";
                  if (!size) return;
                  run((el) =>
                    wrapSelection(
                      el,
                      `{{size:${size}}}`,
                      "{{/size}}",
                      "text",
                    ),
                  );
                }}
              >
                {SIZE_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value} disabled={!o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </ToolGroup>
            <Divider />
            <ToolGroup label="Style">
              <ToolBtn
                title="Bold (Ctrl/Cmd+B)"
                onClick={() =>
                  run((el) => wrapSelection(el, "**", "**", "bold"))
                }
              >
                <span className="font-extrabold">B</span>
              </ToolBtn>
              <ToolBtn
                title="Italic"
                onClick={() =>
                  run((el) => wrapSelection(el, "*", "*", "italic"))
                }
              >
                <span className="italic">I</span>
              </ToolBtn>
              <ToolBtn
                title="Underline"
                onClick={() =>
                  run((el) => wrapSelection(el, "++", "++", "underline"))
                }
              >
                <span className="underline">U</span>
              </ToolBtn>
              <ToolBtn
                title="Strikethrough"
                onClick={() =>
                  run((el) => wrapSelection(el, "~~", "~~", "strike"))
                }
              >
                <span className="line-through">S</span>
              </ToolBtn>
              <ToolBtn
                title="Highlight"
                onClick={() =>
                  run((el) => wrapSelection(el, "==", "==", "highlight"))
                }
              >
                <span className="rounded-sm bg-amber-200 px-0.5">H</span>
              </ToolBtn>
              <ToolBtn
                title="Superscript"
                onClick={() =>
                  run((el) => wrapSelection(el, "^", "^", "sup"))
                }
              >
                X²
              </ToolBtn>
              <ToolBtn
                title="Subscript"
                onClick={() =>
                  run((el) => wrapSelection(el, "~", "~", "sub"))
                }
              >
                X₂
              </ToolBtn>
              <ToolBtn
                title="Clear formatting from selection"
                onClick={() =>
                  run((el) => {
                    const start = el.selectionStart;
                    const end = el.selectionEnd;
                    if (start === end) {
                      return {
                        next: el.value,
                        cursorStart: start,
                        cursorEnd: end,
                      };
                    }
                    const selected = el.value.slice(start, end);
                    const cleaned = clearInlineFormatting(selected);
                    return {
                      next:
                        el.value.slice(0, start) +
                        cleaned +
                        el.value.slice(end),
                      cursorStart: start,
                      cursorEnd: start + cleaned.length,
                    };
                  })
                }
              >
                Clear
              </ToolBtn>
            </ToolGroup>
            <Divider />
            <ToolGroup label="Align">
              <ToolBtn
                title="Align left"
                onClick={() => run((el) => wrapAlignBlock(el, "left"))}
              >
                Left
              </ToolBtn>
              <ToolBtn
                title="Align center"
                onClick={() => run((el) => wrapAlignBlock(el, "center"))}
              >
                Center
              </ToolBtn>
              <ToolBtn
                title="Align right"
                onClick={() => run((el) => wrapAlignBlock(el, "right"))}
              >
                Right
              </ToolBtn>
              <ToolBtn
                title="Justify"
                onClick={() => run((el) => wrapAlignBlock(el, "justify"))}
              >
                Justify
              </ToolBtn>
            </ToolGroup>
            <Divider />
            <ToolGroup label="Lists">
              <ToolBtn
                title="Bulleted list — toggle on selected lines"
                onClick={() => run((el) => toggleListLines(el, "ul"))}
              >
                • List
              </ToolBtn>
              <ToolBtn
                title="Numbered list — toggle on selected lines"
                onClick={() => run((el) => toggleListLines(el, "ol"))}
              >
                1. List
              </ToolBtn>
              <ToolBtn
                title="Increase indent"
                onClick={() => run((el) => indentLines(el, 1))}
              >
                → Indent
              </ToolBtn>
              <ToolBtn
                title="Decrease indent"
                onClick={() => run((el) => indentLines(el, -1))}
              >
                ← Outdent
              </ToolBtn>
              <ToolBtn
                title="Checklist"
                onClick={() =>
                  run((el) =>
                    insertAtCursor(
                      el,
                      "\n- [ ] Task one\n- [ ] Task two\n- [x] Done\n",
                    ),
                  )
                }
              >
                ☐ Tasks
              </ToolBtn>
            </ToolGroup>
            <Divider />
            <ToolGroup label="Para">
              <ToolBtn title="Heading 1 — section" onClick={() => heading(1)}>
                H1
              </ToolBtn>
              <ToolBtn title="Heading 2 — subsection" onClick={() => heading(2)}>
                H2
              </ToolBtn>
              <ToolBtn title="Heading 3" onClick={() => heading(3)}>
                H3
              </ToolBtn>
              <ToolBtn
                title="Block quote"
                onClick={() =>
                  run((el) => wrapSelection(el, "\n> ", "\n", "Quoted text"))
                }
              >
                Quote
              </ToolBtn>
              <ToolBtn
                title="Horizontal rule"
                onClick={() =>
                  run((el) => insertAtCursor(el, "\n\n---\n\n"))
                }
              >
                ― Rule
              </ToolBtn>
              <ToolBtn
                title="Inline code"
                onClick={() =>
                  run((el) => wrapSelection(el, "`", "`", "code"))
                }
              >
                {"</>"}
              </ToolBtn>
              <ToolBtn
                title="Insert / edit hyperlink"
                active={linkOpen}
                onClick={() => {
                  setLinkOpen((o) => !o);
                  setTableOpen(false);
                }}
              >
                Link
              </ToolBtn>
            </ToolGroup>
            <Divider />
            <ToolGroup label="Insert">
              <ToolBtn
                title="Insert or edit table (Word-style grid)"
                active={tableOpen}
                onClick={toggleTable}
              >
                Table
              </ToolBtn>
              {lastTable && !tableOpen ? (
                <ToolBtn
                  title="Edit last table in manuscript"
                  onClick={openEditLastTable}
                >
                  Edit table
                </ToolBtn>
              ) : null}
              {tableOpen ? (
                <ToolBtn title="New blank table" onClick={openNewTable}>
                  New table
                </ToolBtn>
              ) : null}
              <label
                htmlFor={fileId}
                className="cursor-pointer rounded-md px-2 py-1.5 text-[11px] font-semibold text-[var(--ink)] transition hover:bg-white"
                title="Upload figure (or drag & drop)"
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
                title={
                  figureFullWidth
                    ? "Figures: full width (both columns) — click to use one column"
                    : "Figures: one column — click for full width"
                }
                active={figureFullWidth}
                onClick={() => setFigureFullWidth((v) => !v)}
              >
                {figureFullWidth ? "Fig: Full" : "Fig: Col"}
              </ToolBtn>
              <ToolBtn
                title="Inline equation"
                onClick={() =>
                  run((el) => wrapSelection(el, "$", "$", "x^2"))
                }
              >
                $ math
              </ToolBtn>
              <ToolBtn
                title="Display equation"
                onClick={() =>
                  run((el) =>
                    wrapSelection(el, "\n$$\n", "\n$$\n", "E = m c^2"),
                  )
                }
              >
                $$ eq
              </ToolBtn>
              <ToolBtn
                title="Page break"
                onClick={() =>
                  run((el) => insertAtCursor(el, "\n\n:::pagebreak\n\n"))
                }
              >
                Break
              </ToolBtn>
            </ToolGroup>
            <Divider />
            <ToolGroup label="Templates">
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
                  {t.short}
                </ToolBtn>
              ))}
            </ToolGroup>
          </div>
          <p className="px-1 text-[10px] text-[var(--muted)]">
            Select a paragraph, then Align (Left / Center / Right / Justify).
            Justify needs enough text to wrap in the column — then regenerate
            the PDF to see it.
          </p>
        </div>

        {linkOpen && (
          <div className="flex flex-wrap items-end gap-2 border-b border-[var(--line)] bg-white px-3 py-2.5">
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
        )}

        {tableOpen && (
          <div className="border-b border-[var(--line)] bg-[var(--surface)]/30 px-3 py-3">
            <WordTableEditor
              key={
                tableEditRange
                  ? `edit-${tableEditRange.start}`
                  : `new-${tableSeed?.headers.join("-") ?? "blank"}`
              }
              initial={tableSeed}
              updateMode={Boolean(tableEditRange)}
              onCancel={() => {
                setTableOpen(false);
                setTableEditRange(null);
              }}
              onInsert={applyTableMarkdown}
            />
          </div>
        )}

        <textarea
          ref={ref}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck
          className="block w-full resize-y border-0 bg-white px-4 py-4 text-[15px] leading-[1.7] text-[var(--ink)] outline-none focus:ring-0"
          style={{
            fontFamily:
              "Georgia, 'Times New Roman', 'Liberation Serif', serif",
          }}
          placeholder={
            "# Introduction\n\nWrite your article here.\n\nDrag & drop images · Insert tables from the toolbar…"
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-[var(--line)] bg-[var(--surface)]/50 px-3 py-2 text-[11px] text-[var(--muted)]">
          <span>
            {uploading
              ? "Uploading image…"
              : "Drag & drop images anywhere on this editor"}
          </span>
          <span className="font-medium text-[var(--ink)]/70">
            Word-style tables · Drag images · Bold · Links · Math
          </span>
        </div>
      </div>

      {figures.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-[var(--ink)]">
            Figures in manuscript
          </p>
          {figures.map((fig, index) => {
            const isFull =
              value.includes(`![${fig.caption}|full](${fig.url})`) ||
              (!value.includes(`![${fig.caption}|col](${fig.url})`) &&
                value.includes(`![${fig.caption}](${fig.url})`));
            return (
              <figure
                key={fig.id}
                className="overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fig.url}
                  alt={fig.caption}
                  className="block h-auto w-full max-h-[420px] object-contain bg-[#f5f7fa]"
                />
                <figcaption className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                  <span className="text-[10px] font-semibold text-[var(--muted)]">
                    Fig. {index + 1}
                  </span>
                  <input
                    value={fig.caption}
                    onChange={(e) => updateCaption(fig.id, e.target.value)}
                    className="min-w-0 flex-1 rounded border border-[var(--line)] px-2 py-1.5 text-xs"
                    placeholder="Caption"
                  />
                  <button
                    type="button"
                    className="rounded-md border border-[var(--line)] px-2 py-1 text-[11px] font-semibold text-[var(--ink)]"
                    onClick={() => toggleFigureWidth(fig.id)}
                    title="Toggle column vs full width"
                  >
                    {isFull ? "Full width" : "1 column"}
                  </button>
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
            );
          })}
        </div>
      )}

      {hint ? (
        <p className="text-[11px] text-[var(--muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
