"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin-auth-provider";
import { uploadFileDirect } from "@/lib/client-upload";

type Slide = {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  imagePublicId?: string | null;
  alt?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  sortOrder: number;
  isActive: boolean;
};

const emptyForm = {
  title: "",
  body: "",
  alt: "",
  ctaLabel: "Submit a manuscript",
  ctaHref: "/submissions/new",
  sortOrder: "0",
};

async function uploadImage(file: File) {
  return uploadFileDirect(file, {
    folder: "atlas/hero",
    resourceType: "image",
  });
}

export default function HeroCmsPage() {
  const { user } = useAdminAuth();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/hero");
    const data = await res.json();
    if (res.ok) setSlides(data.slides);
  }

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") void load();
  }, [user?.role]);

  if (user?.role !== "SUPER_ADMIN") {
    return <p className="text-sm text-[var(--muted)]">Super admin only.</p>;
  }

  function resetForm() {
    setForm(emptyForm);
    setFile(null);
    setEditingId(null);
    setExistingImageUrl(null);
    setError("");
  }

  function startEdit(slide: Slide) {
    setEditingId(slide.id);
    setExistingImageUrl(slide.imageUrl);
    setFile(null);
    setError("");
    setSuccess("");
    setForm({
      title: slide.title,
      body: slide.body,
      alt: slide.alt ?? "",
      ctaLabel: slide.ctaLabel ?? "Submit a manuscript",
      ctaHref: slide.ctaHref ?? "/submissions/new",
      sortOrder: String(slide.sortOrder ?? 0),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingId && !file) {
      setError("Choose a hero image");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      let imageUrl: string | undefined;
      let imagePublicId: string | undefined;
      if (file) {
        const uploaded = await uploadImage(file);
        imageUrl = uploaded.url;
        imagePublicId = uploaded.publicId;
      }

      const payload: Record<string, unknown> = {
        title: form.title,
        body: form.body,
        alt: form.alt || undefined,
        ctaLabel: form.ctaLabel || undefined,
        ctaHref: form.ctaHref || undefined,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (imageUrl) {
        payload.imageUrl = imageUrl;
        payload.imagePublicId = imagePublicId;
      }

      const res = await fetch("/api/admin/hero", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId ? { id: editingId, ...payload } : payload,
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");

      setSuccess(editingId ? "Slide updated." : "Slide added.");
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this slide?")) return;
    const res = await fetch(`/api/admin/hero?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not delete slide");
      return;
    }
    if (editingId === id) resetForm();
    await load();
  }

  async function toggle(slide: Slide) {
    await fetch("/api/admin/hero", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: slide.id, isActive: !slide.isActive }),
    });
    await load();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
          Hero CMS
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Edit homepage carousel slides. Changes appear on the public site after
          save.
        </p>
        <div className="mt-6 space-y-4">
          {slides.length === 0 && (
            <p className="rounded-2xl border border-dashed border-[var(--line)] bg-white p-6 text-sm text-[var(--muted)]">
              No slides yet. Add one with the form.
            </p>
          )}
          {slides.map((slide) => (
            <article
              key={slide.id}
              className={`overflow-hidden rounded-2xl border bg-white ${
                editingId === slide.id
                  ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft)]"
                  : "border-[var(--line)]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.imageUrl}
                alt={slide.alt ?? slide.title}
                className="h-40 w-full object-cover"
              />
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-[var(--surface)] px-2 py-0.5">
                    Order {slide.sortOrder}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      slide.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {slide.isActive ? "Active" : "Hidden"}
                  </span>
                  {editingId === slide.id ? (
                    <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 font-semibold text-[var(--accent)]">
                      Editing
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-2 font-semibold text-[var(--ink)]">
                  {slide.title}
                </h2>
                <p className="mt-1 line-clamp-3 text-sm text-[var(--muted)]">
                  {slide.body}
                </p>
                {(slide.ctaLabel || slide.ctaHref) && (
                  <p className="mt-2 truncate text-xs text-[var(--accent)]">
                    CTA: {slide.ctaLabel || "—"} → {slide.ctaHref || "—"}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                  <button
                    type="button"
                    className="text-[var(--accent)]"
                    onClick={() => startEdit(slide)}
                  >
                    Edit
                  </button>
                  <button type="button" onClick={() => void toggle(slide)}>
                    {slide.isActive ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    className="text-rose-700"
                    onClick={() => void remove(slide.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="h-fit space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5 lg:sticky lg:top-4"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">
            {editingId ? "Edit slide" : "Add slide"}
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
          <span>Title</span>
          <input
            required
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
        </label>
        <label className="field">
          <span>Body</span>
          <textarea
            required
            rows={3}
            value={form.body}
            onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
          />
        </label>

        <label className="field">
          <span>
            Image{editingId ? " (optional — leave blank to keep current)" : ""}
          </span>
          {editingId && existingImageUrl ? (
            <div className="mb-2 overflow-hidden rounded-lg border border-[var(--line)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={existingImageUrl}
                alt="Current slide"
                className="h-28 w-full object-cover"
              />
            </div>
          ) : null}
          <input
            type="file"
            accept="image/*"
            required={!editingId}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <label className="field">
          <span>Alt text</span>
          <input
            value={form.alt}
            onChange={(e) => setForm((p) => ({ ...p, alt: e.target.value }))}
          />
        </label>
        <label className="field">
          <span>CTA label</span>
          <input
            value={form.ctaLabel}
            onChange={(e) =>
              setForm((p) => ({ ...p, ctaLabel: e.target.value }))
            }
            placeholder="Submit a manuscript"
          />
        </label>
        <label className="field">
          <span>CTA link</span>
          <input
            value={form.ctaHref}
            onChange={(e) =>
              setForm((p) => ({ ...p, ctaHref: e.target.value }))
            }
            placeholder="/submissions/new"
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
              : "Add slide"}
        </button>
      </form>
    </div>
  );
}
