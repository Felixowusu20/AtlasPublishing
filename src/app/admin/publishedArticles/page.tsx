"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { NahdaArticleTemplate } from "@/components/atlas-article-template";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  ManuscriptEditor,
  type ManuscriptFigure,
} from "@/components/manuscript-editor";
import { ManuscriptImportPanel } from "@/components/manuscript-import";
import { NahdaLoader } from "@/components/nahda-loader";
import { AuthorOrcidLine, OrcidIdIcon } from "@/components/orcid-id";
import { useAutosave } from "@/hooks/use-autosave";
import { uploadFileDirect } from "@/lib/client-upload";
import {
  articleTemplateToPdf,
  beginArticlePrint,
  endArticlePrint,
  nahdaPdfFile,
  pdfErrorMessage,
  stripChromePrintHeader,
} from "@/lib/nahda-pdf";
import {
  formatAuthorWithOrcid,
  normalizeOrcid,
  parseAuthorOrcid,
} from "@/lib/orcid";
import { htmlToPlainText } from "@/lib/import-manuscript";
import { slugify } from "@/lib/submission-utils";
import { RichTextField } from "@/components/rich-text-field";
import { journalArticlePalette } from "@/lib/journal-colors";
import { formatArticleDate, toDateInputValue } from "@/lib/article-dates";
import {
  findIssueRecord,
  issuesForJournal,
  numberedIssuePlacement,
  type IssueRecord,
} from "@/lib/issues";

type AuthorEntry = {
  name: string;
  orcid: string;
};

type QueueItem = {
  id: string;
  manuscriptId: string;
  title: string;
  abstract: string;
  keywords: string[];
  articleType: string;
  status: string;
  progress: number;
  authorsJson?: {
    name?: string;
    affiliation?: string;
    orcid?: string | null;
  }[] | null;
  submittedAt: string;
  manuscriptUrl?: string | null;
  productionBody?: string | null;
  productionFigures?: ManuscriptFigure[] | null;
  manuscriptReadyAt?: string | null;
  funding?: string | null;
  conflictOfInterest?: string | null;
  journal: {
    id: string;
    title: string;
    shortTitle: string;
    slug: string;
    coverColor: string;
    coverImageUrl?: string | null;
    issn?: string | null;
    frequency?: string | null;
    foundedYear?: number | null;
  };
  author: {
    id: string;
    name: string;
    email: string;
    institution?: string | null;
    orcid?: string | null;
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
  authorEntries: AuthorEntry[];
  affiliations: string;
  abstract: string;
  keywords: string;
  articleType: string;
  doi: string;
  issn: string;
  volume: string;
  issue: string;
  pages: string;
  receivedAt: string;
  acceptedAt: string;
  publishedAt: string;
  license: string;
  openAccess: boolean;
  isFeatured: boolean;
  logoUrl: string;
  body: string;
  figures: ManuscriptFigure[];
  pdfUrl: string;
};

type Pane = "edit" | "preview";

function authorEntriesFromSubmission(sub: QueueItem): AuthorEntry[] {
  if (Array.isArray(sub.authorsJson) && sub.authorsJson.length > 0) {
    const rows = sub.authorsJson
      .map((a, i) => {
        const parsed = parseAuthorOrcid(a.name ?? "");
        if (!parsed.name) return null;
        const orcid =
          normalizeOrcid(a.orcid) ||
          parsed.orcid ||
          (i === 0 ? normalizeOrcid(sub.author.orcid) : null);
        return { name: parsed.name, orcid: orcid ?? "" };
      })
      .filter((row): row is AuthorEntry => Boolean(row));
    if (rows.length) return rows;
  }
  const parsed = parseAuthorOrcid(sub.author.name);
  return [
    {
      name: parsed.name || sub.author.name,
      orcid: normalizeOrcid(sub.author.orcid) ?? parsed.orcid ?? "",
    },
  ];
}

function boundAuthorNames(entries: AuthorEntry[]): string[] {
  return entries
    .map((row) => formatAuthorWithOrcid(row.name, row.orcid))
    .filter(Boolean);
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
    authorEntries: [{ name: "", orcid: "" }],
    affiliations: "",
    abstract: "",
    keywords: "",
    articleType: "Research Article",
    doi: "",
    issn: "",
    volume: "",
    issue: "",
    pages: "",
    receivedAt: "",
    acceptedAt: "",
    publishedAt: "",
    license: "CC BY 4.0",
    openAccess: true,
    isFeatured: true,
    logoUrl: "",
    body: "",
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
  const [journalIssues, setJournalIssues] = useState<IssueRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm());
  const [pane, setPane] = useState<Pane>("edit");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfKind, setPdfKind] = useState<"none" | "uploaded" | "generated">(
    "none",
  );
  const [uploadedPdfName, setUploadedPdfName] = useState("");
  const [publishPhase, setPublishPhase] = useState<
    "idle" | "pdf" | "upload" | "publish"
  >("idle");
  const [publishMode, setPublishMode] = useState<
    "uploaded" | "generated" | null
  >(null);
  const pdfSourceRef = useRef<HTMLDivElement>(null);
  const cleanedPdfInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [draftDirty, setDraftDirty] = useState(false);
  const [autosaveNote, setAutosaveNote] = useState("");
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
    () => boundAuthorNames(form.authorEntries),
    [form.authorEntries],
  );
  const previewAffiliations = useMemo(
    () => splitList(form.affiliations, "\n"),
    [form.affiliations],
  );
  const previewKeywords = useMemo(
    () => splitList(form.keywords, ","),
    [form.keywords],
  );
  const previewDates = useMemo(
    () => ({
      receivedAt: formatArticleDate(form.receivedAt) || undefined,
      acceptedAt: formatArticleDate(form.acceptedAt) || undefined,
      publishedAt: formatArticleDate(form.publishedAt) || undefined,
    }),
    [form.receivedAt, form.acceptedAt, form.publishedAt],
  );
  const selectedJournalIssues = useMemo(
    () =>
      selected ? issuesForJournal(journalIssues, selected.journal.id) : [],
    [journalIssues, selected],
  );
  const matchedIssue = useMemo(
    () =>
      selected
        ? findIssueRecord(
            journalIssues,
            selected.journal.id,
            form.volume,
            form.issue,
          )
        : null,
    [journalIssues, selected, form.volume, form.issue],
  );
  const suggestedPlacement = useMemo(() => {
    if (!selected) return null;
    return numberedIssuePlacement({
      publishedAt: form.publishedAt || new Date(),
      frequency: selected.journal.frequency,
      foundedYear: selected.journal.foundedYear,
    });
  }, [
    selected,
    form.publishedAt,
  ]);

  const skipDirty = useRef(false);
  const formRef = useRef(form);
  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    formRef.current = form;
    selectedIdRef.current = selectedId;
  });

  const persistDraft = useCallback(async () => {
    const id = selectedIdRef.current;
    const f = formRef.current;
    if (!id) return;
    setAutosaveNote("Saving…");
    const payload: Record<string, unknown> = {
      submissionId: id,
      body: f.body,
      figures: f.figures,
      done: false,
      keywords: splitList(f.keywords, ","),
    };
    if (f.title.trim().length >= 2) payload.title = f.title.trim();
    if (htmlToPlainText(f.abstract).trim().length >= 10) {
      payload.abstract = f.abstract.trim();
    }
    try {
      const res = await fetch("/api/admin/manuscripts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      if (selectedIdRef.current !== id) return;
      setDraftDirty(false);
      setAutosaveNote("Saved");
      setQueue((prev) =>
        prev.map((q) =>
          q.id === id
            ? {
                ...q,
                title: data.submission?.title ?? f.title.trim(),
                abstract: data.submission?.abstract ?? f.abstract.trim(),
                keywords: data.submission?.keywords ?? q.keywords,
                productionBody: f.body,
                productionFigures: f.figures,
              }
            : q,
        ),
      );
    } catch {
      setAutosaveNote("Couldn’t autosave");
    }
  }, []);

  useAutosave({
    enabled: Boolean(selectedId),
    dirty: draftDirty,
    delayMs: 1200,
    save: persistDraft,
  });

  useEffect(() => {
    if (!selectedId) return;
    if (skipDirty.current) {
      skipDirty.current = false;
      return;
    }
    setDraftDirty(true);
  }, [form, selectedId]);

  function selectSubmission(sub: QueueItem) {
    if (draftDirty && selectedIdRef.current && selectedIdRef.current !== sub.id) {
      void persistDraft();
    }
    skipDirty.current = true;
    setDraftDirty(false);
    setAutosaveNote("");
    setSelectedId(sub.id);
    setError("");
    setSuccess("");
    setPane("edit");
    const savedBody = sub.productionBody?.trim()
      ? sub.productionBody
      : emptyForm().body;
    // Title, abstract, keywords always come from the accepted submission
    const publishedAt = toDateInputValue(new Date());
    const placement = numberedIssuePlacement({
      publishedAt,
      frequency: sub.journal.frequency,
      foundedYear: sub.journal.foundedYear,
    });
    setForm({
      title: sub.title?.trim() || "",
      authorEntries: authorEntriesFromSubmission(sub),
      affiliations: affiliationsFromSubmission(sub),
      abstract: sub.abstract?.trim() || "",
      keywords: (sub.keywords ?? []).join(", "),
      articleType: sub.articleType || "Research Article",
      doi: "",
      issn: sub.journal.issn ?? "",
      volume: placement.volume,
      issue: placement.issue,
      pages: "",
      receivedAt: toDateInputValue(sub.submittedAt),
      acceptedAt: "",
      publishedAt,
      license: "CC BY 4.0",
      openAccess: true,
      isFeatured: true,
      logoUrl: sub.journal.coverImageUrl || "",
      body: savedBody,
      figures: parseFigures(sub.productionFigures),
      pdfUrl: "",
    });
    setPdfKind("none");
    setUploadedPdfName("");

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

  function updateAuthorEntry(
    index: number,
    key: keyof AuthorEntry,
    value: string,
  ) {
    setForm((f) => ({
      ...f,
      authorEntries: f.authorEntries.map((row, i) =>
        i === index ? { ...row, [key]: value } : row,
      ),
    }));
  }

  function addAuthorEntry() {
    setForm((f) => ({
      ...f,
      authorEntries: [...f.authorEntries, { name: "", orcid: "" }],
    }));
  }

  function removeAuthorEntry(index: number) {
    setForm((f) => {
      const next = f.authorEntries.filter((_, i) => i !== index);
      return {
        ...f,
        authorEntries: next.length ? next : [{ name: "", orcid: "" }],
      };
    });
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
      setJournalIssues(data.journalIssues ?? []);

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
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  }, []);

  async function onLogoUpload(file: File | null) {
    if (!file) return;
    setUploadingLogo(true);
    setError("");
    try {
      const data = await uploadFileDirect(file, {
        folder: "nahda/branding",
        resourceType: "image",
      });
      setForm((f) => ({ ...f, logoUrl: data.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function onPdfUpload(file: File | null) {
    if (!file) return;
    if (file.type && file.type !== "application/pdf") {
      setError(
        "Upload the cleaned Print PDF only — Word and Google Docs files stay in editing, not in the public download.",
      );
      return;
    }
    setUploadingPdf(true);
    setError("");
    setSuccess("");
    try {
      const cleaned = await stripChromePrintHeader(file);
      const data = await uploadFileDirect(cleaned, {
        folder: "atlas/published-pdfs",
        resourceType: "raw",
      });
      setForm((f) => ({ ...f, pdfUrl: data.url }));
      setPdfKind("uploaded");
      setUploadedPdfName(file.name);
      setSuccess(
        "Cleaned Print PDF uploaded (browser date header removed). Publish uploaded PDF to bind it to the article page and author email.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF upload failed");
    } finally {
      setUploadingPdf(false);
      if (cleanedPdfInputRef.current) cleanedPdfInputRef.current.value = "";
    }
  }

  async function onUploadAndPublish(file: File | null) {
    if (!file) return;
    if (file.type && file.type !== "application/pdf") {
      setError(
        "Upload the cleaned Print PDF only — Word and Google Docs files stay in editing, not in the public download.",
      );
      return;
    }
    setUploadingPdf(true);
    setError("");
    setSuccess("");
    try {
      const cleaned = await stripChromePrintHeader(file);
      const data = await uploadFileDirect(cleaned, {
        folder: "atlas/published-pdfs",
        resourceType: "raw",
      });
      setForm((f) => ({ ...f, pdfUrl: data.url }));
      setPdfKind("uploaded");
      setUploadedPdfName(file.name);
      setUploadingPdf(false);
      await onPublish("uploaded", data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF upload failed");
      setUploadingPdf(false);
    } finally {
      if (cleanedPdfInputRef.current) cleanedPdfInputRef.current.value = "";
    }
  }

  async function generateAndUploadPdf() {
    try {
      const root = pdfSourceRef.current;
      if (!root) {
        throw new Error(
          "The Nahda template is still loading. Wait a moment and try again.",
        );
      }
      const blob = await articleTemplateToPdf(root);
      const file = nahdaPdfFile(form.title || selected?.title || "article", blob);
      return await uploadFileDirect(file, {
        folder: "atlas/published-pdfs",
        resourceType: "raw",
      });
    } catch (err) {
      console.error("[nahda-pdf]", err);
      throw new Error(
        pdfErrorMessage(
          err,
          "Could not generate the Nahda-styled PDF. Stay on this page and try Publish again.",
        ),
      );
    }
  }

  async function onGeneratePdf() {
    setUploadingPdf(true);
    setError("");
    setSuccess("");
    try {
      if (draftDirty) await persistDraft();
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      const uploaded = await generateAndUploadPdf();
      setForm((f) => ({ ...f, pdfUrl: uploaded.url }));
      setPdfKind("generated");
      setUploadedPdfName("");
      setSuccess(
        "Nahda-styled PDF generated from the template. Open it to proof, then use Generate PDF & publish.",
      );
    } catch (err) {
      setError(
        pdfErrorMessage(err, "Could not generate the Nahda PDF from the template."),
      );
    } finally {
      setUploadingPdf(false);
    }
  }

  const printAfterPreview = useRef(false);

  function printPreview() {
    beginArticlePrint(form.title || selected?.title || "Article");
    const restore = () => {
      endArticlePrint();
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    if (pane === "preview") {
      window.print();
      return;
    }
    printAfterPreview.current = true;
    setPane("preview");
  }

  useEffect(() => {
    if (pane !== "preview" || !printAfterPreview.current) return;
    printAfterPreview.current = false;
    const timer = window.setTimeout(() => window.print(), 450);
    return () => window.clearTimeout(timer);
  }, [pane]);

  async function onPublish(
    mode: "uploaded" | "generated",
    readyPdfUrl?: string,
  ) {
    if (!selected) return;
    if (draftDirty) await persistDraft();
    setPublishing(true);
    setPublishMode(mode);
    setPublishPhase(mode === "uploaded" ? "publish" : "pdf");
    setError("");
    setSuccess("");

    const authors = boundAuthorNames(form.authorEntries);
    const affiliations = splitList(form.affiliations, "\n");
    const keywords = splitList(form.keywords, ",");

    if (!authors.length) {
      setPublishing(false);
      setPublishPhase("idle");
      setPublishMode(null);
      setError("Add at least one author name.");
      return;
    }
    if (htmlToPlainText(form.abstract).trim().length < 10) {
      setPublishing(false);
      setPublishPhase("idle");
      setPublishMode(null);
      setError("Add an abstract before publishing.");
      return;
    }

    let pdfUrl = readyPdfUrl || form.pdfUrl;
    if (mode === "uploaded") {
      if (!pdfUrl) {
        setPublishing(false);
        setPublishPhase("idle");
        setPublishMode(null);
        setError(
          "Upload the cleaned Print PDF first, then click Publish uploaded PDF.",
        );
        return;
      }
    } else {
      try {
        await new Promise((resolve) => window.setTimeout(resolve, 120));
        const uploaded = await generateAndUploadPdf();
        pdfUrl = uploaded.url;
        setForm((f) => ({ ...f, pdfUrl }));
        setPdfKind("generated");
        setPublishPhase("upload");
      } catch (err) {
        setPublishing(false);
        setPublishPhase("idle");
        setPublishMode(null);
        setError(
          pdfErrorMessage(
            err,
            "Could not generate the Nahda-styled PDF. Stay on this page and try Publish again.",
          ),
        );
        return;
      }
    }

    setPublishPhase("publish");
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
        issn: form.issn || undefined,
        volume: form.volume || undefined,
        issue: form.issue || undefined,
        pages: form.pages || undefined,
        receivedAt: form.receivedAt || undefined,
        acceptedAt: form.acceptedAt || undefined,
        publishedAt: form.publishedAt || undefined,
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
        pdfUrl,
      }),
    });
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      setPublishing(false);
      setPublishPhase("idle");
      setPublishMode(null);
      setError("Publish failed: server returned an unexpected response.");
      return;
    }
    const data = await res.json();
    setPublishing(false);
    setPublishPhase("idle");
    setPublishMode(null);

    if (!res.ok) {
      setError(data.error ?? "Publish failed");
      return;
    }

    setSuccess(
      data.emailSent
        ? `Published${data.doi ? ` with DOI ${data.doi}` : ""}. The ${mode === "uploaded" ? "uploaded Print PDF" : "generated Nahda PDF"} is bound to the article page. Congratulations email sent to ${selected.author.email}.`
        : `Published at ${data.articleUrl}${data.doi ? ` · DOI ${data.doi}` : ""}. Email was not sent — check SMTP settings.`,
    );
    setSelectedId(null);
    setForm(emptyForm());
    setPdfKind("none");
    setUploadedPdfName("");
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
      const res = forEdit
        ? await fetch("/api/admin/articles/unpublish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: articleId }),
          })
        : await fetch(
            `/api/admin/articles?id=${encodeURIComponent(articleId)}`,
            { method: "DELETE" },
          );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ??
            (forEdit ? "Could not unpublish article" : "Could not delete article"),
        );
      }
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

  const uploadedPublishLabel =
    publishing && publishMode === "uploaded"
      ? "Publishing uploaded PDF…"
      : pdfKind === "uploaded" && form.pdfUrl
        ? "Publish uploaded PDF"
        : "Upload cleaned PDF & publish";
  const generatedPublishLabel =
    publishing && publishMode === "generated"
      ? publishPhase === "pdf" || publishPhase === "upload"
        ? "Generating Nahda PDF…"
        : "Publishing…"
      : "Generate PDF & publish";

  const captureTemplate =
    selected ? (
      <NahdaArticleTemplate
        journalTitle={selected.journal.title}
        journalShortTitle={selected.journal.shortTitle}
        journalSlug={selected.journal.slug}
        coverColor={selected.journal.coverColor}
        journalUrl={`/journals/${selected.journal.slug}`}
        articleUrl={`/articles/${slugify(form.title)}`}
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
        receivedAt={previewDates.receivedAt}
        acceptedAt={previewDates.acceptedAt}
        publishedAt={previewDates.publishedAt}
        license={form.license}
        openAccess={form.openAccess}
        logoUrl={form.logoUrl || selected.journal.coverImageUrl || null}
        funding={selected.funding}
        conflictOfInterest={selected.conflictOfInterest}
        body={form.body}
      />
    ) : null;

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
          html,
          body {
            display: block !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: white !important;
          }

          #nahda-article-template {
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            height: auto !important;
            overflow: visible !important;
            box-shadow: none !important;
            outline: none !important;
            border: none !important;
            background: white !important;
          }
        }
      `}</style>

      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-[var(--ink)]">
            Publish accepted papers
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Edit metadata on this journal’s template, import Word or Google
            Docs only to fill the body, then publish. Nahda generates a
            styled PDF from the reviewed template — readers never download
            the original Word file.
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

      <div
        className={`mt-8 grid gap-6 print:block ${
          selected
            ? "lg:grid-cols-[220px_minmax(0,1fr)]"
            : "lg:grid-cols-[300px_1fr]"
        }`}
      >
        <section className="print:hidden">
          <h2 className="text-sm font-semibold text-[var(--ink)]">
            Accepted queue
          </h2>
          {loading && (
            <NahdaLoader variant="inline" label="Loading accepted queue…" />
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
                    {draftDirty
                      ? " · Unsaved"
                      : autosaveNote
                        ? ` · ${autosaveNote}`
                        : " · Autosaves as you edit"}
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
                <form
                  onSubmit={(e) => e.preventDefault()}
                  className="mt-5 print:hidden"
                >
                  <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
                    <div className="order-2 min-w-0 space-y-3 lg:order-1">
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
                  <div>
                    <div className="flex items-end justify-between gap-3">
                      <span className="text-sm font-medium text-[var(--ink)]">
                        Authors &amp; ORCID
                      </span>
                      <button
                        type="button"
                        className="text-xs font-semibold text-[var(--accent)] hover:underline"
                        onClick={addAuthorEntry}
                      >
                        Add author
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--muted)]">
                      Each ORCID is bound to that author’s name and shows as
                      the green iD mark in preview and on the published paper.
                    </p>
                    <div className="mt-2 space-y-2">
                      {form.authorEntries.map((row, i) => {
                        const bound = normalizeOrcid(row.orcid);
                        return (
                          <div
                            key={`author-${i}`}
                            className="rounded-xl border border-[var(--line)] bg-white p-3"
                          >
                            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                              <label className="field !mb-0">
                                <span>Name</span>
                                <input
                                  required
                                  value={row.name}
                                  placeholder="Julian M. Yabut"
                                  onChange={(e) =>
                                    updateAuthorEntry(i, "name", e.target.value)
                                  }
                                />
                              </label>
                              <label className="field !mb-0">
                                <span>ORCID</span>
                                <input
                                  value={row.orcid}
                                  placeholder="0000-0002-1825-0097"
                                  autoComplete="off"
                                  inputMode="text"
                                  onChange={(e) =>
                                    updateAuthorEntry(i, "orcid", e.target.value)
                                  }
                                />
                              </label>
                              <div className="flex items-end">
                                <button
                                  type="button"
                                  className="mb-[1px] rounded-lg border border-[var(--line)] px-2.5 py-2 text-xs text-[var(--muted)] hover:border-rose-200 hover:text-rose-700 disabled:opacity-40"
                                  onClick={() => removeAuthorEntry(i)}
                                  disabled={form.authorEntries.length <= 1}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            {row.name.trim() ? (
                              <p className="mt-2 text-[12.5px] leading-relaxed">
                                <AuthorOrcidLine
                                  authors={[
                                    formatAuthorWithOrcid(row.name, row.orcid),
                                  ]}
                                  correspondingLast={false}
                                />
                                {bound ? (
                                  <span className="ml-2 align-middle text-[10px] text-[var(--muted)]">
                                    linked
                                  </span>
                                ) : row.orcid.trim() ? (
                                  <span className="ml-2 align-middle text-[10px] text-amber-700">
                                    Enter a valid ORCID to bind the iD
                                  </span>
                                ) : (
                                  <span className="ml-2 inline-flex items-center gap-1 align-middle text-[10px] text-[var(--muted)]">
                                    <OrcidIdIcon className="h-3 w-3 opacity-40" />
                                    Add ORCID to show the iD
                                  </span>
                                )}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    {previewAuthors.length > 0 ? (
                      <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface)]/70 px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                          Name line preview
                        </p>
                        <p className="mt-1.5 text-[13.5px] leading-relaxed">
                          <AuthorOrcidLine authors={previewAuthors} />
                        </p>
                      </div>
                    ) : null}
                  </div>
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
                  <RichTextField
                    label="Abstract"
                    value={form.abstract}
                    onChange={(abstract) =>
                      setForm((f) => ({ ...f, abstract }))
                    }
                    hint="Pre-filled from the accepted submission. Use the toolbar to bold, italicize, or justify."
                  />
                  <label className="field">
                    <span>Keywords (comma-separated)</span>
                    <input
                      value={form.keywords}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, keywords: e.target.value }))
                      }
                    />
                  </label>

                      <div className="overflow-visible rounded-xl border border-[var(--line)] bg-[#e8edf2] p-3 sm:p-4">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                          Journal template · header through abstract
                        </p>
                        <NahdaArticleTemplate
                          journalTitle={selected.journal.title}
                          journalShortTitle={selected.journal.shortTitle}
                          journalSlug={selected.journal.slug}
                          coverColor={selected.journal.coverColor}
                          journalUrl={`/journals/${selected.journal.slug}`}
                          articleUrl={`/articles/${slugify(form.title)}`}
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
                          receivedAt={previewDates.receivedAt}
                          acceptedAt={previewDates.acceptedAt}
                          publishedAt={previewDates.publishedAt}
                          license={form.license}
                          openAccess={form.openAccess}
                          logoUrl={
                            form.logoUrl ||
                            selected.journal.coverImageUrl ||
                            null
                          }
                          funding={selected.funding}
                          conflictOfInterest={selected.conflictOfInterest}
                          body={undefined}
                        />
                      </div>

                      <div className="space-y-3 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)]/60 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-[var(--ink)]">
                              Introduction to References
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--muted)]">
                              Import Word or Google Docs into the body only.
                              Title, authors, abstract, and keywords stay on
                              this journal&apos;s template. The public download
                              is a Nahda PDF generated from this layout — never
                              the original file.
                              {selected.manuscriptReadyAt
                                ? " A draft is already loaded from Full manuscripts."
                                : selected.productionBody?.trim()
                                  ? " A saved body is loaded."
                                  : ""}
                            </p>
                          </div>
                          <Link
                            href={`/admin/manuscripts?id=${selected.id}`}
                            className="btn-secondary !px-3 !py-2 text-xs"
                          >
                            Open Full manuscripts
                          </Link>
                        </div>
                        <ManuscriptImportPanel
                          hasExistingBody={Boolean(htmlToPlainText(form.body))}
                          onError={setError}
                          onImported={(result) =>
                            setForm((f) => ({
                              ...f,
                              body: result.body,
                              figures: result.figures,
                            }))
                          }
                        />
                        <ManuscriptEditor
                          key={selected.id}
                          value={form.body}
                          onChange={(body) =>
                            setForm((f) => ({ ...f, body }))
                          }
                          figures={form.figures}
                          onFiguresChange={(figures) =>
                            setForm((f) => ({ ...f, figures }))
                          }
                          onError={setError}
                          rows={12}
                          showImport={false}
                          journalPrimary={
                            journalArticlePalette(
                              selected.journal.coverColor,
                              selected.journal.slug ||
                                selected.journal.shortTitle,
                            ).primary
                          }
                          label="Imported body"
                          hint="Select a heading, then pick a color. The first swatch restores the journal color. The journal template above stays bound to this paper."
                        />
                      </div>
                    </div>

                    <aside className="order-1 space-y-3 lg:sticky lg:top-4 lg:order-2 lg:max-h-[calc(100vh-1.5rem)] lg:overflow-y-auto">
                      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)]/50 p-4">
                        <p className="text-xs font-semibold text-[var(--ink)]">
                          PDF for authors
                        </p>
                        <p className="mt-1 text-[11px] text-[var(--muted)]">
                          The published file is bound to the article page.
                          Authors get the site article link and PDF download in
                          email — not a raw Cloudinary URL.
                        </p>
                        <div className="mt-3 flex flex-col gap-2">
                          <label className="btn-primary cursor-pointer !px-3 !py-2 text-center text-xs">
                            {uploadingPdf && pdfKind !== "generated"
                              ? "Uploading…"
                              : "Upload cleaned Print PDF"}
                            <input
                              type="file"
                              accept="application/pdf,.pdf"
                              className="hidden"
                              disabled={uploadingPdf || publishing}
                              onChange={(e) => {
                                const input = e.currentTarget;
                                void onPdfUpload(input.files?.[0] ?? null);
                              }}
                            />
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn-secondary !px-3 !py-2 text-xs"
                              onClick={printPreview}
                            >
                              Print preview
                            </button>
                            <button
                              type="button"
                              className="btn-secondary !px-3 !py-2 text-xs"
                              disabled={uploadingPdf || publishing}
                              onClick={() => void onGeneratePdf()}
                            >
                              {uploadingPdf && pdfKind === "generated"
                                ? "Generating PDF…"
                                : "Proof generated PDF"}
                            </button>
                          </div>
                        </div>
                        {form.pdfUrl ? (
                          <p className="mt-2 text-[11px] text-emerald-800">
                            {pdfKind === "uploaded"
                              ? `Uploaded${uploadedPdfName ? ` (${uploadedPdfName})` : ""} ready: `
                              : "Generated PDF ready: "}
                            <a
                              href={form.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold underline"
                            >
                              open file
                            </a>
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-4">
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
                        <label className="field">
                          <span>DOI (auto-assigned)</span>
                          <input
                            value={form.doi}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, doi: e.target.value }))
                            }
                            placeholder="10.58000/ajs.2026.0142"
                          />
                          <p className="text-[11px] text-[var(--muted)]">
                            Assigned on publish
                            {form.doi ? (
                              <>
                                {" "}
                                ·{" "}
                                <code className="rounded bg-[var(--surface)] px-1">
                                  /doi/{form.doi}
                                </code>
                              </>
                            ) : null}
                          </p>
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                          <label className="field">
                            <span>Received</span>
                            <input
                              type="date"
                              value={form.receivedAt}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  receivedAt: e.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Accepted</span>
                            <input
                              type="date"
                              value={form.acceptedAt}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  acceptedAt: e.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Published</span>
                            <input
                              type="date"
                              value={form.publishedAt}
                              onChange={(e) => {
                                const publishedAt = e.target.value;
                                const placement = numberedIssuePlacement({
                                  publishedAt: publishedAt || new Date(),
                                  frequency: selected.journal.frequency,
                                  foundedYear: selected.journal.foundedYear,
                                });
                                setForm((f) => ({
                                  ...f,
                                  publishedAt,
                                  volume: placement.volume,
                                  issue: placement.issue,
                                }));
                              }}
                            />
                          </label>
                          <label className="field">
                            <span>
                              ISSN{" "}
                              <span className="font-normal text-[var(--muted)]">
                                (optional)
                              </span>
                            </span>
                            <input
                              value={form.issn}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  issn: e.target.value,
                                }))
                              }
                              placeholder="Not assigned yet"
                              autoComplete="off"
                            />
                          </label>
                        </div>
                        <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)]/40 p-3">
                          <p className="text-xs font-semibold text-[var(--ink)]">
                            Issue assignment
                          </p>
                          <p className="text-[11px] leading-relaxed text-[var(--muted)]">
                            Volume and issue number follow the publish date and{" "}
                            {selected.journal.frequency?.toLowerCase() ||
                              "the"}{" "}
                            schedule of{" "}
                            <strong>{selected.journal.title}</strong>.
                          </p>
                          {selectedJournalIssues.length > 0 ? (
                            <label className="field">
                              <span>Existing issues in this journal</span>
                              <select
                                value={
                                  matchedIssue
                                    ? `${matchedIssue.journalId}::${matchedIssue.key}`
                                    : "__date__"
                                }
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "__date__") {
                                    const placement = numberedIssuePlacement({
                                      publishedAt:
                                        form.publishedAt || new Date(),
                                      frequency: selected.journal.frequency,
                                      foundedYear:
                                        selected.journal.foundedYear,
                                    });
                                    setForm((f) => ({
                                      ...f,
                                      volume: placement.volume,
                                      issue: placement.issue,
                                    }));
                                    return;
                                  }
                                  const found = selectedJournalIssues.find(
                                    (row) =>
                                      `${row.journalId}::${row.key}` === value,
                                  );
                                  if (!found) return;
                                  setForm((f) => ({
                                    ...f,
                                    volume:
                                      found.volume && found.volume !== "—"
                                        ? found.volume
                                        : "",
                                    issue:
                                      found.issue && found.issue !== "—"
                                        ? found.issue
                                        : "",
                                  }));
                                }}
                              >
                                <option value="__date__">
                                  Issue for this publish date
                                  {suggestedPlacement
                                    ? ` (Vol. ${suggestedPlacement.volume} · Issue ${suggestedPlacement.issue})`
                                    : ""}
                                </option>
                                {selectedJournalIssues.map((row) => (
                                  <option
                                    key={`${row.journalId}-${row.key}`}
                                    value={`${row.journalId}::${row.key}`}
                                  >
                                    {row.title} · {row.intervalLabel} ·{" "}
                                    {row.articleCount} article
                                    {row.articleCount === 1 ? "" : "s"}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}
                          <p className="rounded-lg bg-white px-3 py-2 text-[11px] leading-relaxed text-[var(--muted)] ring-1 ring-[var(--line)]">
                            {matchedIssue
                              ? `Will be added to ${matchedIssue.title} (${matchedIssue.intervalLabel}). Currently ${matchedIssue.articleCount} article${matchedIssue.articleCount === 1 ? "" : "s"}; this publish makes ${matchedIssue.articleCount + 1}.`
                              : suggestedPlacement
                                ? `Will count toward Vol. ${suggestedPlacement.volume} · Issue ${suggestedPlacement.issue} of ${selected.journal.title}.`
                                : "Set a volume and issue number."}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="field">
                            <span>Volume</span>
                            <input
                              value={form.volume}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  volume: e.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Issue</span>
                            <input
                              value={form.issue}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  issue: e.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className="field">
                            <span>Pages</span>
                            <input
                              value={form.pages}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  pages: e.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className="field">
                            <span>License</span>
                            <input
                              value={form.license}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  license: e.target.value,
                                }))
                              }
                            />
                          </label>
                        </div>
                        <div className="flex flex-col gap-2 text-sm">
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
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setPane("preview")}
                        >
                          Preview template
                        </button>
                        {pdfKind === "uploaded" && form.pdfUrl ? (
                          <button
                            type="button"
                            className="btn-primary"
                            disabled={publishing || uploadingPdf}
                            onClick={() => void onPublish("uploaded")}
                          >
                            {uploadedPublishLabel}
                          </button>
                        ) : (
                          <label
                            className={`btn-primary cursor-pointer text-center ${
                              publishing || uploadingPdf
                                ? "pointer-events-none opacity-60"
                                : ""
                            }`}
                          >
                            {uploadingPdf && pdfKind !== "generated"
                              ? "Uploading PDF…"
                              : uploadedPublishLabel}
                            <input
                              ref={cleanedPdfInputRef}
                              type="file"
                              accept="application/pdf,.pdf"
                              className="hidden"
                              disabled={publishing || uploadingPdf}
                              onChange={(e) =>
                                void onUploadAndPublish(
                                  e.currentTarget.files?.[0] ?? null,
                                )
                              }
                            />
                          </label>
                        )}
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={publishing || uploadingPdf}
                          onClick={() => void onPublish("generated")}
                        >
                          {generatedPublishLabel}
                        </button>
                      </div>
                    </aside>
                  </div>
                </form>
              ) : (
                <div className="mt-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
                    <p className="text-xs text-[var(--muted)]">
                      Live preview updates from your edits. Switch back to Edit
                      details anytime.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-secondary !px-3 !py-2 text-xs"
                        onClick={() => setPane("edit")}
                      >
                        Back to edit
                      </button>
                      {pdfKind === "uploaded" && form.pdfUrl ? (
                        <button
                          type="button"
                          className="btn-primary !px-3 !py-2 text-xs"
                          disabled={publishing || uploadingPdf}
                          onClick={() => void onPublish("uploaded")}
                        >
                          {uploadedPublishLabel}
                        </button>
                      ) : (
                        <label
                          className={`btn-primary cursor-pointer !px-3 !py-2 text-center text-xs ${
                            publishing || uploadingPdf
                              ? "pointer-events-none opacity-60"
                              : ""
                          }`}
                        >
                          {uploadingPdf && pdfKind !== "generated"
                            ? "Uploading PDF…"
                            : uploadedPublishLabel}
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            className="hidden"
                            disabled={publishing || uploadingPdf}
                            onChange={(e) =>
                              void onUploadAndPublish(
                                e.currentTarget.files?.[0] ?? null,
                              )
                            }
                          />
                        </label>
                      )}
                      <button
                        type="button"
                        className="btn-secondary !px-3 !py-2 text-xs"
                        disabled={publishing || uploadingPdf}
                        onClick={() => void onPublish("generated")}
                      >
                        {generatedPublishLabel}
                      </button>
                    </div>
                  </div>
                  <div className="overflow-visible rounded-xl border border-[var(--line)] bg-[#e8edf2] p-4 sm:p-6 print:rounded-none print:border-0 print:bg-white print:p-0">
                    <NahdaArticleTemplate
                      journalTitle={selected.journal.title}
                      journalShortTitle={selected.journal.shortTitle}
                      journalSlug={selected.journal.slug}
                      coverColor={selected.journal.coverColor}
                      journalUrl={`/journals/${selected.journal.slug}`}
                      articleUrl={`/articles/${slugify(form.title)}`}
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
                      receivedAt={previewDates.receivedAt}
                      acceptedAt={previewDates.acceptedAt}
                      publishedAt={previewDates.publishedAt}
                      license={form.license}
                      openAccess={form.openAccess}
                      logoUrl={
                        form.logoUrl || selected.journal.coverImageUrl || null
                      }
                      funding={selected.funding}
                      conflictOfInterest={selected.conflictOfInterest}
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
      {selected && captureTemplate
        ? createPortal(
            <div
              ref={pdfSourceRef}
              className="nahda-pdf-source nahda-pdf-print"
              aria-hidden
            >
              {captureTemplate}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
