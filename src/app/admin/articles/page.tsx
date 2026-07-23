"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin-auth-provider";

type Journal = { id: string; title: string };
type Article = {
  id: string;
  title: string;
  articleType: string;
  authors: string[];
  journal: Journal;
  publishedAt: string;
  isFeatured: boolean;
};

export default function ArticlesCmsPage() {
  const { user } = useAdminAuth();
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
  const [loading, setLoading] = useState(false);

  async function load() {
    const [a, j] = await Promise.all([
      fetch("/api/admin/articles").then((r) => r.json()),
      fetch("/api/admin/journals").then((r) => r.json()),
    ]);
    if (a.articles) setArticles(a.articles);
    if (j.journals) setJournals(j.journals);
  }

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") void load();
  }, [user?.role]);

  if (user?.role !== "SUPER_ADMIN") {
    return <p className="text-sm text-[var(--muted)]">Super admin only.</p>;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
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
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete article?")) return;
    await fetch(`/api/admin/articles?id=${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Latest articles CMS
        </h1>
        <div className="mt-6 space-y-3">
          {articles.map((a) => (
            <article
              key={a.id}
              className="rounded-xl border border-[var(--line)] bg-white p-4"
            >
              <p className="text-xs text-[var(--accent)]">{a.articleType}</p>
              <h2 className="mt-1 font-semibold">{a.title}</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {a.authors.join(", ")} · {a.journal.title}
              </p>
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-rose-700"
                onClick={() => void remove(a.id)}
              >
                Delete
              </button>
            </article>
          ))}
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="h-fit space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5"
      >
        <h2 className="text-sm font-semibold">Publish article card</h2>
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
        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Saving…" : "Add article"}
        </button>
      </form>
    </div>
  );
}
