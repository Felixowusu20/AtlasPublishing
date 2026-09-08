"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin-auth-provider";
import { uploadFileDirect } from "@/lib/client-upload";

type ArticleOption = {
  id: string;
  title: string;
  slug: string;
  coverImageUrl?: string | null;
  journal?: { title: string; shortTitle: string };
};

type Spotlight = {
  id: string;
  title: string;
  summary?: string | null;
  logoUrl?: string | null;
  logoPublicId?: string | null;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  articleId?: string | null;
  externalHref?: string | null;
  ctaLabel?: string | null;
  sortOrder: number;
  isActive: boolean;
  article?: ArticleOption | null;
};

const emptyForm = {
  title: "",
  summary: "",
  articleId: "",
  externalHref: "",
  ctaLabel: "Read article",
  sortOrder: "0",
};

async function uploadImage(file: File, folder: string) {
  return uploadFileDirect(file, {
    folder,
    resourceType: "image",
  });
}

export default function ResearchSpotlightsCmsPage() {
  const { user } = useAdminAuth();
  const [spotlights, setSpotlights] = useState<Spotlight[]>([]);
  const [articles, setArticles] = useState<ArticleOption[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const [spotRes, artRes] = await Promise.all([
      fetch("/api/admin/research-spotlights"),
      fetch("/api/admin/articles"),
    ]);
    const spotData = await spotRes.json();
    const artData = await artRes.json();
    if (spotRes.ok) setSpotlights(spotData.spotlights);
    if (artRes.ok) {
      setArticles(
        (artData.articles ?? [])
          .filter((a: { isActive?: boolean }) => a.isActive !== false)
          .map(
            (a: {
              id: string;
              title: string;
              slug: string;
              coverImageUrl?: string | null;
              journal?: { title: string; shortTitle: string };
            }) => ({
              id: a.id,
              title: a.title,
              slug: a.slug,
              coverImageUrl: a.coverImageUrl,
              journal: a.journal,
            }),
          ),
      );
    }
  }

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") void load();
  }, [user?.role]);

  if (user?.role !== "SUPER_ADMIN") {
    return <p className="text-sm text-[var(--muted)]">Super admin only.</p>;
  }

  function resetForm() {
    setForm(emptyForm);
    setLogoFile(null);
    setImageFile(null);
    setEditingId(null);
    setExistingLogoUrl(null);
    setExistingImageUrl(null);
    setError("");
  }

  function startEdit(item: Spotlight) {
    setEditingId(item.id);
    setExistingLogoUrl(item.logoUrl ?? null);
    setExistingImageUrl(item.imageUrl ?? null);
    setLogoFile(null);
    setImageFile(null);
    setError("");
    setSuccess("");
    setForm({
      title: item.title,
      summary: item.summary ?? "",
      articleId: item.articleId ?? "",
      externalHref: item.externalHref ?? "",
      ctaLabel: item.ctaLabel ?? "Read article",
      sortOrder: String(item.sortOrder ?? 0),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      let logoUrl: string | undefined;
      let logoPublicId: string | undefined;
      let imageUrl: string | undefined;
      let imagePublicId: string | undefined;

      if (logoFile) {
        const uploaded = await uploadImage(logoFile, "atlas/research-logos");
        logoUrl = uploaded.url;
        logoPublicId = uploaded.publicId;
      }
      if (imageFile) {
        const uploaded = await uploadImage(imageFile, "atlas/research-images");
        imageUrl = uploaded.url;
        imagePublicId = uploaded.publicId;
      }

      const payload: Record<string, unknown> = {
        title: form.title,
        summary: form.summary || null,
        articleId: form.articleId || null,
        externalHref: form.externalHref || null,
        ctaLabel: form.ctaLabel || null,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (logoUrl) {
        payload.logoUrl = logoUrl;
        payload.logoPublicId = logoPublicId;
      }
      if (imageUrl) {
        payload.imageUrl = imageUrl;
        payload.imagePublicId = imagePublicId;
      }

      if (
        !editingId &&
        !logoUrl &&
        !imageUrl &&
        !form.articleId
      ) {
        throw new Error("Add a logo, image, or pick a published article");
      }

      const res = await fetch("/api/admin/research-spotlights", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId ? { id: editingId, ...payload } : payload,
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");

      setSuccess(editingId ? "Spotlight updated." : "Spotlight added.");
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this research spotlight?")) return;
    const res = await fetch(`/api/admin/research-spotlights?id=${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not delete");
      return;
    }
    if (editingId === id) resetForm();
    await load();
  }

  async function toggle(item: Spotlight) {
    await fetch("/api/admin/research-spotlights", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
    });
    await load();
  }

  const selectedArticle = articles.find((a) => a.id === form.articleId);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
          Research areas CMS
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Homepage advert-style cards for scientific research areas and partner
          labs. Tie each card to a published article so the image and link stay
          in sync.
        </p>
        <div className="mt-6 space-y-4">
          {spotlights.length === 0 && (
            <p className="rounded-2xl border border-dashed border-[var(--line)] bg-white p-6 text-sm text-[var(--muted)]">
              No research spotlights yet. Add one with the form.
            </p>
          )}
          {spotlights.map((item) => {
            const preview =
              item.imageUrl ||
              item.article?.coverImageUrl ||
              item.logoUrl ||
              null;
            return (
              <article
                key={item.id}
                className={`overflow-hidden rounded-2xl border bg-white ${
                  editingId === item.id
                    ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft)]"
                    : "border-[var(--line)]"
                }`}
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt={item.title}
                    className="h-36 w-full object-cover"
                  />
                ) : null}
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-[var(--surface)] px-2 py-0.5">
                      Order {item.sortOrder}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        item.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.isActive ? "Active" : "Hidden"}
                    </span>
                    {item.article ? (
                      <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[var(--accent)]">
                        Linked article
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-start gap-3">
                    {item.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.logoUrl}
                        alt=""
                        className="h-10 w-10 rounded-lg border border-[var(--line)] object-contain p-1"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <h2 className="font-semibold text-[var(--ink)]">
                        {item.title}
                      </h2>
                      {item.summary ? (
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                          {item.summary}
                        </p>
                      ) : null}
                      {item.article ? (
                        <p className="mt-2 truncate text-xs text-[var(--accent)]">
                          → {item.article.title}
                        </p>
                      ) : item.externalHref ? (
                        <p className="mt-2 truncate text-xs text-[var(--accent)]">
                          → {item.externalHref}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                    <button
                      type="button"
                      className="text-[var(--accent)]"
                      onClick={() => startEdit(item)}
                    >
                      Edit
                    </button>
                    <button type="button" onClick={() => void toggle(item)}>
                      {item.isActive ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      className="text-rose-700"
                      onClick={() => void remove(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="h-fit space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5 lg:sticky lg:top-4"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">
            {editingId ? "Edit spotlight" : "Add spotlight"}
          </h2>
          {editingId ? (
            <button
              type="button"
              className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
              onClick={resetForm}
            >
              Cancel
            </button>
          ) : null}
        </div>

        <label className="field">
          <span>Research area / partner</span>
          <input
            required
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="e.g. Clinical oncology"
          />
        </label>
        <label className="field">
          <span>Short summary</span>
          <textarea
            rows={2}
            value={form.summary}
            onChange={(e) =>
              setForm((p) => ({ ...p, summary: e.target.value }))
            }
            placeholder="One line about this research theme"
          />
        </label>

        <label className="field">
          <span>Linked published article</span>
          <select
            value={form.articleId}
            onChange={(e) =>
              setForm((p) => ({ ...p, articleId: e.target.value }))
            }
          >
            <option value="">— Optional —</option>
            {articles.map((a) => (
              <option key={a.id} value={a.id}>
                {a.journal?.shortTitle ? `${a.journal.shortTitle}: ` : ""}
                {a.title}
              </option>
            ))}
          </select>
          {selectedArticle?.coverImageUrl ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Card image will use this article&apos;s cover unless you upload a
              custom image.
            </p>
          ) : null}
        </label>

        <label className="field">
          <span>
            Logo
            {editingId ? " (optional — leave blank to keep current)" : ""}
          </span>
          {editingId && existingLogoUrl ? (
            <div className="mb-2 flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-[var(--line)] bg-white p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={existingLogoUrl}
                alt="Current logo"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : null}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <label className="field">
          <span>
            Custom card image
            {editingId ? " (optional)" : " (optional if article has a cover)"}
          </span>
          {editingId && existingImageUrl ? (
            <div className="mb-2 overflow-hidden rounded-lg border border-[var(--line)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={existingImageUrl}
                alt="Current image"
                className="h-28 w-full object-cover"
              />
            </div>
          ) : null}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <label className="field">
          <span>External link (if no article)</span>
          <input
            value={form.externalHref}
            onChange={(e) =>
              setForm((p) => ({ ...p, externalHref: e.target.value }))
            }
            placeholder="https://…"
          />
        </label>
        <label className="field">
          <span>CTA label</span>
          <input
            value={form.ctaLabel}
            onChange={(e) =>
              setForm((p) => ({ ...p, ctaLabel: e.target.value }))
            }
            placeholder="Read article"
          />
        </label>
        <label className="field">
          <span>Sort order</span>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) =>
              setForm((p) => ({ ...p, sortOrder: e.target.value }))
            }
          />
        </label>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {success}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading
            ? editingId
              ? "Saving…"
              : "Uploading…"
            : editingId
              ? "Save changes"
              : "Add spotlight"}
        </button>
      </form>
    </div>
  );
}
