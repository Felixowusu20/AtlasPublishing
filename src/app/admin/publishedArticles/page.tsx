"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NahdaArticleTemplate } from "@/components/atlas-article-template";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  ManuscriptEditor,
  type ManuscriptFigure,
} from "@/components/manuscript-editor";

type QueueItem = {
  id: string;
  manuscriptId: string;
  title: string;
  abstract: string;
  keywords: string[];
  articleType: string;
  status: string;
  progress: number;
  authorsJson?: { name?: string; affiliation?: string }[] | null;
  submittedAt: string;
  manuscriptUrl?: string | null;
  productionBody?: string | null;
  productionFigures?: ManuscriptFigure[] | null;
  manuscriptReadyAt?: string | null;
  journal: {
    id: string;
    title: string;
    shortTitle: string;
    slug: string;
    coverColor: string;
    coverImageUrl?: string | null;
  };
  author: {
    id: string;
    name: string;
    email: string;
    institution?: string | null;
  };
};

type PublishedItem = {
  id: string;
  slug: string;
  title: string;
  publishedAt: string;
  journal: { title: string };
  submission?: {
    id: string;
    manuscriptId: string;
    author: { name: string; email: string };
  } | null;
};

type TemplateForm = {
  title: string;
  authors: string;
  affiliations: string;
  abstract: string;
  keywords: string;
  articleType: string;
  doi: string;
  volume: string;
  issue: string;
  pages: string;
  license: string;
  openAccess: boolean;
  isFeatured: boolean;
  logoUrl: string;
  body: string;
  figures: ManuscriptFigure[];
  pdfUrl: string;
};

type Pane = "edit" | "preview";

function authorsFromSubmission(sub: QueueItem): string {
  if (Array.isArray(sub.authorsJson) && sub.authorsJson.length > 0) {
    return sub.authorsJson
      .map((a) => a.name)
      .filter(Boolean)
      .join(", ");
  }
  return sub.author.name;
}

function affiliationsFromSubmission(sub: QueueItem): string {
  if (Array.isArray(sub.authorsJson) && sub.authorsJson.length > 0) {
    const list = sub.authorsJson
      .map((a) => a.affiliation)
      .filter(Boolean) as string[];
    if (list.length) return list.join("\n");
  }
  return sub.author.institution ?? "";
}

function emptyForm(): TemplateForm {
  return {
    title: "",
    authors: "",
    affiliations: "",
    abstract: "",
    keywords: "",
    articleType: "Research Article",
    doi: "",
    volume: "",
    issue: "Early View",
    pages: "",
    license: "CC BY 4.0",
    openAccess: true,
    isFeatured: true,
    logoUrl: "",
    body: "# Introduction\n\nPaste or write the full manuscript sections here.\n\n## Methods\n\n\n\n## Results\n\n\n\n## Discussion\n\n\n\n## Conclusion\n\n\n\n## References\n\n",
    figures: [],
    pdfUrl: "",
  };
}

function parseFigures(value: unknown): ManuscriptFigure[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (f): f is ManuscriptFigure =>
      !!f &&
      typeof f === "object" &&
      typeof (f as ManuscriptFigure).id === "string" &&
      typeof (f as ManuscriptFigure).url === "string" &&
      typeof (f as ManuscriptFigure).filename === "string",
  );
}

function splitList(value: string, sep: "," | "\n") {
  return value
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function PublishedArticlesPage() {
  const router = useRouter();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [recent, setRecent] = useState<PublishedItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm());
  const [pane, setPane] = useState<Pane>("edit");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState<{
    id: string;
    title: string;
    manuscriptId?: string;
    forEdit: boolean;
  } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const selected = useMemo(
    () => queue.find((q) => q.id === selectedId) ?? null,
    [queue, selectedId],
  );

  const previewAuthors = useMemo(
    () => splitList(form.authors, ","),
    [form.authors],
  );
  const previewAffiliations = useMemo(
    () => splitList(form.affiliations, "\n"),
    [form.affiliations],
  );
  const previewKeywords = useMemo(
    () => splitList(form.keywords, ","),
    [form.keywords],
  );

  function selectSubmission(sub: QueueItem) {
    setSelectedId(sub.id);
    setError("");
    setSuccess("");
    setPane("edit");
    const savedBody = sub.productionBody?.trim()
      ? sub.productionBody
      : emptyForm().body;
    // Title, abstract, keywords always come from the accepted submission
    setForm({
      title: sub.title?.trim() || "",
      authors: authorsFromSubmission(sub),
      affiliations: affiliationsFromSubmission(sub),
      abstract: sub.abstract?.trim() || "",
      keywords: (sub.keywords ?? []).join(", "),
      articleType: sub.articleType || "Research Article",
      doi: "",
      volume: "",
      issue: "Early View",
      pages: "",
      license: "CC BY 4.0",
      openAccess: true,
      isFeatured: true,
      logoUrl: sub.journal.coverImageUrl || "",
      body: savedBody,
      figures: parseFigures(sub.productionFigures),
      pdfUrl: "",
    });

    void fetch(
      `/api/admin/publish-queue/doi?journalId=${encodeURIComponent(sub.journal.id)}`,
      { cache: "no-store" },
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.doi) {
          setForm((f) => ({ ...f, doi: data.doi as string }));
        }
      })
      .catch(() => undefined);
  }

  async function load(preferId?: string | null) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/publish-queue", {
        cache: "no-store",
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        setError(
          "Publish queue API did not return JSON. Restart the Next.js server and try again.",
        );
        setQueue([]);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load publish queue");
        setQueue([]);
        return;
      }
      const nextQueue: QueueItem[] = data.queue ?? [];
      setQueue(nextQueue);
      setRecent(data.recentlyPublished ?? []);

      const targetId =
        preferId ||
        (typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("id")
          : null);
      if (targetId) {
        const match = nextQueue.find((q) => q.id === targetId);
        if (match) selectSubmission(match);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue");
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial queue load for the publish workspace
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  }, []);

  async function onLogoUpload(file: File | null) {
    if (!file) return;
    setUploadingLogo(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "nahda/branding");
      fd.append("resourceType", "image");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Logo upload failed");
      setForm((f) => ({ ...f, logoUrl: data.url as string }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  }

  function typstPayload() {
    if (!selected) return null;
    return {
      submissionId: selected.id,
      journalTitle: selected.journal.title,
      journalShortTitle: selected.journal.shortTitle,
      journalSlug: selected.journal.slug,
      coverColor: selected.journal.coverColor,
      manuscriptId: selected.manuscriptId,
      title: form.title,
      authors: splitList(form.authors, ","),
      affiliations: splitList(form.affiliations, "\n"),
      abstract: form.abstract,
      keywords: splitList(form.keywords, ","),
      articleType: form.articleType,
      doi: form.doi || undefined,
      volume: form.volume || undefined,
      issue: form.issue || undefined,
      pages: form.pages || undefined,
      license: form.license || undefined,
      openAccess: form.openAccess,
      body: form.body || undefined,
      figures: form.figures.map((f) => ({
        url: f.url,
        filename: f.filename,
        caption: f.caption,
      })),
      logoUrl: form.logoUrl || selected.journal.coverImageUrl || undefined,
    };
  }

  async function generatePdf(mode: "preview" | "upload") {
    if (!selected) return;
    const payload = typstPayload();
    if (!payload) return;
    setGeneratingPdf(true);
    setError("");
    try {
      const res = await fetch("/api/admin/typst-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          upload: mode === "upload",
        }),
      });

      if (mode === "preview") {
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "PDF preview failed");
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "PDF upload failed");
      setForm((f) => ({ ...f, pdfUrl: data.url as string }));
      setSuccess("Nahda PDF generated and ready. You can publish now.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF generation failed");
    } finally {
      setGeneratingPdf(false);
    }
  }

  function printPreview() {
    setPane("preview");
    requestAnimationFrame(() => window.print());
  }

  async function onPublish(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setPublishing(true);
    setError("");
    setSuccess("");

    const authors = splitList(form.authors, ",");
    const affiliations = splitList(form.affiliations, "\n");
    const keywords = splitList(form.keywords, ",");

    const res = await fetch("/api/admin/publish-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionId: selected.id,
        title: form.title,
        authors,
        affiliations,
        abstract: form.abstract,
        keywords,
        articleType: form.articleType,
        doi: form.doi || undefined,
        volume: form.volume || undefined,
        issue: form.issue || undefined,
        pages: form.pages || undefined,
        license: form.license || undefined,
        openAccess: form.openAccess,
        isFeatured: form.isFeatured,
        coverImageUrl:
          form.logoUrl || selected.journal.coverImageUrl || undefined,
        body: form.body || undefined,
        figures: form.figures.map((f) => ({
          url: f.url,
          filename: f.filename,
          caption: f.caption,
        })),
        pdfUrl: form.pdfUrl || undefined,
      }),
    });
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      setPublishing(false);
      setError("Publish failed: server returned an unexpected response.");
      return;
    }
    const data = await res.json();
    setPublishing(false);

    if (!res.ok) {
      setError(data.error ?? "Publish failed");
      return;
    }

    setSuccess(
      data.emailSent
        ? `Published${data.doi ? ` with DOI ${data.doi}` : ""}. Congratulations email sent to ${selected.author.email}.`
        : `Published at ${data.articleUrl}${data.doi ? ` · DOI ${data.doi}` : ""}. Email was not sent — check SMTP settings.`,
    );
    setSelectedId(null);
    setForm(emptyForm());
    await load();
  }

  function askDeleteArticle(article: PublishedItem, forEdit: boolean) {
    setPending({
      id: article.id,
      title: article.title,
      manuscriptId: article.submission?.manuscriptId,
      forEdit,
    });
  }

  async function confirmDeleteArticle() {
    if (!pending) return;
    const { id: articleId, forEdit } = pending;
    setError("");
    setSuccess("");
    setActionBusy(true);
    try {
      const res = await fetch(
        `/api/admin/articles?id=${encodeURIComponent(articleId)}${forEdit ? "&edit=1" : ""}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not delete article");
      setPending(null);
      if (forEdit && data.editUrl) {
        router.push(data.editUrl as string);
        return;
      }
      setSuccess(
        "Moved to recycle bin. It is no longer live or visible to the author as published.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setPending(null);
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div>
      <ConfirmDialog
        open={Boolean(pending)}
        tone={pending?.forEdit ? "accent" : "danger"}
        eyebrow={pending?.manuscriptId ?? "Published article"}
        title={
          pending?.forEdit
            ? "Open in Full manuscripts?"
            : "Move to recycle bin?"
        }
        description={
          pending?.forEdit ? (
            <>
              <p>
                <span className="font-medium text-[var(--ink)]">
                  “{pending.title}”
                </span>{" "}
                will be unpublished so you can revise the full manuscript.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
                  Leaves the public site until you publish again
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
                  Author download is disabled until republished
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
                  Opens Full manuscripts with this paper selected
                </li>
              </ul>
            </>
          ) : (
            <>
              <p>
                Move{" "}
                <span className="font-medium text-[var(--ink)]">
                  “{pending?.title}”
                </span>{" "}
                to the recycle bin.
              </p>
              <p className="mt-2 text-xs">
                It leaves the public site and the author’s published list. You
                can restore it later from Recycle bin.
              </p>
            </>
          )
        }
        confirmLabel={
          pending?.forEdit ? "Unpublish & edit" : "Move to bin"
        }
        cancelLabel="Keep published"
        busy={actionBusy}
        onCancel={() => {
          if (!actionBusy) setPending(null);
        }}
        onConfirm={() => void confirmDeleteArticle()}
      />
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #nahda-article-template,
          #nahda-article-template * {
            visibility: visible !important;
          }
          #nahda-article-template {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            Publish accepted papers
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Edit metadata, generate the Nahda Typst PDF from the full
            manuscript, then publish and email the author.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary !px-3 !py-2 text-xs"
            onClick={() => void load()}
          >
            Refresh queue
          </button>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            {queue.length} ready
          </span>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 print:hidden">
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[300px_1fr] print:block">
        <section className="print:hidden">
          <h2 className="text-sm font-semibold text-[var(--ink)]">
            Accepted queue
          </h2>
          {loading && (
            <p className="mt-3 text-sm text-[var(--muted)]">Loading…</p>
          )}
          {!loading && queue.length === 0 && (
            <p className="mt-3 rounded-xl border border-dashed border-[var(--line)] bg-white p-4 text-sm text-[var(--muted)]">
              No accepted papers waiting. Mark a submission as Accepted in the
              inbox first.
            </p>
          )}
          <ul className="mt-3 space-y-2">
            {queue.map((sub) => {
              const active = sub.id === selectedId;
              return (
                <li key={sub.id}>
                  <button
                    type="button"
                    onClick={() => selectSubmission(sub)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--line)] bg-white hover:border-[var(--accent)]/40"
                    }`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                      {sub.manuscriptId} · {sub.progress}%
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
                      {sub.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {sub.author.name} · {sub.journal.shortTitle}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          {recent.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-[var(--ink)]">
                Recently published
              </h2>
              <ul className="mt-3 space-y-2">
                {recent.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-xl border border-[var(--line)] bg-white px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {a.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {a.submission?.manuscriptId ?? "Manual"} · {a.journal.title}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <Link
                        href={`/articles/${a.slug}`}
                        target="_blank"
                        className="text-xs font-semibold text-[var(--accent)]"
                      >
                        Open article →
                      </Link>
                      {a.submission?.id && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-[var(--ink)] hover:text-[var(--accent)]"
                          onClick={() => askDeleteArticle(a, true)}
                        >
                          Edit manuscript
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-xs font-semibold text-rose-700"
                        onClick={() => askDeleteArticle(a, false)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm sm:p-6 print:border-0 print:p-0 print:shadow-none">
          {!selected ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center print:hidden">
              <p className="text-sm font-medium text-[var(--ink)]">
                Select an accepted paper
              </p>
              <p className="mt-1 max-w-sm text-xs text-[var(--muted)]">
                Load it into the Nahda article template to edit authors, logo,
                and metadata, then preview and publish.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-4 print:hidden">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                    Nahda article template
                  </p>
                  <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
                    {selected.manuscriptId}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {selected.journal.title} · {selected.author.email}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selected.manuscriptUrl && (
                    <a
                      href={selected.manuscriptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary !px-3 !py-2 text-xs"
                    >
                      Manuscript file
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn-secondary !px-3 !py-2 text-xs"
                    onClick={printPreview}
                  >
                    Print preview
                  </button>
                </div>
              </div>

              <div className="mt-4 flex gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1 print:hidden">
                <button
                  type="button"
                  onClick={() => setPane("edit")}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${
                    pane === "edit"
                      ? "bg-white text-[var(--ink)] shadow-sm"
                      : "text-[var(--muted)]"
                  }`}
                >
                  Edit details
                </button>
                <button
                  type="button"
                  onClick={() => setPane("preview")}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${
                    pane === "preview"
                      ? "bg-white text-[var(--ink)] shadow-sm"
                      : "text-[var(--muted)]"
                  }`}
                >
                  Live preview
                </button>
              </div>

              {pane === "edit" ? (
                <form onSubmit={onPublish} className="mt-5 space-y-3 print:hidden">
                  <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)]/60 p-4">
                    <p className="text-xs font-semibold text-[var(--ink)]">
                      Journal logo
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--muted)]">
                      Uses this journal&apos;s logo from Admin → Journals when
                      available. You can override it for this article.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {form.logoUrl || selected.journal.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            form.logoUrl ||
                            selected.journal.coverImageUrl ||
                            ""
                          }
                          alt="Logo preview"
                          className="h-10 w-auto max-w-[140px] rounded border border-[var(--line)] bg-white object-contain p-1"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-semibold text-white">
                          N
                        </div>
                      )}
                      <label className="btn-secondary cursor-pointer !px-3 !py-2 text-xs">
                        {uploadingLogo ? "Uploading…" : "Override logo"}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="hidden"
                          disabled={uploadingLogo}
                          onChange={(e) =>
                            void onLogoUpload(e.target.files?.[0] ?? null)
                          }
                        />
                      </label>
                      {form.logoUrl &&
                        form.logoUrl !==
                          (selected.journal.coverImageUrl || "") && (
                          <button
                            type="button"
                            className="text-xs font-semibold text-[var(--muted)] underline"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                logoUrl: selected.journal.coverImageUrl || "",
                              }))
                            }
                          >
                            Use journal logo
                          </button>
                        )}
                    </div>
                  </div>

                  <label className="field">
                    <span>Title</span>
                    <input
                      required
                      value={form.title}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, title: e.target.value }))
                      }
                    />
                    <span className="mt-1 block text-[11px] text-[var(--muted)]">
                      Pre-filled from the accepted submission
                    </span>
                  </label>
                  <label className="field">
                    <span>Authors (comma-separated)</span>
                    <input
                      required
                      value={form.authors}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, authors: e.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Affiliations (one per line)</span>
                    <textarea
                      rows={2}
                      value={form.affiliations}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          affiliations: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Abstract</span>
                    <textarea
                      required
                      rows={5}
                      value={form.abstract}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, abstract: e.target.value }))
                      }
                    />
                    <span className="mt-1 block text-[11px] text-[var(--muted)]">
                      Pre-filled from the accepted submission
                    </span>
                  </label>
                  <label className="field">
                    <span>Keywords (comma-separated)</span>
                    <input
                      value={form.keywords}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, keywords: e.target.value }))
                      }
                    />
                  </label>

                  <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)]/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-[var(--ink)]">
                          Full manuscript
                        </p>
                        <p className="mt-1 text-[11px] text-[var(--muted)]">
                          {selected.manuscriptReadyAt
                            ? "Marked ready from Full manuscripts. You can still tweak below before generating the PDF."
                            : selected.productionBody?.trim()
                              ? "Draft loaded from Full manuscripts."
                              : "No full text yet — write it in Full manuscripts first for best results."}
                        </p>
                      </div>
                      <Link
                        href={`/admin/manuscripts?id=${selected.id}`}
                        className="btn-secondary !px-3 !py-2 text-xs"
                      >
                        Open Full manuscripts
                      </Link>
                    </div>
                  </div>

                  <ManuscriptEditor
                    value={form.body}
                    onChange={(body) => setForm((f) => ({ ...f, body }))}
                    figures={form.figures}
                    onFiguresChange={(figures) =>
                      setForm((f) => ({ ...f, figures }))
                    }
                    onError={setError}
                    rows={14}
                    label="Article body (for Typst PDF)"
                    hint="Prefer writing the full paper on Full manuscripts, then return here to publish. Changes here are used for this publish session’s PDF."
                  />

                  <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)]/50 p-4">
                    <p className="text-xs font-semibold text-[var(--ink)]">
                      Nahda Typst PDF
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--muted)]">
                      Generate the branded downloadable article PDF the author
                      will receive after publication.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-secondary !px-3 !py-2 text-xs"
                        disabled={generatingPdf}
                        onClick={() => void generatePdf("preview")}
                      >
                        {generatingPdf ? "Generating…" : "Preview PDF"}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary !px-3 !py-2 text-xs"
                        disabled={generatingPdf}
                        onClick={() => void generatePdf("upload")}
                      >
                        {generatingPdf ? "Generating…" : "Generate and save PDF"}
                      </button>
                    </div>
                    {form.pdfUrl && (
                      <p className="mt-2 text-[11px] text-emerald-800">
                        PDF ready:{" "}
                        <a
                          href={form.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold underline"
                        >
                          open saved file
                        </a>
                      </p>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="field">
                      <span>Article type</span>
                      <input
                        required
                        value={form.articleType}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            articleType: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="field sm:col-span-2">
                      <span>DOI (auto-assigned)</span>
                      <input
                        value={form.doi}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, doi: e.target.value }))
                        }
                        placeholder="10.58000/ajs.2026.0142"
                      />
                      <p className="text-[11px] text-[var(--muted)]">
                        Assigned automatically on publish. Readers can search this
                        DOI or open{" "}
                        {form.doi ? (
                          <code className="rounded bg-[var(--surface)] px-1">
                            /doi/{form.doi}
                          </code>
                        ) : (
                          "the Nahda DOI link"
                        )}{" "}
                        to view or download the PDF.
                      </p>
                    </label>
                    <label className="field">
                      <span>Volume</span>
                      <input
                        value={form.volume}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, volume: e.target.value }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Issue</span>
                      <input
                        value={form.issue}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, issue: e.target.value }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Pages</span>
                      <input
                        value={form.pages}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, pages: e.target.value }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>License</span>
                      <input
                        value={form.license}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, license: e.target.value }))
                        }
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.openAccess}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            openAccess: e.target.checked,
                          }))
                        }
                      />
                      Open access
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.isFeatured}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            isFeatured: e.target.checked,
                          }))
                        }
                      />
                      Feature on homepage
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setPane("preview")}
                    >
                      Preview template
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={publishing}
                    >
                      {publishing
                        ? "Publishing…"
                        : "Publish and email author"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
                    <p className="text-xs text-[var(--muted)]">
                      Live preview updates from your edits. Switch back to Edit
                      details anytime.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-secondary !px-3 !py-2 text-xs"
                        onClick={() => setPane("edit")}
                      >
                        Back to edit
                      </button>
                      <button
                        type="button"
                        className="btn-primary !px-3 !py-2 text-xs"
                        disabled={publishing}
                        onClick={(e) => {
                          e.preventDefault();
                          void onPublish(e as unknown as FormEvent);
                        }}
                      >
                        {publishing
                          ? "Publishing…"
                          : "Publish and email author"}
                      </button>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[#e8edf2] p-4 sm:p-6">
                    <NahdaArticleTemplate
                      journalTitle={selected.journal.title}
                      journalShortTitle={selected.journal.shortTitle}
                      journalSlug={selected.journal.slug}
                      coverColor={selected.journal.coverColor}
                      journalUrl={`/journals/${selected.journal.slug}`}
                      manuscriptId={selected.manuscriptId}
                      title={form.title}
                      authors={previewAuthors}
                      affiliations={previewAffiliations}
                      abstract={form.abstract}
                      keywords={previewKeywords}
                      articleType={form.articleType}
                      doi={form.doi}
                      volume={form.volume}
                      issue={form.issue}
                      pages={form.pages}
                      license={form.license}
                      openAccess={form.openAccess}
                      logoUrl={
                        form.logoUrl || selected.journal.coverImageUrl || null
                      }
                      body={form.body}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {!selected && success && (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 print:hidden">
              {success}
            </p>
          )}
          {selected && success && (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 print:hidden">
              {success}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
