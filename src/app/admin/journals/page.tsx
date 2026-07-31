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
  editorInChief?: string | null;
  frequency?: string | null;
  reviewType?: string | null;
  apc?: string | null;
  coverColor: string;
  coverImageUrl?: string | null;
  coverImagePublicId?: string | null;
  isActive: boolean;
};

type FormState = {
  title: string;
  shortTitle: string;
  description: string;
  subjects: string;
  editorInChief: string;
  frequency: string;
  reviewType: string;
  apc: string;
  coverColor: string;
  coverImageUrl: string;
  coverImagePublicId: string;
};

function emptyForm(coverColor: string = JOURNAL_COVER_COLORS[0]): FormState {
  return {
    title: "",
    shortTitle: "",
    description: "",
    subjects: "",
    editorInChief: "",
    frequency: "Quarterly",
    reviewType: "DOUBLE_BLIND",
    apc: "",
    coverColor,
    coverImageUrl: "",
    coverImagePublicId: "",
  };
}

function formFromJournal(j: Journal): FormState {
  return {
    title: j.title,
    shortTitle: j.shortTitle,
    description: j.description,
    subjects: (j.subjects ?? []).join(", "),
    editorInChief: j.editorInChief ?? "",
    frequency: j.frequency ?? "Quarterly",
    reviewType: j.reviewType ?? "DOUBLE_BLIND",
    apc: j.apc ?? "",
    coverColor: j.coverColor || JOURNAL_COVER_COLORS[0],
    coverImageUrl: j.coverImageUrl ?? "",
    coverImagePublicId: j.coverImagePublicId ?? "",
  };
}

async function uploadJournalLogo(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", "nahda/journal-logos");
  fd.append("resourceType", "image");
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Logo upload failed");
  return data as { url: string; publicId: string };
}

export default function JournalsCmsPage() {
  const { user } = useAdminAuth();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function load(keepEditingId?: string | null) {
    const res = await fetch("/api/admin/journals");
    const data = await res.json();
    if (!res.ok) return;
    const list = (data.journals ?? []) as Journal[];
    setJournals(list);

    if (keepEditingId) {
      const current = list.find((j) => j.id === keepEditingId);
      if (current) {
        setForm(formFromJournal(current));
        setEditingId(current.id);
        return;
      }
    }

    if (!keepEditingId) {
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

  function startCreate() {
    setEditingId(null);
    setError("");
    setSuccess("");
    setForm(
      emptyForm(nextJournalCoverColor(journals.map((j) => j.coverColor))),
    );
  }

  function startEdit(j: Journal) {
    setEditingId(j.id);
    setError("");
    setSuccess("");
    setForm(formFromJournal(j));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const payload = {
      title: form.title,
      shortTitle: form.shortTitle,
      description: form.description,
      editorInChief: form.editorInChief || undefined,
      frequency: form.frequency,
      reviewType: form.reviewType,
      apc: form.apc || undefined,
      coverColor: form.coverColor,
      coverImageUrl: form.coverImageUrl || null,
      coverImagePublicId: form.coverImagePublicId || null,
      subjects: form.subjects
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    const res = await fetch("/api/admin/journals", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editingId ? { id: editingId, ...payload } : payload,
      ),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save journal");
      return;
    }

    const savedId = (data.journal?.id as string | undefined) ?? editingId;
    setSuccess(editingId ? "Journal updated." : "Journal created.");
    if (editingId) {
      await load(savedId);
    } else {
      setEditingId(null);
      setForm(
        emptyForm(
          nextJournalCoverColor([
            ...journals.map((j) => j.coverColor),
            form.coverColor,
          ]),
        ),
      );
      await load();
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this journal?")) return;
    setError("");
    setSuccess("");
    await fetch(`/api/admin/journals?id=${id}`, { method: "DELETE" });
    if (editingId === id) startCreate();
    await load();
  }

  async function onFormLogo(file: File | null) {
    if (!file) return;
    setUploadingLogo(true);
    setError("");
    try {
      const uploaded = await uploadJournalLogo(file);
      setForm((p) => ({
        ...p,
        coverImageUrl: uploaded.url,
        coverImagePublicId: uploaded.publicId,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
      <div className="min-h-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl">
              Our journals
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Click a journal to edit it. Logos are used on published articles.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary !px-3 !py-2 text-xs"
            onClick={startCreate}
          >
            New journal
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {success}
          </p>
        )}

        <div className="mt-6 max-h-[min(70vh,720px)] space-y-3 overflow-y-auto pr-1">
          {journals.length === 0 && (
            <p className="rounded-xl border border-[var(--line)] bg-white p-6 text-sm text-[var(--muted)]">
              No journals yet. Add one on the right.
            </p>
          )}
          {journals.map((j, index) => {
            const color = journalCardColor(j.coverColor, index);
            const active = editingId === j.id;
            return (
              <article
                key={j.id}
                role="button"
                tabIndex={0}
                onClick={() => startEdit(j)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    startEdit(j);
                  }
                }}
                className={`cursor-pointer rounded-xl border bg-white p-4 text-left transition ${
                  active
                    ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/20"
                    : "border-[var(--line)] hover:border-[var(--accent)]/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]">
                    {j.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={j.coverImageUrl}
                        alt=""
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-end justify-center pb-1 text-[9px] font-bold text-white"
                        style={{ background: color }}
                      >
                        {j.shortTitle}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{j.title}</h2>
                      {active && (
                        <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                          Editing
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {j.shortTitle} · {j.slug}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                      {j.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-rose-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      void remove(j.id);
                    }}
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
        className="h-fit max-h-[min(80vh,820px)] space-y-3 overflow-y-auto rounded-2xl border border-[var(--line)] bg-white p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">
            {editingId ? "Edit journal" : "Add journal"}
          </h2>
          {editingId && (
            <button
              type="button"
              className="text-xs font-semibold text-[var(--accent)] underline"
              onClick={startCreate}
            >
              Cancel edit
            </button>
          )}
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
          <span>Frequency</span>
          <input
            value={form.frequency}
            onChange={(e) =>
              setForm((p) => ({ ...p, frequency: e.target.value }))
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
        <label className="field">
          <span>APC</span>
          <input
            value={form.apc}
            placeholder="$1,200"
            onChange={(e) => setForm((p) => ({ ...p, apc: e.target.value }))}
          />
        </label>

        <div>
          <p className="text-sm font-medium text-[var(--ink)]">Journal logo</p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            PNG or SVG. Used on published articles for this journal.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]">
              {form.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.coverImageUrl}
                  alt=""
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <span className="text-[10px] font-semibold text-[var(--muted)]">
                  No logo
                </span>
              )}
            </div>
            <label className="btn-secondary cursor-pointer !px-3 !py-2 text-xs">
              {uploadingLogo ? "Uploading…" : "Upload logo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                disabled={uploadingLogo}
                onChange={(e) => void onFormLogo(e.target.files?.[0] ?? null)}
              />
            </label>
            {form.coverImageUrl && (
              <button
                type="button"
                className="text-xs font-semibold text-[var(--muted)] underline"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    coverImageUrl: "",
                    coverImagePublicId: "",
                  }))
                }
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading
            ? "Saving…"
            : editingId
              ? "Save changes"
              : "Add journal"}
        </button>
      </form>
    </div>
  );
}
