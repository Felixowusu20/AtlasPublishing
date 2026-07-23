"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin-auth-provider";

type Announcement = {
  id: string;
  title: string;
  summary: string;
  href?: string | null;
  publishedAt: string;
  isActive: boolean;
};

export default function AnnouncementsCmsPage() {
  const { user } = useAdminAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [form, setForm] = useState({ title: "", summary: "", href: "" });
  const [error, setError] = useState("");
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setForm({ title: "", summary: "", href: "" });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete announcement?")) return;
    await fetch(`/api/admin/announcements?id=${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Announcements CMS
        </h1>
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-[var(--line)] bg-white p-4"
            >
              <h2 className="font-semibold">{item.title}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{item.summary}</p>
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-rose-700"
                onClick={() => void remove(item.id)}
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
        <h2 className="text-sm font-semibold">New announcement</h2>
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
          />
        </label>
        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Saving…" : "Publish"}
        </button>
      </form>
    </div>
  );
}
