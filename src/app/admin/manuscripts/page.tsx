"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  ManuscriptEditor,
  type ManuscriptFigure,
} from "@/components/manuscript-editor";

type QueueItem = {
  id: string;
  manuscriptId: string;
  title: string;
  abstract: string;
  keywords: string[];
  articleType: string;
  status: string;
  progress: number;
  manuscriptUrl?: string | null;
  productionBody?: string | null;
  productionFigures?: ManuscriptFigure[] | null;
  manuscriptReadyAt?: string | null;
  journal: { id: string; title: string; shortTitle: string };
  author: {
    id: string;
    name: string;
    email: string;
    institution?: string | null;
  };
};

const DEFAULT_BODY = `# Introduction

Paste or write the full manuscript sections here.

## Methods



## Results



## Discussion



## Conclusion



## References

`;

function parseFigures(value: unknown): ManuscriptFigure[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (f): f is ManuscriptFigure =>
      !!f &&
      typeof f === "object" &&
      typeof (f as ManuscriptFigure).id === "string" &&
      typeof (f as ManuscriptFigure).url === "string" &&
      typeof (f as ManuscriptFigure).filename === "string",
  );
}

function ManuscriptsPageInner() {
  const searchParams = useSearchParams();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [figures, setFigures] = useState<ManuscriptFigure[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  const selected = useMemo(
    () => queue.find((q) => q.id === selectedId) ?? null,
    [queue, selectedId],
  );

  function selectItem(sub: QueueItem) {
    setSelectedId(sub.id);
    setError("");
    setBody(sub.productionBody?.trim() ? sub.productionBody : DEFAULT_BODY);
    setFigures(parseFigures(sub.productionFigures));
    setDirty(false);
  }

  async function load(preferId?: string | null) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/manuscripts${preferId || searchParams.get("id") ? `?id=${encodeURIComponent(preferId || searchParams.get("id") || "")}` : ""}`,
        { cache: "no-store" },
      );
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        setError("Manuscripts API did not return JSON. Restart the server.");
        setQueue([]);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load queue");
        setQueue([]);
        return;
      }
      const next: QueueItem[] = data.queue ?? [];
      setQueue(next);

      const targetId = preferId || searchParams.get("id") || selectedId;
      if (targetId) {
        const match = next.find((q) => q.id === targetId);
        if (match) selectItem(match);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue");
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(opts: { done: boolean }) {
    if (!selected) return;
    if (!body.trim()) {
      setError("Add the full manuscript text before continuing.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/manuscripts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: selected.id,
          body,
          figures,
          done: opts.done,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");

      setDirty(false);
      setQueue((prev) =>
        prev.map((q) =>
          q.id === selected.id
            ? {
                ...q,
                productionBody: body,
                productionFigures: figures,
                manuscriptReadyAt:
                  data.submission?.manuscriptReadyAt ?? q.manuscriptReadyAt,
                status: data.submission?.status ?? q.status,
              }
            : q,
        ),
      );

      if (opts.done) {
        // Hard navigate so Publish loads the saved body with a fresh client
        window.location.assign(
          data.publishUrl || `/admin/publishedArticles?id=${selected.id}`,
        );
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
      return;
    }
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)] sm:text-3xl">
          Full manuscripts
        </h1>
        <p className="text-xs text-[var(--muted)]">
          {queue.length} paper{queue.length === 1 ? "" : "s"} · Select one and
          write the full article
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside>
          {loading && (
            <p className="text-sm text-[var(--muted)]">Loading…</p>
          )}
          {!loading && queue.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              No accepted papers yet. Accept one from the inbox first.
            </p>
          )}
          <ul className="space-y-1">
            {queue.map((sub) => {
              const active = sub.id === selectedId;
              return (
                <li key={sub.id}>
                  <button
                    type="button"
                    onClick={() => selectItem(sub)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left transition ${
                      active
                        ? "bg-[var(--accent-soft)] text-[var(--ink)]"
                        : "text-[var(--ink)] hover:bg-white"
                    }`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                      {sub.manuscriptId}
                      {sub.manuscriptReadyAt ? " · Ready" : ""}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm font-medium">
                      {sub.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                      {sub.author.name}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section>
          {!selected ? (
            <p className="py-16 text-center text-sm text-[var(--muted)]">
              Select a manuscript to start editing.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                    {selected.title}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {selected.manuscriptId} · {selected.author.name}
                    {dirty ? " · Unsaved" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selected.manuscriptUrl && (
                    <a
                      href={`/api/files/view?url=${encodeURIComponent(selected.manuscriptUrl)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[var(--accent)] underline"
                    >
                      Original file
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn-secondary !px-3 !py-2 text-xs"
                    disabled={saving || !dirty}
                    onClick={() => void save({ done: false })}
                  >
                    {saving && dirty ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    className="btn-primary !px-3 !py-2 text-xs"
                    disabled={saving}
                    onClick={() => void save({ done: true })}
                  >
                    {saving ? "Saving…" : "Done — go to Publish"}
                  </button>
                </div>
              </div>

              <ManuscriptEditor
                value={body}
                onChange={(next) => {
                  setBody(next);
                  setDirty(true);
                }}
                figures={figures}
                onFiguresChange={(next) => {
                  setFigures(next);
                  setDirty(true);
                }}
                onError={setError}
                rows={24}
                label=""
                hint=""
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <Link
                  href={`/admin/submissions/${selected.id}`}
                  className="text-xs text-[var(--muted)] underline"
                >
                  Back to inbox detail
                </Link>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={saving}
                  onClick={() => void save({ done: true })}
                >
                  {saving ? "Saving…" : "Done — go to Publish"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function ManuscriptsPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-[var(--muted)]">Loading manuscripts…</p>
      }
    >
      <ManuscriptsPageInner />
    </Suspense>
  );
}
