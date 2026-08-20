"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAutosave } from "@/hooks/use-autosave";
import { NahdaArticleTemplate } from "@/components/atlas-article-template";
import {
  ManuscriptEditor,
  type ManuscriptFigure,
} from "@/components/manuscript-editor";
import { ManuscriptImportPanel } from "@/components/manuscript-import";
import { NahdaLoader } from "@/components/nahda-loader";
import { formatAuthorWithOrcid, parseAuthorOrcid } from "@/lib/orcid";
import { htmlToPlainText } from "@/lib/import-manuscript";
import { journalArticlePalette } from "@/lib/journal-colors";

type QueueItem = {
  id: string;
  manuscriptId: string;
  title: string;
  abstract: string;
  keywords: string[];
  articleType: string;
  status: string;
  progress: number;
  submittedAt?: string;
  manuscriptUrl?: string | null;
  productionBody?: string | null;
  productionFigures?: ManuscriptFigure[] | null;
  manuscriptReadyAt?: string | null;
  funding?: string | null;
  conflictOfInterest?: string | null;
  authorsJson?: {
    name?: string;
    affiliation?: string;
    orcid?: string | null;
  }[] | null;
  journal: {
    id: string;
    title: string;
    shortTitle: string;
    slug?: string;
    coverColor?: string;
    coverImageUrl?: string | null;
  };
  author: {
    id: string;
    name: string;
    email: string;
    institution?: string | null;
    orcid?: string | null;
  };
};

function authorsForTemplate(sub: QueueItem): string[] {
  if (Array.isArray(sub.authorsJson) && sub.authorsJson.length > 0) {
    const rows = sub.authorsJson
      .map((a, i) => {
        const parsed = parseAuthorOrcid(a.name ?? "");
        if (!parsed.name) return "";
        const orcid = a.orcid || parsed.orcid || (i === 0 ? sub.author.orcid : null);
        return formatAuthorWithOrcid(parsed.name, orcid);
      })
      .filter(Boolean);
    if (rows.length) return rows;
  }
  return [formatAuthorWithOrcid(sub.author.name, sub.author.orcid)];
}

function affiliationsForTemplate(sub: QueueItem): string[] {
  if (Array.isArray(sub.authorsJson) && sub.authorsJson.length > 0) {
    const list = sub.authorsJson
      .map((a) => a.affiliation?.trim())
      .filter((v): v is string => Boolean(v));
    if (list.length) return list;
  }
  return sub.author.institution ? [sub.author.institution] : [];
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

function ManuscriptsPageInner() {
  const searchParams = useSearchParams();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [abstractText, setAbstractText] = useState("");
  const [keywords, setKeywords] = useState("");
  const [body, setBody] = useState("");
  const [figures, setFigures] = useState<ManuscriptFigure[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autosaveNote, setAutosaveNote] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  const selected = useMemo(
    () => queue.find((q) => q.id === selectedId) ?? null,
    [queue, selectedId],
  );

  const draftRef = useRef({
    selectedId,
    title,
    abstractText,
    keywords,
    body,
    figures,
    dirty,
  });
  useEffect(() => {
    draftRef.current = {
      selectedId,
      title,
      abstractText,
      keywords,
      body,
      figures,
      dirty,
    };
  });

  const persist = useCallback(async (opts: { done: boolean; silent?: boolean }) => {
    const draft = draftRef.current;
    if (!draft.selectedId) return;
    if (!opts.silent) {
      if (!draft.title.trim()) {
        setError("Title from the submission is required.");
        return;
      }
      if (!draft.abstractText.trim()) {
        setError("Abstract from the submission is required.");
        return;
      }
      if (!htmlToPlainText(draft.body)) {
        setError(
          "Import the Introduction–References from Word or Google Docs before continuing.",
        );
        return;
      }
    }

    const submissionId = draft.selectedId;
    if (!opts.silent) {
      setSaving(true);
      setError("");
    } else {
      setAutosaveNote("Saving…");
    }

    const payload: Record<string, unknown> = {
      submissionId,
      body: draft.body,
      figures: draft.figures,
      done: opts.done,
      keywords: draft.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    };
    if (draft.title.trim().length >= 2) payload.title = draft.title.trim();
    if (draft.abstractText.trim().length >= 10) {
      payload.abstract = draft.abstractText.trim();
    }

    try {
      const res = await fetch("/api/admin/manuscripts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        keepalive: Boolean(opts.silent),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      if (draftRef.current.selectedId !== submissionId) return;

      setDirty(false);
      setAutosaveNote("Saved");
      setQueue((prev) =>
        prev.map((q) =>
          q.id === submissionId
            ? {
                ...q,
                title: data.submission?.title ?? draft.title.trim(),
                abstract: data.submission?.abstract ?? draft.abstractText.trim(),
                keywords: data.submission?.keywords ?? q.keywords,
                productionBody: draft.body,
                productionFigures: draft.figures,
                manuscriptReadyAt:
                  data.submission?.manuscriptReadyAt ?? q.manuscriptReadyAt,
                status: data.submission?.status ?? q.status,
              }
            : q,
        ),
      );

      if (opts.done) {
        window.location.assign(
          data.publishUrl || `/admin/publishedArticles?id=${submissionId}`,
        );
        return;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      if (opts.silent) setAutosaveNote("Couldn’t autosave");
      else setError(message);
      if (!opts.silent) setSaving(false);
      return;
    }
    if (!opts.silent) setSaving(false);
  }, []);

  useAutosave({
    enabled: Boolean(selectedId),
    dirty,
    delayMs: 1200,
    save: () => persist({ done: false, silent: true }),
  });

  function selectItem(sub: QueueItem) {
    if (draftRef.current.dirty && draftRef.current.selectedId) {
      void persist({ done: false, silent: true });
    }
    setSelectedId(sub.id);
    setError("");
    setAutosaveNote("");
    setTitle(sub.title?.trim() || "");
    setAbstractText(sub.abstract?.trim() || "");
    setKeywords((sub.keywords ?? []).join(", "));
    setBody(sub.productionBody?.trim() ? sub.productionBody : "");
    setFigures(parseFigures(sub.productionFigures));
    setDirty(false);
  }

  async function load(preferId?: string | null) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/manuscripts${preferId || searchParams.get("id") ? `?id=${encodeURIComponent(preferId || searchParams.get("id") || "")}` : ""}`,
        { cache: "no-store" },
      );
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        setError("Manuscripts API did not return JSON. Restart the server.");
        setQueue([]);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load queue");
        setQueue([]);
        return;
      }
      const next: QueueItem[] = data.queue ?? [];
      setQueue(next);

      const targetId = preferId || searchParams.get("id") || selectedId;
      if (targetId) {
        const match = next.find((q) => q.id === targetId);
        if (match) selectItem(match);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue");
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(opts: { done: boolean }) {
    await persist({ done: opts.done, silent: false });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)] sm:text-3xl">
          Full manuscripts
        </h1>
        <p className="text-xs text-[var(--muted)]">
          {queue.length} paper{queue.length === 1 ? "" : "s"} · This journal’s
          template holds the header; import Word or Google Docs, then edit
          Introduction–References
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside>
          {loading && <NahdaLoader variant="inline" label="Loading queue…" />}
          {!loading && queue.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              No accepted papers yet. Accept one from the inbox first.
            </p>
          )}
          <ul className="space-y-1">
            {queue.map((sub) => {
              const active = sub.id === selectedId;
              return (
                <li key={sub.id}>
                  <button
                    type="button"
                    onClick={() => selectItem(sub)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left transition ${
                      active
                        ? "bg-[var(--accent-soft)] text-[var(--ink)]"
                        : "text-[var(--ink)] hover:bg-white"
                    }`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                      {sub.manuscriptId}
                      {sub.manuscriptReadyAt ? " · Ready" : ""}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm font-medium">
                      {sub.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                      {sub.author.name}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section>
          {!selected ? (
            <p className="py-16 text-center text-sm text-[var(--muted)]">
              Select a manuscript to start editing.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                    From accepted submission
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {selected.manuscriptId} · {selected.author.name}
                    {dirty
                      ? " · Unsaved"
                      : autosaveNote
                        ? ` · ${autosaveNote}`
                        : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selected.manuscriptUrl && (
                    <a
                      href={`/api/files/view?url=${encodeURIComponent(selected.manuscriptUrl)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[var(--accent)] underline"
                    >
                      Original file
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn-secondary !px-3 !py-2 text-xs"
                    disabled={saving || !dirty}
                    onClick={() => void save({ done: false })}
                  >
                    {saving && dirty ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    className="btn-primary !px-3 !py-2 text-xs"
                    disabled={saving}
                    onClick={() => void save({ done: true })}
                  >
                    {saving ? "Saving…" : "Done — go to Publish"}
                  </button>
                </div>
              </div>

              <div className="overflow-visible rounded-xl border border-[var(--line)] bg-[#e8edf2] p-3 sm:p-5">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  Journal template · header through abstract
                </p>
                <NahdaArticleTemplate
                  journalTitle={selected.journal.title}
                  journalShortTitle={selected.journal.shortTitle}
                  journalSlug={selected.journal.slug}
                  coverColor={selected.journal.coverColor}
                  logoUrl={selected.journal.coverImageUrl || null}
                  journalUrl={
                    selected.journal.slug
                      ? `/journals/${selected.journal.slug}`
                      : undefined
                  }
                  manuscriptId={selected.manuscriptId}
                  title={title}
                  authors={authorsForTemplate(selected)}
                  affiliations={affiliationsForTemplate(selected)}
                  abstract={abstractText}
                  keywords={keywords
                    .split(",")
                    .map((k) => k.trim())
                    .filter(Boolean)}
                  articleType={selected.articleType}
                  receivedAt={selected.submittedAt}
                  funding={selected.funding}
                  conflictOfInterest={selected.conflictOfInterest}
                />
              </div>

              <details className="rounded-xl border border-[var(--line)] bg-white p-4">
                <summary className="cursor-pointer text-sm font-medium text-[var(--ink)]">
                  Edit title, abstract, and keywords
                </summary>
                <div className="mt-3 space-y-3">
                <label className="field">
                  <span>Title</span>
                  <input
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="Loaded from the submitted manuscript"
                  />
                </label>
                <label className="field">
                  <span>Abstract</span>
                  <textarea
                    rows={5}
                    value={abstractText}
                    onChange={(e) => {
                      setAbstractText(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="Loaded from the submitted manuscript"
                  />
                </label>
                <label className="field">
                  <span>Keywords (comma-separated)</span>
                  <input
                    value={keywords}
                    onChange={(e) => {
                      setKeywords(e.target.value);
                      setDirty(true);
                    }}
                  />
                </label>
                </div>
              </details>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">
                    Introduction to References
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
                    Upload a Word file or a shared Google Doc. Title, authors,
                    abstract, and keywords stay on this journal&apos;s template.
                    After import you can bold, color, and tidy the body here.
                  </p>
                </div>
                <ManuscriptImportPanel
                  hasExistingBody={Boolean(htmlToPlainText(body))}
                  onError={setError}
                  onImported={(result) => {
                    setBody(result.body);
                    setFigures(result.figures);
                    setDirty(true);
                  }}
                />
                <ManuscriptEditor
                  key={selected.id}
                  value={body}
                  onChange={(next) => {
                    setBody(next);
                    setDirty(true);
                  }}
                  figures={figures}
                  onFiguresChange={(next) => {
                    setFigures(next);
                    setDirty(true);
                  }}
                  onError={setError}
                  rows={18}
                  showImport={false}
                  journalPrimary={
                    journalArticlePalette(
                      selected.journal.coverColor,
                      selected.journal.slug || selected.journal.shortTitle,
                    ).primary
                  }
                  label="Imported body"
                  hint="Select a heading such as Challenges, then pick a color. The first swatch restores the journal color. Title, authors, ORCID, abstract, and keywords stay on the template above."
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <Link
                  href={`/admin/submissions/${selected.id}`}
                  className="text-xs text-[var(--muted)] underline"
                >
                  Back to inbox detail
                </Link>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={saving}
                  onClick={() => void save({ done: true })}
                >
                  {saving ? "Saving…" : "Done — go to Publish"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function ManuscriptsPage() {
  return (
    <Suspense
      fallback={<NahdaLoader variant="panel" label="Loading manuscripts…" />}
    >
      <ManuscriptsPageInner />
    </Suspense>
  );
}
