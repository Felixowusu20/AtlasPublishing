"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
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

type Pending = {
  type: "article" | "submission";
  id: string;
  title: string;
  action: "restore" | "purge";
};

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function RecycleBinPage() {
  const { user } = useAdminAuth();
  const [articles, setArticles] = useState<BinArticle[]>([]);
  const [submissions, setSubmissions] = useState<BinSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const isSuper = user?.role === "SUPER_ADMIN";
  const canView = user?.role === "SUPER_ADMIN" || user?.role === "REVIEWER";

  async function reload() {
    const res = await fetch("/api/admin/recycle-bin");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not load recycle bin");
    setArticles(data.articles ?? []);
    setSubmissions(data.submissions ?? []);
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
    setBusyId(pending.id);
    setError("");
    setSuccess("");
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

  return (
    <div>
      <ConfirmDialog
        open={Boolean(pending)}
        tone={pending?.action === "purge" ? "danger" : "accent"}
        eyebrow={pending?.type === "article" ? "Published article" : "Submission"}
        title={
          pending?.action === "restore"
            ? "Restore this item?"
            : "Delete permanently?"
        }
        description={
          pending?.action === "restore" ? (
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
          pending?.action === "restore" ? "Restore" : "Delete forever"
        }
        cancelLabel="Cancel"
        busy={Boolean(pending && busyId === pending.id)}
        onCancel={() => {
          if (!busyId) setPending(null);
        }}
        onConfirm={() => void confirmAction()}
      />

      <h1 className="font-[family-name:var(--font-display)] text-3xl">
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
        <p className="mt-6 text-sm text-[var(--muted)]">Loading recycle bin…</p>
      )}

      {empty && (
        <p className="mt-6 rounded-xl border border-[var(--line)] bg-white p-8 text-center text-sm text-[var(--muted)]">
          Recycle bin is empty.
        </p>
      )}

      {articles.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            Published articles ({articles.length})
          </h2>
          <ul className="mt-3 space-y-3">
            {articles.map((a) => {
              const busy = busyId === a.id;
              return (
                <li
                  key={a.id}
                  className="rounded-xl border border-[var(--line)] bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
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
                    {isSuper && (
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={busy}
                          className="text-xs font-semibold text-[var(--accent)] disabled:opacity-50"
                          onClick={() =>
                            setPending({
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
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            Submissions ({submissions.length})
          </h2>
          <ul className="mt-3 space-y-3">
            {submissions.map((s) => {
              const busy = busyId === s.id;
              return (
                <li
                  key={s.id}
                  className="rounded-xl border border-[var(--line)] bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
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
                    {isSuper && (
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={busy}
                          className="text-xs font-semibold text-[var(--accent)] disabled:opacity-50"
                          onClick={() =>
                            setPending({
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
