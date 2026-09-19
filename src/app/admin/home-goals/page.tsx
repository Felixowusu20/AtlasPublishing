"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin-auth-provider";
import { uploadFileDirect } from "@/lib/client-upload";
import type { GoalTabLink } from "@/lib/home-cms-defaults";

type Tab = {
  id: string;
  key: string;
  label: string;
  title: string;
  body: string;
  story?: string | null;
  imageUrl: string;
  imagePublicId?: string | null;
  imageAlt?: string | null;
  imageCaption?: string | null;
  links: GoalTabLink[] | unknown;
  sortOrder: number;
  isActive: boolean;
};

type Section = {
  eyebrow?: string | null;
  title: string;
  body?: string | null;
};

const emptyForm = {
  key: "",
  label: "",
  title: "",
  body: "",
  story: "",
  imageAlt: "",
  imageCaption: "",
  sortOrder: "0",
  link1Label: "",
  link1Href: "",
  link2Label: "",
  link2Href: "",
  link3Label: "",
  link3Href: "",
};

function linksFromForm(form: typeof emptyForm): GoalTabLink[] {
  return [
    { label: form.link1Label, href: form.link1Href },
    { label: form.link2Label, href: form.link2Href },
    { label: form.link3Label, href: form.link3Href },
  ].filter((l) => l.label.trim() && l.href.trim());
}

function normalizeLinks(value: unknown): GoalTabLink[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is GoalTabLink =>
      !!item &&
      typeof item === "object" &&
      typeof (item as GoalTabLink).label === "string" &&
      typeof (item as GoalTabLink).href === "string",
  );
}

export default function HomeGoalsCmsPage() {
  const { user } = useAdminAuth();
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [section, setSection] = useState<Section>({
    eyebrow: "Get started",
    title: "Find the right resources for your goals",
    body: "",
  });
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [sectionSaving, setSectionSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/home-goals");
    const data = await res.json();
    if (res.ok) {
      setTabs(data.tabs ?? []);
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
    setExistingImageUrl(null);
    setError("");
  }

  function startEdit(tab: Tab) {
    const links = normalizeLinks(tab.links);
    setEditingId(tab.id);
    setExistingImageUrl(tab.imageUrl);
    setFile(null);
    setError("");
    setSuccess("");
    setForm({
      key: tab.key,
      label: tab.label,
      title: tab.title,
      body: tab.body,
      story: tab.story ?? "",
      imageAlt: tab.imageAlt ?? "",
      imageCaption: tab.imageCaption ?? "",
      sortOrder: String(tab.sortOrder ?? 0),
      link1Label: links[0]?.label ?? "",
      link1Href: links[0]?.href ?? "",
      link2Label: links[1]?.label ?? "",
      link2Href: links[1]?.href ?? "",
      link3Label: links[2]?.label ?? "",
      link3Href: links[2]?.href ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveSection(e: FormEvent) {
    e.preventDefault();
    setSectionSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/home-goals", {
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
    if (!editingId && !file) {
      setError("Choose a tab image");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      let imageUrl: string | undefined;
      let imagePublicId: string | undefined;
      if (file) {
        const uploaded = await uploadFileDirect(file, {
          folder: "atlas/home-goals",
          resourceType: "image",
        });
        imageUrl = uploaded.url;
        imagePublicId = uploaded.publicId;
      }

      const payload: Record<string, unknown> = {
        key: form.key.trim().toLowerCase(),
        label: form.label,
        title: form.title,
        body: form.body,
        story: form.story || null,
        imageAlt: form.imageAlt || null,
        imageCaption: form.imageCaption || null,
        links: linksFromForm(form),
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (imageUrl) {
        payload.imageUrl = imageUrl;
        payload.imagePublicId = imagePublicId;
      }

      const res = await fetch("/api/admin/home-goals", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId ? { id: editingId, ...payload } : payload,
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSuccess(editingId ? "Tab updated." : "Tab added.");
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this tab?")) return;
    const res = await fetch(`/api/admin/home-goals?id=${id}`, {
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

  async function toggle(tab: Tab) {
    await fetch("/api/admin/home-goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tab.id, isActive: !tab.isActive }),
    });
    await load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
          Get started CMS
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Edit homepage goal tabs — labels, stories, images, and links.
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
          <span>Intro body</span>
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
          {tabs.map((tab) => (
            <article
              key={tab.id}
              className={`overflow-hidden rounded-2xl border bg-white ${
                editingId === tab.id
                  ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft)]"
                  : "border-[var(--line)]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tab.imageUrl}
                alt={tab.imageAlt ?? tab.label}
                className="h-36 w-full object-cover"
              />
              <div className="p-4">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-[var(--surface)] px-2 py-0.5">
                    {tab.key}
                  </span>
                  <span className="rounded-full bg-[var(--surface)] px-2 py-0.5">
                    Order {tab.sortOrder}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      tab.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.isActive ? "Active" : "Hidden"}
                  </span>
                </div>
                <h2 className="mt-2 font-semibold text-[var(--ink)]">
                  {tab.label}
                </h2>
                <p className="mt-1 text-xs text-[var(--accent)]">
                  {tab.story}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                  {tab.title}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                  <button
                    type="button"
                    className="text-[var(--accent)]"
                    onClick={() => startEdit(tab)}
                  >
                    Edit
                  </button>
                  <button type="button" onClick={() => void toggle(tab)}>
                    {tab.isActive ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    className="text-rose-700"
                    onClick={() => void remove(tab.id)}
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
              {editingId ? "Edit tab" : "Add tab"}
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
            <span>Key (unique, e.g. publish)</span>
            <input
              required
              disabled={!!editingId}
              value={form.key}
              onChange={(e) =>
                setForm((p) => ({ ...p, key: e.target.value.toLowerCase() }))
              }
            />
          </label>
          <label className="field">
            <span>Tab label</span>
            <input
              required
              value={form.label}
              onChange={(e) =>
                setForm((p) => ({ ...p, label: e.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Story line</span>
            <input
              value={form.story}
              onChange={(e) =>
                setForm((p) => ({ ...p, story: e.target.value }))
              }
              placeholder="Experiment → peer-reviewed paper"
            />
          </label>
          <label className="field">
            <span>Title</span>
            <input
              required
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
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
              Image
              {editingId ? " (optional — leave blank to keep current)" : ""}
            </span>
            {editingId && existingImageUrl ? (
              <div className="mb-2 overflow-hidden rounded-lg border border-[var(--line)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={existingImageUrl}
                  alt=""
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
            <span>Image alt</span>
            <input
              value={form.imageAlt}
              onChange={(e) =>
                setForm((p) => ({ ...p, imageAlt: e.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Image caption</span>
            <textarea
              rows={2}
              value={form.imageCaption}
              onChange={(e) =>
                setForm((p) => ({ ...p, imageCaption: e.target.value }))
              }
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

          <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Links (up to 3)
          </p>
          {[1, 2, 3].map((n) => (
            <div key={n} className="grid grid-cols-2 gap-2">
              <label className="field">
                <span>Link {n} label</span>
                <input
                  value={form[`link${n}Label` as keyof typeof form] as string}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      [`link${n}Label`]: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Link {n} href</span>
                <input
                  value={form[`link${n}Href` as keyof typeof form] as string}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      [`link${n}Href`]: e.target.value,
                    }))
                  }
                />
              </label>
            </div>
          ))}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Saving…" : editingId ? "Update tab" : "Add tab"}
          </button>
        </form>
      </div>
    </div>
  );
}
