"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin-auth-provider";
import { uploadFileDirect } from "@/lib/client-upload";

type Announcement = {
  id: string;
  title: string;
  summary: string;
  href?: string | null;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  publishedAt: string;
  isActive: boolean;
};

const emptyForm = {
  title: "",
  summary: "",
  href: "",
};

async function uploadImage(file: File) {
  return uploadFileDirect(file, {
    folder: "atlas/announcements",
    resourceType: "image",
  });
}

export default function AnnouncementsCmsPage() {
  const { user } = useAdminAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/announcements");
    const data = await res.json();
    if (res.ok) setItems(data.announcements);
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

  function startEdit(item: Announcement) {
    setEditingId(item.id);
    setExistingImageUrl(item.imageUrl ?? null);
    setFile(null);
    setError("");
    setSuccess("");
    setForm({
      title: item.title,
      summary: item.summary,
      href: item.href ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingId && !file) {
      setError("Choose a hero image for the announcement");
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
        summary: form.summary,
        href: form.href.trim() || null,
      };
      if (imageUrl) {
        payload.imageUrl = imageUrl;
        payload.imagePublicId = imagePublicId;
      }

      const res = await fetch("/api/admin/announcements", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId ? { id: editingId, ...payload } : payload,
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");

      setSuccess(editingId ? "Announcement updated." : "Announcement published.");
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete announcement?")) return;
    const res = await fetch(`/api/admin/announcements?id=${id}`, {
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

  async function toggle(item: Announcement) {
    await fetch("/api/admin/announcements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
    });
    await load();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
          Announcements CMS
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Homepage news cards with a hero image header. Edit any post to update
          the image, title, summary, or link.
        </p>
        <div className="mt-6 space-y-4">
          {items.length === 0 && (
            <p className="rounded-2xl border border-dashed border-[var(--line)] bg-white p-6 text-sm text-[var(--muted)]">
              No announcements yet. Add one with the form.
            </p>
          )}
          {items.map((item) => (
            <article
              key={item.id}
              className={`overflow-hidden rounded-2xl border bg-white ${
                editingId === item.id
                  ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft)]"
                  : "border-[var(--line)]"
              }`}
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt=""
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="flex h-24 items-center justify-center bg-[var(--surface)] text-xs text-[var(--muted)]">
                  No hero image
                </div>
              )}
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-[var(--surface)] px-2 py-0.5">
                    {new Date(item.publishedAt).toLocaleDateString()}
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
                  {editingId === item.id ? (
                    <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 font-semibold text-[var(--accent)]">
                      Editing
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-2 font-semibold text-[var(--ink)]">
                  {item.title}
                </h2>
                <p className="mt-1 line-clamp-3 text-sm text-[var(--muted)]">
                  {item.summary}
                </p>
                {item.href ? (
                  <p className="mt-2 truncate text-xs text-[var(--accent)]">
                    Link → {item.href}
                  </p>
                ) : null}
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
          ))}
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="h-fit space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5 lg:sticky lg:top-4"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">
            {editingId ? "Edit announcement" : "New announcement"}
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
          <span>
            Hero image
            {editingId ? " (optional — leave blank to keep current)" : ""}
          </span>
          {editingId && existingImageUrl ? (
            <div className="mb-2 overflow-hidden rounded-lg border border-[var(--line)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={existingImageUrl}
                alt="Current hero"
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
          <span>Title</span>
          <input
            required
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
        </label>
        <label className="field">
          <span>Summary</span>
          <textarea
            required
            rows={4}
            value={form.summary}
            onChange={(e) =>
              setForm((p) => ({ ...p, summary: e.target.value }))
            }
          />
        </label>
        <label className="field">
          <span>Link (optional)</span>
          <input
            value={form.href}
            onChange={(e) => setForm((p) => ({ ...p, href: e.target.value }))}
            placeholder="/journals/…"
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
              : "Publishing…"
            : editingId
              ? "Save changes"
              : "Publish"}
        </button>
      </form>
    </div>
  );
}
