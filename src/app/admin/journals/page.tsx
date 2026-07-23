"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin-auth-provider";
import {
  JOURNAL_COVER_COLORS,
  journalCardColor,
  nextJournalCoverColor,
} from "@/lib/journal-colors";

type Journal = {
  id: string;
  title: string;
  shortTitle: string;
  slug: string;
  description: string;
  subjects: string[];
  coverColor: string;
  isActive: boolean;
};

export default function JournalsCmsPage() {
  const { user } = useAdminAuth();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [form, setForm] = useState<{
    title: string;
    shortTitle: string;
    description: string;
    subjects: string;
    editorInChief: string;
    frequency: string;
    reviewType: string;
    apc: string;
    coverColor: string;
  }>({
    title: "",
    shortTitle: "",
    description: "",
    subjects: "",
    editorInChief: "",
    frequency: "Quarterly",
    reviewType: "DOUBLE_BLIND",
    apc: "",
    coverColor: JOURNAL_COVER_COLORS[0],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/journals");
    const data = await res.json();
    if (res.ok) {
      const list = (data.journals ?? []) as Journal[];
      setJournals(list);
      setForm((prev) => ({
        ...prev,
        coverColor: nextJournalCoverColor(list.map((j) => j.coverColor)),
      }));
    }
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
    const res = await fetch("/api/admin/journals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        subjects: form.subjects
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
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
      shortTitle: "",
      description: "",
      subjects: "",
      editorInChief: "",
      frequency: "Quarterly",
      reviewType: "DOUBLE_BLIND",
      apc: "",
      coverColor: nextJournalCoverColor([
        ...journals.map((j) => j.coverColor),
        form.coverColor,
      ]),
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this journal category?")) return;
    await fetch(`/api/admin/journals?id=${id}`, { method: "DELETE" });
    await load();
  }

  async function updateColor(id: string, coverColor: string) {
    await fetch("/api/admin/journals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, coverColor }),
    });
    await load();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Our journals
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Each journal gets its own card color. Pick one when adding, or change
          it below.
        </p>
        <div className="mt-6 space-y-3">
          {journals.map((j, index) => {
            const color = journalCardColor(j.coverColor, index);
            return (
              <article
                key={j.id}
                className="rounded-xl border border-[var(--line)] bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-16 w-11 shrink-0 flex-col justify-between rounded-lg text-white"
                    style={{ background: color }}
                  >
                    <span className="px-1 pt-1.5 text-[8px] font-semibold uppercase text-white/80">
                      {j.shortTitle}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold">{j.title}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {j.description}
                    </p>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {j.subjects.join(" · ")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {JOURNAL_COVER_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          title={c}
                          aria-label={`Set color ${c}`}
                          onClick={() => void updateColor(j.id, c)}
                          className={`h-5 w-5 rounded-full border-2 ${
                            j.coverColor.toLowerCase() === c.toLowerCase()
                              ? "border-[var(--ink)]"
                              : "border-transparent"
                          }`}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-rose-700"
                    onClick={() => void remove(j.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="h-fit space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5"
      >
        <h2 className="text-sm font-semibold">Add journal</h2>
        <label className="field">
          <span>Title</span>
          <input
            required
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
        </label>
        <label className="field">
          <span>Short title</span>
          <input
            required
            value={form.shortTitle}
            onChange={(e) =>
              setForm((p) => ({ ...p, shortTitle: e.target.value }))
            }
          />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea
            required
            rows={3}
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
          />
        </label>
        <label className="field">
          <span>Subjects (comma-separated)</span>
          <input
            value={form.subjects}
            onChange={(e) =>
              setForm((p) => ({ ...p, subjects: e.target.value }))
            }
          />
        </label>
        <label className="field">
          <span>Editor-in-chief</span>
          <input
            value={form.editorInChief}
            onChange={(e) =>
              setForm((p) => ({ ...p, editorInChief: e.target.value }))
            }
          />
        </label>
        <label className="field">
          <span>Review type</span>
          <select
            value={form.reviewType}
            onChange={(e) =>
              setForm((p) => ({ ...p, reviewType: e.target.value }))
            }
          >
            <option value="DOUBLE_BLIND">Double blind</option>
            <option value="SINGLE_BLIND">Single blind</option>
            <option value="OPEN_REVIEW">Open review</option>
          </select>
        </label>
        <div>
          <p className="text-sm font-medium text-[var(--ink)]">Card color</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {JOURNAL_COVER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((p) => ({ ...p, coverColor: c }))}
                className={`h-7 w-7 rounded-full border-2 ${
                  form.coverColor === c
                    ? "border-[var(--ink)] ring-2 ring-[var(--accent)]/30"
                    : "border-white shadow"
                }`}
                style={{ background: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <div
            className="mt-3 flex h-14 w-10 items-end justify-center rounded-md pb-1 text-[9px] font-bold text-white"
            style={{ background: form.coverColor }}
          >
            {form.shortTitle.slice(0, 4) || "PRE"}
          </div>
        </div>
        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Saving…" : "Add journal"}
        </button>
      </form>
    </div>
  );
}
