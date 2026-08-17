"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  journal: { id: string; title: string; shortTitle?: string | null };
};

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, setPending] = useState<Submission | null>(null);
  const [collapsedJournals, setCollapsedJournals] = useState<Set<string>>(
    () => new Set(),
  );

  const journalGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        id: string;
        title: string;
        shortTitle?: string | null;
        submissions: Submission[];
      }
    >();

    for (const submission of submissions) {
      const key = submission.journal.id || submission.journal.title;
      const group = groups.get(key);
      if (group) {
        group.submissions.push(submission);
      } else {
        groups.set(key, {
          id: key,
          title: submission.journal.title,
          shortTitle: submission.journal.shortTitle,
          submissions: [submission],
        });
      }
    }

    return [...groups.values()].sort((a, b) =>
      a.title.localeCompare(b.title),
    );
  }, [submissions]);

  function toggleJournal(id: string) {
    setCollapsedJournals((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
        Submissions are grouped by the journal selected by each author, making
        editorial review and assignment easier. After acceptance, write the
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

      {!loading && submissions.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
            {journalGroups.length}{" "}
            {journalGroups.length === 1 ? "journal" : "journals"}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--muted)] ring-1 ring-[var(--line)]">
            {submissions.length}{" "}
            {submissions.length === 1 ? "submission" : "submissions"}
          </span>
        </div>
      )}

      <div className="mt-6 space-y-5">
        {loading && <NahdaLoader variant="panel" label="Loading inbox…" />}
        {!loading && submissions.length === 0 && (
          <p className="rounded-xl border border-[var(--line)] bg-white p-8 text-center text-sm text-[var(--muted)]">
            No submissions yet.
          </p>
        )}
        {journalGroups.map((group) => {
          const collapsed = collapsedJournals.has(group.id);
          const statuses = new Map<string, number>();
          for (const submission of group.submissions) {
            const label = uiStatus(submission.status);
            statuses.set(label, (statuses.get(label) ?? 0) + 1);
          }

          return (
            <section
              key={group.id}
              className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm"
            >
              <button
                type="button"
                className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition hover:bg-[var(--surface)]/55 sm:px-5"
                aria-expanded={!collapsed}
                onClick={() => toggleJournal(group.id)}
              >
                <span className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-bold text-white">
                    {(group.shortTitle || group.title)
                      .split(/\s+/)
                      .map((word) => word[0])
                      .join("")
                      .slice(0, 3)
                      .toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-[family-name:var(--font-display)] text-lg font-semibold leading-tight text-[var(--ink)]">
                      {group.title}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-[var(--muted)]">
                        {group.submissions.length}{" "}
                        {group.submissions.length === 1
                          ? "submission"
                          : "submissions"}
                      </span>
                      {[...statuses.entries()].map(([status, count]) => (
                        <span
                          key={status}
                          className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]"
                        >
                          {count} {status}
                        </span>
                      ))}
                    </span>
                  </span>
                </span>
                <span
                  className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted)] transition-transform ${
                    collapsed ? "" : "rotate-180"
                  }`}
                  aria-hidden
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </button>

              {!collapsed && (
                <div className="space-y-2 border-t border-[var(--line)] bg-[var(--surface)]/35 p-3 sm:p-4">
                  {group.submissions.map((sub) => {
                    const busy = busyId === sub.id;
                    return (
                      <article
                        key={sub.id}
                        className="rounded-xl border border-[var(--line)] bg-white p-4 transition hover:border-[var(--accent)]/40 hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={`/admin/submissions/${sub.id}`}
                            className="min-w-0 flex-1"
                          >
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 font-semibold text-[var(--accent)]">
                                {uiStatus(sub.status)}
                              </span>
                              <span className="font-mono text-[var(--muted)]">
                                {sub.manuscriptId}
                              </span>
                            </div>
                            <h2 className="mt-2 font-semibold leading-snug text-[var(--ink)]">
                              {sub.title}
                            </h2>
                            <p className="mt-1 text-xs text-[var(--muted)]">
                              {sub.author.name} · {sub.author.email}
                            </p>
                            <div className="mt-3">
                              <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-[var(--muted)]">
                                <span>Editorial progress</span>
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
                            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                            onClick={() => setPending(sub)}
                          >
                            {busy ? "Moving…" : "Delete"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
