"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { NahdaLoader } from "@/components/nahda-loader";
import { uiStatus } from "@/lib/submission-utils";

type Submission = {
  id: string;
  manuscriptId: string;
  title: string;
  status: Parameters<typeof uiStatus>[0];
  progress: number;
  updatedAt: string;
  author: { name: string; email: string };
  journal: { title: string };
};

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, setPending] = useState<Submission | null>(null);

  async function reload() {
    const res = await fetch("/api/admin/submissions");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not load inbox");
    setSubmissions(data.submissions ?? []);
  }

  useEffect(() => {
    void (async () => {
      try {
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function confirmDelete() {
    if (!pending) return;
    setBusyId(pending.id);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(
        `/api/admin/submissions?id=${encodeURIComponent(pending.id)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not delete");
      setSuccess("Moved to recycle bin.");
      setPending(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setPending(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <ConfirmDialog
        open={Boolean(pending)}
        tone="danger"
        eyebrow={pending?.manuscriptId}
        title="Move submission to recycle bin?"
        description={
          <>
            <p>
              <span className="font-medium text-[var(--ink)]">
                “{pending?.title}”
              </span>{" "}
              will leave the inbox and the author’s dashboard.
            </p>
            <p className="mt-2 text-xs">
              You can restore it later from Recycle bin, or delete it forever
              there.
            </p>
          </>
        }
        confirmLabel="Move to bin"
        cancelLabel="Keep"
        busy={Boolean(pending && busyId === pending.id)}
        onCancel={() => {
          if (!busyId) setPending(null);
        }}
        onConfirm={() => void confirmDelete()}
      />

      <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
        Submission inbox
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Review manuscripts and send feedback. Authors get dashboard + email
        updates and progress changes instantly. After acceptance, write the
        full article in{" "}
        <Link
          href="/admin/manuscripts"
          className="font-semibold text-[var(--accent)]"
        >
          Full manuscripts
        </Link>
        , then go live from{" "}
        <Link
          href="/admin/publishedArticles"
          className="font-semibold text-[var(--accent)]"
        >
          Publish papers
        </Link>
        . Deleted items go to the{" "}
        <Link
          href="/admin/recycle-bin"
          className="font-semibold text-[var(--accent)]"
        >
          recycle bin
        </Link>
        .
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {loading && <NahdaLoader variant="panel" label="Loading inbox…" />}
        {!loading && submissions.length === 0 && (
          <p className="rounded-xl border border-[var(--line)] bg-white p-8 text-center text-sm text-[var(--muted)]">
            No submissions yet.
          </p>
        )}
        {submissions.map((sub) => {
          const busy = busyId === sub.id;
          return (
            <div
              key={sub.id}
              className="rounded-xl border border-[var(--line)] bg-white p-4 transition hover:border-[var(--accent)]/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link
                  href={`/admin/submissions/${sub.id}`}
                  className="min-w-0 flex-1"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 font-semibold text-[var(--accent)]">
                      {uiStatus(sub.status)}
                    </span>
                    <span className="text-[var(--muted)]">{sub.manuscriptId}</span>
                  </div>
                  <h2 className="mt-2 font-semibold text-[var(--ink)]">
                    {sub.title}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {sub.author.name} · {sub.journal.title}
                  </p>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      <span>Progress</span>
                      <span>{sub.progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${sub.progress}%` }}
                      />
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  disabled={busy}
                  className="shrink-0 text-xs font-semibold text-rose-700 disabled:opacity-50"
                  onClick={() => setPending(sub)}
                >
                  {busy ? "Moving…" : "Delete"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
