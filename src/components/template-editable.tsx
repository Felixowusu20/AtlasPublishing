"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent,
} from "react";
import {
  ensureManuscriptHtml,
  htmlToPlainText,
  sanitizeManuscriptHtml,
} from "@/lib/import-manuscript";

type CommonProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Soft outline while focused so the insert point is obvious. */
  showFocusRing?: boolean;
};

type PlainProps = CommonProps & {
  mode?: "plain";
  /** If true, Enter inserts a line break instead of submitting. */
  multiline?: boolean;
  as?: "h1" | "p" | "span" | "div";
};

type HtmlProps = CommonProps & {
  mode: "html";
  as?: "div";
  multiline?: never;
};

type Props = (PlainProps | HtmlProps) &
  Omit<HTMLAttributes<HTMLElement>, "onChange" | "value" | "placeholder">;

/**
 * In-template contentEditable field with a real blinking caret.
 * Keeps React state in sync without fighting the caret on every keystroke.
 */
export function TemplateEditable({
  value,
  onChange,
  placeholder = "Click to type…",
  className = "",
  showFocusRing = true,
  mode = "plain",
  multiline = false,
  as,
  ...rest
}: Props) {
  const Tag = (as || (mode === "html" ? "div" : "p")) as "div";
  const ref = useRef<HTMLElement>(null);
  const lastEmitted = useRef(value);
  const seeded = useRef(false);

  const readValue = useCallback(() => {
    const el = ref.current;
    if (!el) return "";
    if (mode === "html") {
      return sanitizeManuscriptHtml(el.innerHTML);
    }
    return (el.innerText || "").replace(/\u00a0/g, " ").trimEnd();
  }, [mode]);

  const emit = useCallback(() => {
    const next = readValue();
    lastEmitted.current = next;
    const el = ref.current;
    if (el) {
      const empty =
        mode === "html"
          ? !htmlToPlainText(next).trim()
          : !next.trim();
      el.dataset.empty = empty ? "true" : "false";
    }
    onChange(next);
  }, [onChange, readValue, mode]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (mode === "html") {
      let html = ensureManuscriptHtml(value);
      // Leave a clickable empty paragraph so the caret can be placed.
      if (!html.trim()) html = "<p><br></p>";
      if (!seeded.current) {
        el.innerHTML = html;
        lastEmitted.current = html === "<p><br></p>" ? "" : html;
        seeded.current = true;
        if (html !== value && html !== "<p><br></p>") onChange(html);
        return;
      }
      if (value === lastEmitted.current) return;
      // Don't wipe the caret while the user is typing in this field.
      if (document.activeElement === el) return;
      const next = ensureManuscriptHtml(value);
      el.innerHTML = next.trim() ? next : "<p><br></p>";
      lastEmitted.current = next;
      return;
    }

    if (!seeded.current) {
      el.textContent = value;
      lastEmitted.current = value;
      seeded.current = true;
      return;
    }
    if (value === lastEmitted.current) return;
    if (document.activeElement === el) return;
    el.textContent = value;
    lastEmitted.current = value;
  }, [value, mode, onChange]);

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (mode === "plain" && !multiline && e.key === "Enter") {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    }
  }

  const empty =
    mode === "html"
      ? !htmlToPlainText(value).trim()
      : !value.trim();

  return (
    <Tag
      {...rest}
      ref={ref as never}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline={mode === "html" || multiline}
      data-placeholder={placeholder}
      data-empty={empty ? "true" : "false"}
      data-nahda-rich={mode === "html" ? "true" : undefined}
      className={`nahda-template-editable outline-none min-w-0 max-w-full ${
        showFocusRing
          ? "rounded-sm focus:ring-1 focus:ring-[var(--j-primary)]/35"
          : ""
      } ${className}`}
      style={{
        caretColor: "var(--j-primary, #1d4e89)",
        ...(rest.style || {}),
      }}
      onInput={emit}
      onBlur={emit}
      onKeyDown={onKeyDown}
    />
  );
}
