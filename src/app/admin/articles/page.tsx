"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/components/admin-auth-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";

type Journal = { id: string; title: string };
type Article = {
  id: string;
  slug: string;
  title: string;
  articleType: string;
  authors: string[];
  journal: Journal;
  publishedAt: string;
  isFeatured: boolean;
  views: number;
  downloads: number;
  submissionId?: string | null;
  submission?: {
    id: string;
    manuscriptId: string;
    author: { name: string; email: string };
  } | null;
};

type PendingAction = {
  id: string;
  title: string;
  manuscriptId?: string;
  forEdit: boolean;
};

export default function ArticlesCmsPage() {
  const { user } = useAdminAuth();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [form, setForm] = useState({
    title: "",
    journalId: "",
    articleType: "Research Article",
    authors: "",
    abstract: "",
    keywords: "",
    isFeatured: true,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const isSuper = user?.role === "SUPER_ADMIN";
  const canManage = user?.role === "SUPER_ADMIN" || user?.role === "REVIEWER";

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    void (async () => {
      const [a, j] = await Promise.all([
        fetch("/api/admin/articles").then((r) => r.json()),
        fetch("/api/admin/journals").then((r) => r.json()),
      ]);
      if (cancelled) return;
      if (a.articles) setArticles(a.articles);
      if (j.journals) setJournals(j.journals);
    })();
    return () => {
      cancelled = true;
    };
  }, [canManage]);

  async function reload() {
    const [a, j] = await Promise.all([
      fetch("/api/admin/articles").then((r) => r.json()),
      fetch("/api/admin/journals").then((r) => r.json()),
    ]);
    if (a.articles) setArticles(a.articles);
    if (j.journals) setJournals(j.journals);
  }

  if (!canManage) {
    return <p className="text-sm text-[var(--muted)]">Admin access required.</p>;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isSuper) return;
    setLoading(true);
    setError("");
    setSuccess("");
    const res = await fetch("/api/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        journalId: form.journalId,
        articleType: form.articleType,
        authors: form.authors
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        abstract: form.abstract,
        keywords: form.keywords
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        isFeatured: form.isFeatured,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setForm({
      title: "",
      journalId: form.journalId,
      articleType: "Research Article",
      authors: "",
      abstract: "",
      keywords: "",
      isFeatured: true,
    });
    setSuccess("Article card added.");
    await reload();
  }

  function askRemove(article: Article, forEdit: boolean) {
    setPending({
      id: article.id,
      title: article.title,
      manuscriptId: article.submission?.manuscriptId,
      forEdit,
    });
  }

  async function confirmRemove() {
    if (!pending) return;
    const { id, forEdit } = pending;
    setBusyId(id);
    setError("");
    setSuccess("");
    try {
      const res = forEdit
        ? await fetch("/api/admin/articles/unpublish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          })
        : await fetch(
            `/api/admin/articles?id=${encodeURIComponent(id)}`,
            { method: "DELETE" },
          );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ?? (forEdit ? "Could not unpublish" : "Delete failed"),
        );
      }
      setPending(null);
      if (forEdit && data.editUrl) {
        router.push(data.editUrl as string);
        return;
      }
      setSuccess("Moved to recycle bin.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setPending(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <ConfirmDialog
        open={Boolean(pending)}
        tone={pending?.forEdit ? "accent" : "danger"}
        eyebrow={pending?.manuscriptId ?? "Published article"}
        title={
          pending?.forEdit
            ? "Open in Full manuscripts?"
            : "Move to recycle bin?"
        }
        description={
          pending?.forEdit ? (
            <>
              <p>
                <span className="font-medium text-[var(--ink)]">
                  “{pending.title}”
                </span>{" "}
                will be unpublished so you can revise the full manuscript.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
                  Removed from the public site until you publish again
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
                  Author loses the published download until republished
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
                  Your production draft is kept for editing
                </li>
              </ul>
            </>
          ) : (
            <>
              <p>
                Move{" "}
                <span className="font-medium text-[var(--ink)]">
                  “{pending?.title}”
                </span>{" "}
                to the recycle bin.
              </p>
              <p className="mt-2 text-xs">
                It leaves the public site and the author’s published list. You
                can restore it later from Recycle bin.
              </p>
            </>
          )
        }
        confirmLabel={
          pending?.forEdit ? "Unpublish & edit" : "Move to bin"
        }
        cancelLabel="Keep published"
        busy={Boolean(pending && busyId === pending.id)}
        onCancel={() => {
          if (!busyId) setPending(null);
        }}
        onConfirm={() => void confirmRemove()}
      />

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
          Latest articles
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Manage live articles. Delete moves them to the recycle bin. Edit
          unpublishes and opens Full manuscripts.
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
          {articles.length === 0 && (
            <p className="rounded-xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--muted)]">
              No published articles yet.
            </p>
          )}
          {articles.map((a) => {
            const submissionId = a.submission?.id ?? a.submissionId;
            const busy = busyId === a.id;
            return (
              <article
                key={a.id}
                className="rounded-xl border border-[var(--line)] bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-[var(--accent)]">
                      {a.articleType}
                      {a.isFeatured ? " · Featured" : ""}
                    </p>
                    <h2 className="mt-1 font-semibold">{a.title}</h2>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {a.authors.join(", ")} · {a.journal.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {a.views.toLocaleString()} views ·{" "}
                      {a.downloads.toLocaleString()} downloads
                      {a.submission?.manuscriptId
                        ? ` · ${a.submission.manuscriptId}`
                        : ""}
                    </p>
                  </div>
                  <Link
                    href={`/articles/${a.slug}`}
                    target="_blank"
                    className="text-xs font-semibold text-[var(--accent)]"
                  >
                    View live →
                  </Link>
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  {submissionId ? (
                    <button
                      type="button"
                      disabled={busy}
                      className="text-xs font-semibold text-[var(--ink)] hover:text-[var(--accent)] disabled:opacity-50"
                      onClick={() => askRemove(a, true)}
                    >
                      {busy ? "Working…" : "Edit manuscript"}
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">
                      Manual card (no manuscript)
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    className="text-xs font-semibold text-rose-700 disabled:opacity-50"
                    onClick={() => askRemove(a, false)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {isSuper ? (
        <form
          onSubmit={onSubmit}
          className="h-fit space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5"
        >
          <h2 className="text-sm font-semibold">Add article card</h2>
          <p className="text-xs text-[var(--muted)]">
            Manual homepage cards without a submission. Prefer publishing from
            Publish papers for real manuscripts.
          </p>
          <label className="field">
            <span>Title</span>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Journal</span>
            <select
              required
              value={form.journalId}
              onChange={(e) =>
                setForm((p) => ({ ...p, journalId: e.target.value }))
              }
            >
              <option value="">Select…</option>
              {journals.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Authors (comma-separated)</span>
            <input
              required
              value={form.authors}
              onChange={(e) =>
                setForm((p) => ({ ...p, authors: e.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Abstract</span>
            <textarea
              required
              rows={4}
              value={form.abstract}
              onChange={(e) =>
                setForm((p) => ({ ...p, abstract: e.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Keywords</span>
            <input
              value={form.keywords}
              onChange={(e) =>
                setForm((p) => ({ ...p, keywords: e.target.value }))
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) =>
                setForm((p) => ({ ...p, isFeatured: e.target.checked }))
              }
            />
            Feature on homepage
          </label>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Saving…" : "Add article"}
          </button>
        </form>
      ) : (
        <aside className="h-fit rounded-2xl border border-[var(--line)] bg-white p-5 text-sm text-[var(--muted)]">
          <p className="font-semibold text-[var(--ink)]">Tip</p>
          <p className="mt-2">
            Use <strong>Edit manuscript</strong> to unpublish and revise the
            full article, then publish again from Publish papers.{" "}
            <strong>Delete</strong> removes it from Nahda and the author’s
            published list.
          </p>
          <Link
            href="/admin/publishedArticles"
            className="mt-4 inline-block text-sm font-semibold text-[var(--accent)]"
          >
            Go to Publish papers →
          </Link>
        </aside>
      )}
    </div>
  );
}
