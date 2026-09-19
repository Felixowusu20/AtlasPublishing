"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { NahdaLoader } from "@/components/nahda-loader";
import { useAdminAuth } from "@/components/admin-auth-provider";

type BinArticle = {
  id: string;
  title: string;
  slug: string;
  doi: string | null;
  authors: string[];
  articleType: string;
  deletedAt: string | null;
  trashedSubmissionId: string | null;
  journal: { title: string; shortTitle: string };
};

type BinSubmission = {
  id: string;
  manuscriptId: string;
  title: string;
  status: string;
  deletedAt: string | null;
  author: { name: string; email: string };
  journal: { title: string; shortTitle: string };
};

type Pending =
  | {
      mode: "single";
      type: "article" | "submission";
      id: string;
      title: string;
      action: "restore" | "purge";
    }
  | {
      mode: "bulk";
      type: "article" | "submission";
      ids: string[];
      action: "purge";
    };

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function toggleId(prev: Set<string>, id: string) {
  const next = new Set(prev);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export default function RecycleBinPage() {
  const { user } = useAdminAuth();
  const [articles, setArticles] = useState<BinArticle[]>([]);
  const [submissions, setSubmissions] = useState<BinSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(
    () => new Set(),
  );

  const isSuper = user?.role === "SUPER_ADMIN";
  const canView = user?.role === "SUPER_ADMIN" || user?.role === "REVIEWER";

  const allArticlesSelected =
    articles.length > 0 && selectedArticles.size === articles.length;
  const allSubmissionsSelected =
    submissions.length > 0 && selectedSubmissions.size === submissions.length;

  const selectedArticleCount = selectedArticles.size;
  const selectedSubmissionCount = selectedSubmissions.size;

  const pendingBusy = useMemo(() => {
    if (!pending) return false;
    if (pending.mode === "bulk") return bulkBusy;
    return busyId === pending.id;
  }, [pending, busyId, bulkBusy]);

  async function reload() {
    const res = await fetch("/api/admin/recycle-bin");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not load recycle bin");
    setArticles(data.articles ?? []);
    setSubmissions(data.submissions ?? []);
    setSelectedArticles(new Set());
    setSelectedSubmissions(new Set());
  }

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    void (async () => {
      try {
        await reload();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Load failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canView]);

  async function confirmAction() {
    if (!pending || !isSuper) return;
    setError("");
    setSuccess("");

    if (pending.mode === "bulk") {
      setBulkBusy(true);
      try {
        const res = await fetch("/api/admin/recycle-bin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "purge",
            type: pending.type,
            ids: pending.ids,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Action failed");
        const count = typeof data.count === "number" ? data.count : pending.ids.length;
        setSuccess(
          `Permanently deleted ${count} ${
            pending.type === "article" ? "article" : "submission"
          }${count === 1 ? "" : "s"}.`,
        );
        setPending(null);
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
        setPending(null);
      } finally {
        setBulkBusy(false);
      }
      return;
    }

    setBusyId(pending.id);
    try {
      const res = await fetch("/api/admin/recycle-bin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: pending.action,
          type: pending.type,
          id: pending.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      setSuccess(
        pending.action === "restore"
          ? "Restored from recycle bin."
          : "Permanently deleted.",
      );
      setPending(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
      setPending(null);
    } finally {
      setBusyId(null);
    }
  }

  if (!canView) {
    return <p className="text-sm text-[var(--muted)]">Admin access required.</p>;
  }

  const empty = !loading && articles.length === 0 && submissions.length === 0;
  const dialogBusy = Boolean(pending && pendingBusy);

  return (
    <div>
      <ConfirmDialog
        open={Boolean(pending)}
        tone={pending?.action === "purge" ? "danger" : "accent"}
        eyebrow={
          pending?.mode === "bulk"
            ? pending.type === "article"
              ? "Published articles"
              : "Submissions"
            : pending?.type === "article"
              ? "Published article"
              : "Submission"
        }
        title={
          pending?.mode === "bulk"
            ? `Delete ${pending.ids.length} item${
                pending.ids.length === 1 ? "" : "s"
              } permanently?`
            : pending?.action === "restore"
              ? "Restore this item?"
              : "Delete permanently?"
        }
        description={
          pending?.mode === "bulk" ? (
            <p>
              Permanently delete{" "}
              <span className="font-medium text-[var(--ink)]">
                {pending.ids.length}{" "}
                {pending.type === "article" ? "article" : "submission"}
                {pending.ids.length === 1 ? "" : "s"}
              </span>
              . This cannot be undone.
            </p>
          ) : pending?.action === "restore" ? (
            <p>
              Restore{" "}
              <span className="font-medium text-[var(--ink)]">
                “{pending?.title}”
              </span>{" "}
              from the recycle bin.
              {pending?.type === "article"
                ? " It will become live again if a submission can be re-linked."
                : " It will return to the submission inbox."}
            </p>
          ) : (
            <p>
              Permanently delete{" "}
              <span className="font-medium text-[var(--ink)]">
                “{pending?.title}”
              </span>
              . This cannot be undone.
            </p>
          )
        }
        confirmLabel={
          pending?.mode === "bulk"
            ? "Delete forever"
            : pending?.action === "restore"
              ? "Restore"
              : "Delete forever"
        }
        cancelLabel="Cancel"
        busy={dialogBusy}
        onCancel={() => {
          if (!busyId && !bulkBusy) setPending(null);
        }}
        onConfirm={() => void confirmAction()}
      />

      <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
        Recycle bin
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Deleted published articles and submissions land here. Restore them, or
        permanently erase them
        {isSuper ? "" : " (super admin only)"}.
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

      {loading && (
        <NahdaLoader variant="panel" label="Loading recycle bin…" />
      )}

      {empty && (
        <p className="mt-6 rounded-xl border border-[var(--line)] bg-white p-8 text-center text-sm text-[var(--muted)]">
          Recycle bin is empty.
        </p>
      )}

      {articles.length > 0 && (
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
              Published articles ({articles.length})
            </h2>
            {isSuper && (
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={allArticlesSelected}
                    onChange={() => {
                      setSelectedArticles(
                        allArticlesSelected
                          ? new Set()
                          : new Set(articles.map((a) => a.id)),
                      );
                    }}
                    className="size-3.5 rounded border-[var(--line)] accent-[var(--accent)]"
                  />
                  Select all
                </label>
                <button
                  type="button"
                  disabled={selectedArticleCount === 0 || bulkBusy}
                  className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                  onClick={() =>
                    setPending({
                      mode: "bulk",
                      type: "article",
                      ids: [...selectedArticles],
                      action: "purge",
                    })
                  }
                >
                  Delete selected
                  {selectedArticleCount > 0 ? ` (${selectedArticleCount})` : ""}
                </button>
              </div>
            )}
          </div>
          <ul className="mt-3 space-y-3">
            {articles.map((a) => {
              const busy = busyId === a.id || bulkBusy;
              const checked = selectedArticles.has(a.id);
              return (
                <li
                  key={a.id}
                  className={`rounded-xl border bg-white p-4 ${
                    checked
                      ? "border-rose-200 ring-1 ring-rose-100"
                      : "border-[var(--line)]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 gap-3">
                      {isSuper && (
                        <label className="mt-1 shrink-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={busy}
                            onChange={() =>
                              setSelectedArticles((prev) =>
                                toggleId(prev, a.id),
                              )
                            }
                            className="size-3.5 rounded border-[var(--line)] accent-[var(--accent)]"
                            aria-label={`Select “${a.title}”`}
                          />
                        </label>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs text-[var(--accent)]">
                          {a.articleType} · {a.journal.shortTitle}
                        </p>
                        <h3 className="mt-1 font-semibold text-[var(--ink)]">
                          {a.title}
                        </h3>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {a.authors.join(", ") || "—"}
                          {a.doi ? ` · ${a.doi}` : ""}
                        </p>
                        <p className="mt-1 text-[11px] text-[var(--muted)]">
                          Deleted {formatWhen(a.deletedAt)}
                        </p>
                      </div>
                    </div>
                    {isSuper && (
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={busy}
                          className="text-xs font-semibold text-[var(--accent)] disabled:opacity-50"
                          onClick={() =>
                            setPending({
                              mode: "single",
                              type: "article",
                              id: a.id,
                              title: a.title,
                              action: "restore",
                            })
                          }
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className="text-xs font-semibold text-rose-700 disabled:opacity-50"
                          onClick={() =>
                            setPending({
                              mode: "single",
                              type: "article",
                              id: a.id,
                              title: a.title,
                              action: "purge",
                            })
                          }
                        >
                          Delete forever
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {submissions.length > 0 && (
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
              Submissions ({submissions.length})
            </h2>
            {isSuper && (
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={allSubmissionsSelected}
                    onChange={() => {
                      setSelectedSubmissions(
                        allSubmissionsSelected
                          ? new Set()
                          : new Set(submissions.map((s) => s.id)),
                      );
                    }}
                    className="size-3.5 rounded border-[var(--line)] accent-[var(--accent)]"
                  />
                  Select all
                </label>
                <button
                  type="button"
                  disabled={selectedSubmissionCount === 0 || bulkBusy}
                  className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                  onClick={() =>
                    setPending({
                      mode: "bulk",
                      type: "submission",
                      ids: [...selectedSubmissions],
                      action: "purge",
                    })
                  }
                >
                  Delete selected
                  {selectedSubmissionCount > 0
                    ? ` (${selectedSubmissionCount})`
                    : ""}
                </button>
              </div>
            )}
          </div>
          <ul className="mt-3 space-y-3">
            {submissions.map((s) => {
              const busy = busyId === s.id || bulkBusy;
              const checked = selectedSubmissions.has(s.id);
              return (
                <li
                  key={s.id}
                  className={`rounded-xl border bg-white p-4 ${
                    checked
                      ? "border-rose-200 ring-1 ring-rose-100"
                      : "border-[var(--line)]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 gap-3">
                      {isSuper && (
                        <label className="mt-1 shrink-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={busy}
                            onChange={() =>
                              setSelectedSubmissions((prev) =>
                                toggleId(prev, s.id),
                              )
                            }
                            className="size-3.5 rounded border-[var(--line)] accent-[var(--accent)]"
                            aria-label={`Select “${s.title}”`}
                          />
                        </label>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs text-[var(--accent)]">
                          {s.manuscriptId} · {s.journal.shortTitle}
                        </p>
                        <h3 className="mt-1 font-semibold text-[var(--ink)]">
                          {s.title}
                        </h3>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {s.author.name} · {s.author.email} · {s.status}
                        </p>
                        <p className="mt-1 text-[11px] text-[var(--muted)]">
                          Deleted {formatWhen(s.deletedAt)}
                        </p>
                      </div>
                    </div>
                    {isSuper && (
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={busy}
                          className="text-xs font-semibold text-[var(--accent)] disabled:opacity-50"
                          onClick={() =>
                            setPending({
                              mode: "single",
                              type: "submission",
                              id: s.id,
                              title: s.title,
                              action: "restore",
                            })
                          }
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className="text-xs font-semibold text-rose-700 disabled:opacity-50"
                          onClick={() =>
                            setPending({
                              mode: "single",
                              type: "submission",
                              id: s.id,
                              title: s.title,
                              action: "purge",
                            })
                          }
                        >
                          Delete forever
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
