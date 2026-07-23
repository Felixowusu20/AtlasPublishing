"use client";

import { useEffect, useMemo, useState } from "react";
import {
  detectFileKind,
  googleEmbedUrl,
  mimeFromUrl,
  officeEmbedUrl,
  toInlineCloudinaryUrl,
} from "@/lib/file-view";

type Props = {
  url: string;
  publicId?: string | null;
  title?: string;
  className?: string;
};

type ViewMode = "native" | "google" | "office";

/**
 * In-app manuscript viewer with optional Google / Office embeds.
 */
export function ManuscriptViewer({ url, publicId, title, className }: Props) {
  const kind = useMemo(() => detectFileKind(url), [url]);
  const inlineRemote = useMemo(() => toInlineCloudinaryUrl(url), [url]);
  const proxyUrl = useMemo(() => {
    const params = new URLSearchParams({
      url: inlineRemote,
      redirect: "0",
    });
    if (publicId) params.set("publicId", publicId);
    return `/api/files/view?${params.toString()}`;
  }, [inlineRemote, publicId]);

  const [mode, setMode] = useState<ViewMode>(() => {
    if (kind === "office") return "native";
    return "native";
  });

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "native") {
      setLoading(false);
      setError("");
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      setBlobUrl(null);
      try {
        const res = await fetch(proxyUrl);
        const contentType = res.headers.get("content-type") || "";
        if (!res.ok || contentType.includes("application/json")) {
          const data = contentType.includes("application/json")
            ? await res.json().catch(() => null)
            : null;
          throw new Error(data?.error ?? "Could not load manuscript file");
        }
        const buffer = await res.arrayBuffer();
        if (!buffer.byteLength) {
          throw new Error("Empty file returned from storage");
        }
        const type =
          contentType.split(";")[0] || mimeFromUrl(url) || "application/pdf";
        const blob = new Blob([buffer], { type });
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setBlobUrl(objectUrl);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to open file");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mode, proxyUrl, url]);

  const embedSrc =
    mode === "google"
      ? googleEmbedUrl(inlineRemote)
      : mode === "office"
        ? officeEmbedUrl(inlineRemote)
        : null;

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
            Opens on this page — switch viewer if needed
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
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
          {(kind === "office" || kind === "other") && (
            <ModeButton
              active={mode === "office"}
              onClick={() => setMode("office")}
              label="Office view"
            />
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

      <div className="relative min-h-[320px] bg-[#e8edf2]">
        {mode === "native" && (
          <>
            {loading && (
              <p className="p-8 text-center text-sm text-[var(--muted)]">
                Loading manuscript…
              </p>
            )}

            {!loading && error && (
              <div className="space-y-3 p-8 text-center">
                <p className="text-sm text-rose-700">{error}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <a href={proxyUrl} target="_blank" rel="noreferrer" className="btn-primary">
                    Open via secure link
                  </a>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setMode("google")}
                  >
                    Try Google view
                  </button>
                </div>
              </div>
            )}

            {!loading && !error && blobUrl && kind === "image" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={blobUrl}
                alt={title ?? "Manuscript image"}
                className="mx-auto max-h-[75vh] w-auto max-w-full object-contain p-4"
              />
            )}

            {!loading && !error && blobUrl && kind === "pdf" && (
              <iframe
                title={title ?? "Manuscript PDF"}
                src={`${blobUrl}#view=FitH`}
                className="h-[min(75vh,720px)] w-full border-0 bg-white"
              />
            )}

            {!loading &&
              !error &&
              blobUrl &&
              kind !== "pdf" &&
              kind !== "image" && (
                <div className="space-y-3 p-8 text-center">
                  <p className="text-sm text-[var(--ink)]">
                    File loaded. Open in a new tab to download, or try Google /
                    Office view.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <a
                      href={blobUrl}
                      download
                      className="btn-primary"
                    >
                      Download file
                    </a>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setMode("google")}
                    >
                      Google view
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setMode("office")}
                    >
                      Office view
                    </button>
                  </div>
                </div>
              )}
          </>
        )}

        {(mode === "google" || mode === "office") && embedSrc && (
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
