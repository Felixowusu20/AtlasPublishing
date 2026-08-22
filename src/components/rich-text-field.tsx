"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import {
  ensureManuscriptHtml,
  sanitizeManuscriptHtml,
} from "@/lib/import-manuscript";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
  minHeight?: number;
};

function ToolBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded-md px-2 py-1.5 text-[11px] font-semibold text-[var(--ink)] transition hover:bg-white"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 hidden h-5 w-px self-center bg-[var(--line)] sm:block" />;
}

/** Compact Word-like editor for the journal abstract. */
export function RichTextField({
  value,
  onChange,
  label = "Abstract",
  hint,
  minHeight = 140,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef("");
  const seeded = useRef(false);

  const emit = useCallback(() => {
    const html = sanitizeManuscriptHtml(editorRef.current?.innerHTML ?? "");
    lastEmitted.current = html;
    onChange(html);
  }, [onChange]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (!seeded.current) {
      const html = ensureManuscriptHtml(value);
      el.innerHTML = html;
      lastEmitted.current = html;
      seeded.current = true;
      if (html !== value) onChange(html);
      return;
    }
    if (value === lastEmitted.current) return;
    const html = ensureManuscriptHtml(value);
    el.innerHTML = html;
    lastEmitted.current = html;
  }, [value, onChange]);

  const run = useCallback(
    (command: string, commandValue?: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand(command, false, commandValue);
      emit();
    },
    [emit],
  );

  return (
    <div className="field">
      {label ? <span>{label}</span> : null}
      <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--line)] bg-[var(--surface)]/70 px-1.5 py-1">
          <ToolBtn title="Bold (Ctrl/Cmd+B)" onClick={() => run("bold")}>
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
          <ToolBtn title="Undo" onClick={() => run("undo")}>
            Undo
          </ToolBtn>
          <ToolBtn title="Redo" onClick={() => run("redo")}>
            Redo
          </ToolBtn>
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          data-placeholder="Write or paste the abstract…"
          className="manuscript-wysiwyg block w-full resize-y overflow-auto px-3 py-2.5 text-[14px] leading-[1.75] text-[#0b1f33] outline-none [&:empty]:before:pointer-events-none [&:empty]:before:text-[var(--muted)] [&:empty]:before:content-[attr(data-placeholder)]"
          style={{
            minHeight,
            textAlign: "justify",
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
          onInput={emit}
          onPaste={(e) => {
            const html = e.clipboardData.getData("text/html");
            if (!html) return;
            e.preventDefault();
            const clean = sanitizeManuscriptHtml(html);
            document.execCommand("insertHTML", false, clean);
            emit();
          }}
        />
      </div>
      {hint ? (
        <span className="mt-1 block text-[11px] text-[var(--muted)]">{hint}</span>
      ) : null}
    </div>
  );
}
