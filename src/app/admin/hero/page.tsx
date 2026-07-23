"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin-auth-provider";

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

async function uploadImage(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", "atlas/hero");
  fd.append("resourceType", "image");
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  return data as { url: string; publicId: string };
}

export default function HeroCmsPage() {
  const { user } = useAdminAuth();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [form, setForm] = useState({
    title: "",
    body: "",
    alt: "",
    ctaLabel: "Submit a manuscript",
    ctaHref: "/submissions/new",
    sortOrder: "0",
  });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a hero image");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const uploaded = await uploadImage(file);
      const res = await fetch("/api/admin/hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          sortOrder: Number(form.sortOrder) || 0,
          imageUrl: uploaded.url,
          imagePublicId: uploaded.publicId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setForm({
        title: "",
        body: "",
        alt: "",
        ctaLabel: "Submit a manuscript",
        ctaHref: "/submissions/new",
        sortOrder: "0",
      });
      setFile(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this slide?")) return;
    await fetch(`/api/admin/hero?id=${id}`, { method: "DELETE" });
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
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Hero CMS
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Homepage hero slides. Images upload to Cloudinary.
        </p>
        <div className="mt-6 space-y-4">
          {slides.map((slide) => (
            <article
              key={slide.id}
              className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white"
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
                </div>
                <h2 className="mt-2 font-semibold">{slide.title}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{slide.body}</p>
                <div className="mt-3 flex gap-3 text-xs font-semibold">
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
        className="h-fit space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5"
      >
        <h2 className="text-sm font-semibold">Add slide</h2>
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
          <span>Image</span>
          <input
            type="file"
            accept="image/*"
            required
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
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Uploading…" : "Add slide"}
        </button>
      </form>
    </div>
  );
}
