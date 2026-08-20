"use client";

import { useRef, useState, type DragEvent } from "react";
import type { ManuscriptFigure } from "@/components/manuscript-editor";

type ImportResult = {
  body: string;
  figures: ManuscriptFigure[];
  trimmedFrontMatter?: boolean;
  warnings?: string[];
  sourceName?: string;
};

type Props = {
  onImported: (result: ImportResult) => void;
  onError?: (message: string) => void;
  hasExistingBody?: boolean;
};

export function ManuscriptImportPanel({
  onImported,
  onError,
  hasExistingBody,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [googleUrl, setGoogleUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [note, setNote] = useState("");

  async function importForm(form: FormData) {
    setBusy(true);
    setNote("");
    onError?.("");
    try {
      const res = await fetch("/api/admin/import-manuscript", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Import failed");
      }
      const body = String(data.body ?? "").trim();
      if (!body) throw new Error("No body text was found in that document.");
      if (hasExistingBody) {
        const ok = window.confirm(
          "Replace the current Introduction–References with the imported document? Title, authors, abstract, and keywords on the template will stay as they are.",
        );
        if (!ok) return;
      }
      onImported({
        body,
        figures: Array.isArray(data.figures) ? data.figures : [],
        trimmedFrontMatter: Boolean(data.trimmedFrontMatter),
        warnings: data.warnings,
        sourceName: data.sourceName,
      });
      setNote(
        data.trimmedFrontMatter
          ? "Imported from Introduction onward. Header, authors, abstract, and keywords stay on the journal template."
          : "Imported. Check that the body starts at Introduction; title and abstract still come from the template.",
      );
      setGoogleUrl("");
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | null) {
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    await importForm(form);
  }

  async function onGoogle() {
    const url = googleUrl.trim();
    if (!url) {
      onError?.("Paste a Google Docs link first.");
      return;
    }
    const form = new FormData();
    form.set("googleUrl", url);
    await importForm(form);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void onFile(file);
  }

  return (
    <div
      className={`rounded-xl border border-dashed p-4 ${
        dragOver
          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
          : "border-[var(--line)] bg-[var(--surface)]/50"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <p className="text-xs font-semibold text-[var(--ink)]">
        Introduction to References
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
        The journal template already holds the title, authors, ORCID, affiliations,
        abstract, and keywords for this journal. Import a Word or Google Doc to fill
        the paper body, then bold, color, and tidy the text yourself.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            e.target.value = "";
            void onFile(file);
          }}
        />
        <button
          type="button"
          className="btn-primary !px-3 !py-2 text-xs"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "Importing…" : "Upload Word .docx"}
        </button>
        <span className="text-[11px] text-[var(--muted)]">or drop a file here</span>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={googleUrl}
          onChange={(e) => setGoogleUrl(e.target.value)}
          placeholder="Paste a Google Docs link"
          className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs"
        />
        <button
          type="button"
          className="btn-secondary !px-3 !py-2 text-xs"
          disabled={busy}
          onClick={() => void onGoogle()}
        >
          Import Google Doc
        </button>
      </div>
      <p className="mt-1.5 text-[10px] text-[var(--muted)]">
        Google Docs: Share → Anyone with the link can view, or File → Download →
        Microsoft Word (.docx, up to 50 MB) and upload that file.
      </p>
      {note ? (
        <p className="mt-2 text-[11px] text-emerald-800">{note}</p>
      ) : null}
    </div>
  );
}
