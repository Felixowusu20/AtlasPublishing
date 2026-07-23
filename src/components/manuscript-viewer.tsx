"use client";

import { useMemo, useState } from "react";
import {
  detectFileKind,
  googleEmbedUrl,
  officeEmbedUrl,
  toInlineCloudinaryUrl,
} from "@/lib/file-view";

type Props = {
  url: string;
  title?: string;
  className?: string;
};

export function ManuscriptViewer({ url, title, className }: Props) {
  const kind = useMemo(() => detectFileKind(url), [url]);
  const inlineRemote = useMemo(() => toInlineCloudinaryUrl(url), [url]);
  const proxyUrl = useMemo(
    () => `/api/files/view?url=${encodeURIComponent(inlineRemote)}`,
    [inlineRemote],
  );
  const [mode, setMode] = useState<"native" | "office" | "google">(() => {
    if (kind === "office") return "office";
    if (kind === "pdf" || kind === "image") return "native";
    return "google";
  });

  const embedSrc =
    mode === "office"
      ? officeEmbedUrl(inlineRemote)
      : mode === "google"
        ? googleEmbedUrl(inlineRemote)
        : proxyUrl;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--surface)]/60 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">
            {title ?? "Manuscript preview"}
          </p>
          <p className="text-[11px] text-[var(--muted)]">
            Opens on this page — no download required
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(kind === "pdf" || kind === "other") && (
            <>
              <ModeButton
                active={mode === "native"}
                onClick={() => setMode("native")}
                label="In-app"
              />
              <ModeButton
                active={mode === "google"}
                onClick={() => setMode("google")}
                label="Google view"
              />
            </>
          )}
          {kind === "office" && (
            <>
              <ModeButton
                active={mode === "office"}
                onClick={() => setMode("office")}
                label="Office view"
              />
              <ModeButton
                active={mode === "google"}
                onClick={() => setMode("google")}
                label="Google view"
              />
            </>
          )}
          <a
            href={proxyUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[var(--line)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--ink)] hover:border-[var(--accent)]"
          >
            Open tab
          </a>
        </div>
      </div>

      <div className="relative bg-[#e8edf2]">
        {kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proxyUrl}
            alt={title ?? "Manuscript image"}
            className="mx-auto max-h-[75vh] w-auto max-w-full object-contain p-4"
          />
        ) : (
          <iframe
            key={embedSrc}
            title={title ?? "Manuscript viewer"}
            src={embedSrc}
            className="h-[min(75vh,720px)] w-full border-0 bg-white"
            allow="fullscreen"
          />
        )}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
        active
          ? "bg-[var(--ink)] text-white"
          : "border border-[var(--line)] bg-white text-[var(--muted)] hover:text-[var(--ink)]"
      }`}
    >
      {label}
    </button>
  );
}
