"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin-auth-provider";
import { uploadFileDirect } from "@/lib/client-upload";

type Platform = {
  id: string;
  name: string;
  blurb: string;
  href: string;
  logoUrl: string;
  logoPublicId?: string | null;
  sortOrder: number;
  isActive: boolean;
};

type Section = {
  eyebrow?: string | null;
  title: string;
  body?: string | null;
};

const emptyForm = {
  name: "",
  blurb: "",
  href: "",
  logoUrl: "",
  sortOrder: "0",
};

export default function IndexedPlatformsCmsPage() {
  const { user } = useAdminAuth();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [section, setSection] = useState<Section>({
    eyebrow: "Indexed & discoverable",
    title: "Our publications appear on leading scholarly platforms",
    body: "",
  });
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [sectionSaving, setSectionSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/indexed-platforms");
    const data = await res.json();
    if (res.ok) {
      setPlatforms(data.platforms ?? []);
      if (data.section) {
        setSection({
          eyebrow: data.section.eyebrow ?? "",
          title: data.section.title ?? "",
          body: data.section.body ?? "",
        });
      }
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
    setFile(null);
    setEditingId(null);
    setExistingLogoUrl(null);
    setError("");
  }

  function startEdit(platform: Platform) {
    setEditingId(platform.id);
    setExistingLogoUrl(platform.logoUrl);
    setFile(null);
    setError("");
    setSuccess("");
    setForm({
      name: platform.name,
      blurb: platform.blurb,
      href: platform.href,
      logoUrl: platform.logoUrl,
      sortOrder: String(platform.sortOrder ?? 0),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveSection(e: FormEvent) {
    e.preventDefault();
    setSectionSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/indexed-platforms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: true,
          eyebrow: section.eyebrow || null,
          title: section.title,
          body: section.body || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSuccess("Section heading saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSectionSaving(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      let logoUrl = form.logoUrl.trim() || undefined;
      let logoPublicId: string | undefined;
      if (file) {
        const uploaded = await uploadFileDirect(file, {
          folder: "atlas/indexed-platforms",
          resourceType: "image",
        });
        logoUrl = uploaded.url;
        logoPublicId = uploaded.publicId;
      }
      if (!editingId && !logoUrl) {
        throw new Error("Upload a logo or paste a logo URL / path");
      }

      const payload: Record<string, unknown> = {
        name: form.name,
        blurb: form.blurb,
        href: form.href,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (logoUrl) {
        payload.logoUrl = logoUrl;
        if (logoPublicId) payload.logoPublicId = logoPublicId;
      }

      const res = await fetch("/api/admin/indexed-platforms", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId ? { id: editingId, ...payload } : payload,
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSuccess(editingId ? "Platform updated." : "Platform added.");
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this platform?")) return;
    const res = await fetch(`/api/admin/indexed-platforms?id=${id}`, {
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

  async function toggle(platform: Platform) {
    await fetch("/api/admin/indexed-platforms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: platform.id, isActive: !platform.isActive }),
    });
    await load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
          Indexed platforms CMS
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Manage the “Indexed & discoverable” logos and copy — swap platforms as
          indexing partners change.
        </p>
      </div>

      {(error || success) && (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${
            error
              ? "bg-rose-50 text-rose-800"
              : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {error || success}
        </p>
      )}

      <form
        onSubmit={saveSection}
        className="grid gap-3 rounded-2xl border border-[var(--line)] bg-white p-5 sm:grid-cols-2"
      >
        <h2 className="text-sm font-semibold sm:col-span-2">Section heading</h2>
        <label className="field">
          <span>Eyebrow</span>
          <input
            value={section.eyebrow ?? ""}
            onChange={(e) =>
              setSection((p) => ({ ...p, eyebrow: e.target.value }))
            }
          />
        </label>
        <label className="field">
          <span>Title</span>
          <input
            required
            value={section.title}
            onChange={(e) =>
              setSection((p) => ({ ...p, title: e.target.value }))
            }
          />
        </label>
        <label className="field sm:col-span-2">
          <span>Intro body (optional)</span>
          <textarea
            rows={2}
            value={section.body ?? ""}
            onChange={(e) =>
              setSection((p) => ({ ...p, body: e.target.value }))
            }
          />
        </label>
        <button
          type="submit"
          disabled={sectionSaving}
          className="btn-primary sm:col-span-2 sm:w-fit"
        >
          {sectionSaving ? "Saving…" : "Save section heading"}
        </button>
      </form>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
        <div className="space-y-4">
          {platforms.map((platform) => (
            <article
              key={platform.id}
              className={`flex gap-4 overflow-hidden rounded-2xl border bg-white p-4 ${
                editingId === platform.id
                  ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft)]"
                  : "border-[var(--line)]"
              }`}
            >
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] p-2 ring-1 ring-[var(--line)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={platform.logoUrl}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-[var(--surface)] px-2 py-0.5">
                    Order {platform.sortOrder}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      platform.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {platform.isActive ? "Active" : "Hidden"}
                  </span>
                </div>
                <h2 className="mt-1 font-semibold text-[var(--ink)]">
                  {platform.name}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                  {platform.blurb}
                </p>
                <p className="mt-1 truncate text-xs text-[var(--accent)]">
                  {platform.href}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                  <button
                    type="button"
                    className="text-[var(--accent)]"
                    onClick={() => startEdit(platform)}
                  >
                    Edit
                  </button>
                  <button type="button" onClick={() => void toggle(platform)}>
                    {platform.isActive ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    className="text-rose-700"
                    onClick={() => void remove(platform.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <form
          onSubmit={onSubmit}
          className="h-fit space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5 lg:sticky lg:top-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              {editingId ? "Edit platform" : "Add platform"}
            </h2>
            {editingId ? (
              <button
                type="button"
                className="text-xs font-semibold text-[var(--muted)]"
                onClick={resetForm}
              >
                Cancel
              </button>
            ) : null}
          </div>

          <label className="field">
            <span>Name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Blurb</span>
            <textarea
              required
              rows={3}
              value={form.blurb}
              onChange={(e) =>
                setForm((p) => ({ ...p, blurb: e.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Link URL</span>
            <input
              required
              type="url"
              value={form.href}
              onChange={(e) => setForm((p) => ({ ...p, href: e.target.value }))}
            />
          </label>
          <label className="field">
            <span>Logo file (upload)</span>
            {editingId && existingLogoUrl ? (
              <div className="mb-2 flex h-20 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={existingLogoUrl}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : null}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="field">
            <span>Or logo URL / path</span>
            <input
              value={form.logoUrl}
              onChange={(e) =>
                setForm((p) => ({ ...p, logoUrl: e.target.value }))
              }
              placeholder="/brand/google-scholar-clean.png"
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

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading
              ? "Saving…"
              : editingId
                ? "Update platform"
                : "Add platform"}
          </button>
        </form>
      </div>
    </div>
  );
}
