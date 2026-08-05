"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin-auth-provider";
import { NahdaLoader } from "@/components/nahda-loader";
import { uploadFileDirect } from "@/lib/client-upload";

type PageSlug = "about" | "terms" | "privacy";

type PageImage = {
  id: string;
  imageUrl: string;
  imagePublicId?: string | null;
  caption?: string | null;
  alt?: string | null;
  sortOrder: number;
};

type CmsPage = {
  id: string;
  slug: PageSlug;
  title: string;
  subtitle?: string | null;
  body: string;
  heroImageUrl?: string | null;
  heroImagePublicId?: string | null;
  isActive: boolean;
  images: PageImage[];
};

type Faq = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
};

const PAGE_LABELS: Record<PageSlug, string> = {
  about: "About",
  terms: "Terms & Conditions",
  privacy: "Privacy Policy",
};

type Tab = "pages" | "faqs";

export default function CmsAdminPage() {
  const { user } = useAdminAuth();
  const [tab, setTab] = useState<Tab>("pages");
  const [slug, setSlug] = useState<PageSlug>("about");
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [draft, setDraft] = useState({
    title: "",
    subtitle: "",
    body: "",
    isActive: true,
  });
  const [faqForm, setFaqForm] = useState({ question: "", answer: "" });
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const current = pages.find((p) => p.slug === slug);

  async function loadPages() {
    const res = await fetch("/api/admin/cms/pages");
    const data = await res.json();
    if (res.ok) setPages(data.pages ?? []);
  }

  async function loadFaqs() {
    const res = await fetch("/api/admin/cms/faqs");
    const data = await res.json();
    if (res.ok) setFaqs(data.faqs ?? []);
  }

  useEffect(() => {
    if (user?.role !== "SUPER_ADMIN") return;
    void loadPages();
    void loadFaqs();
  }, [user?.role]);

  useEffect(() => {
    if (!current) return;
    setDraft({
      title: current.title,
      subtitle: current.subtitle ?? "",
      body: current.body,
      isActive: current.isActive,
    });
  }, [current]);

  if (user?.role !== "SUPER_ADMIN") {
    return <p className="text-sm text-[var(--muted)]">Super admin only.</p>;
  }

  async function savePage(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const res = await fetch("/api/admin/cms/pages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        title: draft.title,
        subtitle: draft.subtitle || null,
        body: draft.body,
        isActive: draft.isActive,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save");
      return;
    }
    setSuccess(`${PAGE_LABELS[slug]} saved.`);
    await loadPages();
  }

  async function uploadHero(file: File) {
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadFileDirect(file, {
        folder: "atlas/cms",
        resourceType: "image",
      });
      const res = await fetch("/api/admin/cms/pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          heroImageUrl: uploaded.url,
          heroImagePublicId: uploaded.publicId ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save hero");
      await loadPages();
      setSuccess("Hero image updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function clearHero() {
    const res = await fetch("/api/admin/cms/pages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        heroImageUrl: null,
        heroImagePublicId: null,
      }),
    });
    if (res.ok) {
      await loadPages();
      setSuccess("Hero image cleared — public page will use a placeholder.");
    }
  }

  async function uploadGallery(file: File) {
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadFileDirect(file, {
        folder: "atlas/cms",
        resourceType: "image",
      });
      const res = await fetch("/api/admin/cms/pages/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          imageUrl: uploaded.url,
          imagePublicId: uploaded.publicId,
          alt: file.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add image");
      await loadPages();
      setSuccess("Gallery image added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(id: string) {
    if (!confirm("Remove this image?")) return;
    await fetch(`/api/admin/cms/pages/images?id=${id}`, { method: "DELETE" });
    await loadPages();
  }

  async function saveFaq(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const method = editingFaq ? "PATCH" : "POST";
    const body = editingFaq
      ? { id: editingFaq.id, ...faqForm }
      : faqForm;
    const res = await fetch("/api/admin/cms/faqs", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save FAQ");
      return;
    }
    setFaqForm({ question: "", answer: "" });
    setEditingFaq(null);
    setSuccess(editingFaq ? "FAQ updated." : "FAQ added.");
    await loadFaqs();
  }

  async function toggleFaq(faq: Faq) {
    await fetch("/api/admin/cms/faqs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: faq.id, isActive: !faq.isActive }),
    });
    await loadFaqs();
  }

  async function removeFaq(id: string) {
    if (!confirm("Delete this FAQ?")) return;
    await fetch(`/api/admin/cms/faqs?id=${id}`, { method: "DELETE" });
    await loadFaqs();
  }

  if (!pages.length && tab === "pages") {
    return <NahdaLoader variant="panel" label="Loading site CMS…" />;
  }

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
        Site pages CMS
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Edit About, Terms &amp; Conditions, Privacy Policy, and FAQs. These
        pages are required for Paystack business verification and public trust.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["pages", "Pages"],
            ["faqs", "FAQs"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setError("");
              setSuccess("");
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              tab === id
                ? "bg-[var(--accent)] text-white"
                : "bg-white text-[var(--ink)] ring-1 ring-[var(--line)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      )}

      {tab === "pages" && (
        <div className="mt-6 grid gap-8 lg:grid-cols-[220px_1fr]">
          <aside className="space-y-2">
            {(Object.keys(PAGE_LABELS) as PageSlug[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSlug(key)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
                  slug === key
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "bg-white text-[var(--ink)] ring-1 ring-[var(--line)]"
                }`}
              >
                {PAGE_LABELS[key]}
              </button>
            ))}
            <a
              href={`/${slug === "terms" ? "terms" : slug === "privacy" ? "privacy" : "about"}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              View live page →
            </a>
          </aside>

          <form
            onSubmit={savePage}
            className="space-y-4 rounded-2xl border border-[var(--line)] bg-white p-5"
          >
            <label className="field">
              <span>Title</span>
              <input
                required
                value={draft.title}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, title: e.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Subtitle</span>
              <input
                value={draft.subtitle}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, subtitle: e.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Body</span>
              <textarea
                required
                rows={18}
                value={draft.body}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, body: e.target.value }))
                }
                className="font-mono text-xs sm:text-sm"
              />
              <span className="mt-1 block text-xs text-[var(--muted)]">
                Blank line = new paragraph. Lines starting with &quot;- &quot;
                become bullets. Short lines without ending punctuation become
                headings.
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, isActive: e.target.checked }))
                }
              />
              Published (visible on site)
            </label>

            {slug === "about" && (
              <div className="space-y-4 border-t border-[var(--line)] pt-4">
                <h2 className="text-sm font-semibold">About images</h2>
                <div>
                  <p className="text-xs text-[var(--muted)]">Hero image</p>
                  {current?.heroImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={current.heroImageUrl}
                      alt=""
                      className="mt-2 h-36 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="mt-2 flex h-36 items-center justify-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] text-xs text-[var(--muted)]">
                      Placeholder shown on public page until you upload
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <label className="btn-secondary cursor-pointer text-xs">
                      {uploading ? "Uploading…" : "Upload hero"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadHero(f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {current?.heroImageUrl && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-rose-700"
                        onClick={() => void clearHero()}
                      >
                        Clear hero
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-[var(--muted)]">
                    Gallery (shown in a grid; empty slots use styled
                    placeholders)
                  </p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                    {(current?.images ?? []).map((img) => (
                      <div
                        key={img.id}
                        className="overflow-hidden rounded-xl border border-[var(--line)]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.imageUrl}
                          alt={img.alt ?? ""}
                          className="aspect-[4/3] w-full object-cover"
                        />
                        <button
                          type="button"
                          className="w-full px-2 py-1.5 text-left text-xs font-semibold text-rose-700"
                          onClick={() => void removeImage(img.id)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <label className="btn-secondary mt-3 inline-flex cursor-pointer text-xs">
                    {uploading ? "Uploading…" : "Add gallery image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadGallery(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving…" : `Save ${PAGE_LABELS[slug]}`}
            </button>
          </form>
        </div>
      )}

      {tab === "faqs" && (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {faqs.map((faq) => (
              <article
                key={faq.id}
                className="rounded-xl border border-[var(--line)] bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="font-semibold">{faq.question}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      faq.isActive
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {faq.isActive ? "Live" : "Hidden"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">{faq.answer}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                  <button
                    type="button"
                    className="text-[var(--accent)]"
                    onClick={() => {
                      setEditingFaq(faq);
                      setFaqForm({
                        question: faq.question,
                        answer: faq.answer,
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-[var(--ink)]"
                    onClick={() => void toggleFaq(faq)}
                  >
                    {faq.isActive ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    className="text-rose-700"
                    onClick={() => void removeFaq(faq.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
            {faqs.length === 0 && (
              <p className="text-sm text-[var(--muted)]">No FAQs yet.</p>
            )}
          </div>

          <form
            onSubmit={saveFaq}
            className="h-fit space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5"
          >
            <h2 className="text-sm font-semibold">
              {editingFaq ? "Edit FAQ" : "New FAQ"}
            </h2>
            <label className="field">
              <span>Question</span>
              <input
                required
                value={faqForm.question}
                onChange={(e) =>
                  setFaqForm((p) => ({ ...p, question: e.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Answer</span>
              <textarea
                required
                rows={5}
                value={faqForm.answer}
                onChange={(e) =>
                  setFaqForm((p) => ({ ...p, answer: e.target.value }))
                }
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Saving…" : editingFaq ? "Update" : "Add FAQ"}
              </button>
              {editingFaq && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditingFaq(null);
                    setFaqForm({ question: "", answer: "" });
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
