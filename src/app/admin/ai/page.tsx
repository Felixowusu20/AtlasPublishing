"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { useAdminAuth } from "@/components/admin-auth-provider";
import { NahdaLoader } from "@/components/nahda-loader";
import {
  REVIEW_STATUS_OPTIONS,
  type AiReviewReport,
  type ReviewDecisionStatus,
} from "@/lib/ai/review-report";

type AiConfig = {
  configured: boolean;
  provider: string | null;
  model: string | null;
};

type PaperOption = {
  id: string;
  manuscriptId: string;
  title: string;
  status: string;
  manuscriptUrl?: string | null;
  journal: { title: string; shortTitle: string };
  author: { name: string; email: string };
  authorsJson?: { name?: string; email?: string }[] | null;
};

type ChatRole = "system" | "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  at: number;
  report?: AiReviewReport;
  progress?: string[];
};

function uid() {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function emailsForPaper(paper: PaperOption): string[] {
  const set = new Set<string>();
  if (paper.author.email) set.add(paper.author.email.trim().toLowerCase());
  for (const row of paper.authorsJson ?? []) {
    if (row.email?.includes("@")) set.add(row.email.trim().toLowerCase());
  }
  return [...set];
}

export default function AdminAiPage() {
  const { user } = useAdminAuth();
  const canManage =
    user?.role === "SUPER_ADMIN" || user?.role === "REVIEWER";

  const [bootLoading, setBootLoading] = useState(true);
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [papers, setPapers] = useState<PaperOption[]>([]);
  const [paperQuery, setPaperQuery] = useState("");
  const [paperId, setPaperId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: "system",
      at: Date.now(),
      text: "Welcome to the Nahda AI review desk. Search and select a submitted paper (or attach its file), then ask me to run the full editorial checklist. I’ll return arranged notes; use After the review to download the letter and email authors with a decision status.",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [latestReport, setLatestReport] = useState<AiReviewReport | null>(
    null,
  );
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [decisionStatus, setDecisionStatus] =
    useState<ReviewDecisionStatus>("MINOR_REVISION");
  const [sendBusy, setSendBusy] = useState(false);
  const [sendNote, setSendNote] = useState("");
  const [exportBusy, setExportBusy] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedPaper = useMemo(
    () => papers.find((p) => p.id === paperId) ?? null,
    [papers, paperId],
  );

  const filteredPapers = useMemo(() => {
    const q = paperQuery.trim().toLowerCase();
    if (!q) return papers;
    return papers.filter((p) => {
      const hay = [
        p.manuscriptId,
        p.title,
        p.status,
        p.author.name,
        p.author.email,
        p.journal.title,
        p.journal.shortTitle,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [papers, paperQuery]);

  const pushMessage = useCallback((msg: Omit<ChatMessage, "id" | "at">) => {
    setMessages((prev) => [...prev, { ...msg, id: uid(), at: Date.now() }]);
  }, []);

  function selectPaper(id: string) {
    setPaperId(id);
    setLatestReport(null);
    setSendNote("");
    setNotifyOpen(false);
    const paper = papers.find((p) => p.id === id);
    if (paper) {
      setPaperQuery("");
      pushMessage({
        role: "system",
        text: `Selected ${paper.manuscriptId} — ${paper.title}`,
      });
    }
  }

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    void (async () => {
      setBootLoading(true);
      try {
        const [statusRes, subsRes] = await Promise.all([
          fetch("/api/admin/ai/status"),
          fetch("/api/admin/submissions"),
        ]);
        const statusData = await statusRes.json();
        const subsData = await subsRes.json();
        if (cancelled) return;
        if (statusRes.ok) setConfig(statusData.config ?? null);
        if (subsRes.ok) {
          const list = (subsData.submissions ?? []) as PaperOption[];
          setPapers(
            list.filter((s) => s.status !== "DRAFT" && s.status !== "PUBLISHED"),
          );
        }
      } catch {
        if (!cancelled) setError("Could not load the AI workspace.");
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManage]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (!selectedPaper || !latestReport) return;
    setSelectedEmails(emailsForPaper(selectedPaper));
    setDecisionStatus(latestReport.recommendedStatus);
  }, [selectedPaper, latestReport]);

  async function runReview(editorPrompt?: string) {
    if (!selectedPaper) {
      setError("Select a submitted paper first.");
      return;
    }
    setError("");
    setSendNote("");
    setBusy(true);
    setLatestReport(null);

    const fileLabel = file?.name ?? null;
    pushMessage({
      role: "user",
      text: [
        `Review ${selectedPaper.manuscriptId}`,
        selectedPaper.title,
        fileLabel ? `Attached: ${fileLabel}` : "Using the submission on file",
        editorPrompt?.trim() ? `Focus: ${editorPrompt.trim()}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    const progressLabels = [
      "Intake triage & ethics screen…",
      "Reviewer match & synthesis…",
      "Revision / production checks…",
      "Publish & APC notes…",
      "Arranging editorial letter…",
    ];
    pushMessage({
      role: "assistant",
      text: "Running the Nahda desk checklist on this paper.",
      progress: progressLabels,
    });

    try {
      // Stagger progress feel without blocking the request start
      await new Promise((r) => setTimeout(r, 600));

      const res = await fetch("/api/admin/ai/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: selectedPaper.id,
          fileName: fileLabel ?? undefined,
          editorPrompt: editorPrompt?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI review failed");

      const report = data.report as AiReviewReport;
      setLatestReport(report);
      pushMessage({
        role: "assistant",
        text: "Desk review complete. Notes are arranged by publishing stage below. Open After the review → Document & author notification to download the letter and email authors.",
        report,
      });
      setNotifyOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI review failed";
      setError(msg);
      pushMessage({
        role: "assistant",
        text: `I couldn’t finish the review: ${msg}`,
      });
    } finally {
      setBusy(false);
      setPrompt("");
    }
  }

  function onComposerSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    void runReview(prompt);
  }

  function onPickFile(list: FileList | null) {
    const next = list?.[0] ?? null;
    if (!next) return;
    setFile(next);
    pushMessage({
      role: "user",
      text: `Uploaded manuscript file: ${next.name}`,
    });
    pushMessage({
      role: "assistant",
      text: "File attached to this chat. Select the matching submission (if not already), then send a message or press Run full review.",
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function exportDoc() {
    if (!latestReport) return;
    setExportBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/ai/export-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: latestReport }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not export document");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safe = latestReport.manuscriptId.replace(/[^A-Za-z0-9._-]+/g, "_");
      a.href = url;
      a.download = `Nahda-AI-Review-${safe}.doc`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      pushMessage({
        role: "system",
        text: `Downloaded Word document for ${latestReport.manuscriptId}.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportBusy(false);
    }
  }

  async function sendReview() {
    if (!selectedPaper || !latestReport || selectedEmails.length === 0) {
      setError("Choose at least one author email and finish a review first.");
      return;
    }
    setSendBusy(true);
    setError("");
    setSendNote("");
    try {
      const res = await fetch("/api/admin/ai/send-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: selectedPaper.id,
          emails: selectedEmails,
          status: decisionStatus,
          report: latestReport,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send review");

      const statusLabel =
        REVIEW_STATUS_OPTIONS.find((s) => s.value === decisionStatus)?.label ??
        decisionStatus;
      const note = data.skipped
        ? `Status set to ${statusLabel}. Email was skipped (SMTP not configured) — dry-run logged.`
        : data.emailed
          ? `Status set to ${statusLabel}. Email sent to ${selectedEmails.join(", ")}.`
          : `Status set to ${statusLabel}. Email could not be delivered.`;
      setSendNote(note);
      pushMessage({ role: "system", text: note });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSendBusy(false);
    }
  }

  function toggleEmail(email: string) {
    setSelectedEmails((prev) =>
      prev.includes(email)
        ? prev.filter((e) => e !== email)
        : [...prev, email],
    );
  }

  if (!canManage) {
    return (
      <p className="rounded-xl border border-[var(--line)] bg-white p-6 text-sm text-[var(--muted)]">
        AI editorial tools are available to editors and super admins.
      </p>
    );
  }

  if (bootLoading) {
    return (
      <div className="py-16">
        <NahdaLoader variant="inline" label="Opening AI review desk…" />
      </div>
    );
  }

  const emailChoices = selectedPaper ? emailsForPaper(selectedPaper) : [];

  return (
    <div className="flex h-full min-h-0 w-full max-w-none flex-col overflow-hidden sm:-mx-1 lg:-mx-2 xl:-mx-4 2xl:-mx-6">
      <div className="relative shrink-0 overflow-hidden rounded-2xl border border-[var(--accent)]/15 bg-[linear-gradient(135deg,var(--accent-soft)_0%,var(--admin-card,var(--paper))_55%,var(--surface)_100%)] px-4 py-3 sm:px-5 sm:py-3.5">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[var(--accent)]/10 blur-2xl"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
              Nahda AI review desk
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)] sm:text-2xl">
              Chat · check · document · notify
            </h1>
            <p className="mt-1 hidden text-sm leading-relaxed text-[var(--muted)] sm:block">
              Search a paper, run the desk checklist in chat, then open After the
              review to download and notify authors.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--admin-card,var(--paper))]/90 px-3 py-2 text-sm shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Model
            </p>
            {config?.configured ? (
              <p className="mt-0.5 font-semibold text-[var(--accent)]">
                {config.provider} · {config.model}
              </p>
            ) : (
              <p className="mt-0.5 font-semibold text-[var(--brand-orange)]">
                Placeholder mode
              </p>
            )}
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-3 shrink-0 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="mt-3 grid min-h-0 flex-1 grid-rows-[minmax(9rem,28%)_minmax(0,1fr)] gap-3 overflow-hidden lg:grid-cols-[minmax(12rem,14rem)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] xl:grid-cols-[minmax(13rem,15rem)_minmax(0,1fr)]">
        {/* Paper rail — own scroll, does not grow the page */}
        <aside className="min-h-0 overflow-y-auto overscroll-contain lg:pr-0.5">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--admin-card,var(--paper))] p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
              Paper in review
            </p>

            <label className="field mt-3">
              <span>Search submitted papers</span>
              <input
                type="search"
                value={paperQuery}
                onChange={(e) => setPaperQuery(e.target.value)}
                placeholder="Manuscript ID, title, author, journal…"
                autoComplete="off"
              />
            </label>

            <div className="mt-2 max-h-36 overflow-y-auto overscroll-contain rounded-xl border border-[var(--line)] bg-[var(--surface)]/50">
              {filteredPapers.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-[var(--muted)]">
                  {papers.length === 0
                    ? "No submissions available."
                    : "No papers match your search."}
                </p>
              ) : (
                <ul className="divide-y divide-[var(--line)]">
                  {filteredPapers.slice(0, 40).map((p) => {
                    const active = p.id === paperId;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => selectPaper(p.id)}
                          className={`w-full px-3 py-2.5 text-left transition ${
                            active
                              ? "bg-[var(--accent-soft)]"
                              : "bg-[var(--admin-card,var(--paper))] hover:bg-[var(--accent-soft)]/50"
                          }`}
                        >
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-[var(--accent)]">
                            {p.manuscriptId}
                            {active ? " · selected" : ""}
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-xs font-semibold text-[var(--ink)]">
                            {p.title}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-[var(--muted)]">
                            {p.author.name} · {p.journal.shortTitle}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {paperQuery.trim() && filteredPapers.length > 40 ? (
              <p className="mt-1.5 text-[10px] text-[var(--muted)]">
                Showing first 40 matches — refine your search.
              </p>
            ) : null}

            {selectedPaper ? (
              <div className="mt-3 rounded-xl bg-[var(--accent-soft)]/70 px-3 py-2.5 text-xs leading-relaxed text-[var(--ink)]">
                <p className="font-semibold">{selectedPaper.author.name}</p>
                <p className="text-[var(--muted)]">{selectedPaper.author.email}</p>
                <p className="mt-1 text-[var(--muted)]">
                  {selectedPaper.journal.shortTitle} · {selectedPaper.status}
                </p>
                {selectedPaper.manuscriptUrl ? (
                  <a
                    href={selectedPaper.manuscriptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block font-semibold text-[var(--accent)] hover:underline"
                  >
                    Open stored file →
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-xs text-[var(--muted)]">
                Search and tap a paper to ground the AI review.
              </p>
            )}

            <div className="mt-4">
              <p className="text-xs font-medium text-[var(--ink)]">
                Or upload a copy into chat
              </p>
              <button
                type="button"
                className="mt-2 flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-[var(--accent)]/35 bg-[var(--surface)]/50 px-3 py-4 text-center transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="text-sm font-semibold text-[var(--accent)]">
                  Select file to attach
                </span>
                <span className="mt-1 text-[11px] text-[var(--muted)]">
                  PDF, DOC, DOCX — for desk context
                </span>
                {file ? (
                  <span className="mt-2 max-w-full truncate text-[11px] font-medium text-[var(--ink)]">
                    {file.name}
                  </span>
                ) : null}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files)}
              />
            </div>

            <button
              type="button"
              disabled={busy || !paperId}
              className="btn-primary mt-4 w-full !py-2.5 text-xs disabled:opacity-50"
              onClick={() => void runReview(prompt)}
            >
              {busy ? "Reviewing…" : "Run full desk review"}
            </button>

            {latestReport ? (
              <button
                type="button"
                className="mt-2 w-full rounded-xl bg-[var(--ink)] px-3 py-3 text-left text-white shadow-sm transition hover:bg-[#16324d]"
                onClick={() => setNotifyOpen(true)}
              >
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-white/65">
                  After the review
                </span>
                <span className="mt-0.5 block text-sm font-semibold">
                  Document & author notification
                </span>
                <span className="mt-1 block text-[11px] text-white/70">
                  Download the letter, pick authors, set status, send
                </span>
              </button>
            ) : null}

            <Link
              href="/admin/submissions"
              className="mt-2 block text-center text-[11px] font-semibold text-[var(--accent)] hover:underline"
            >
              Open submission inbox
            </Link>
          </div>
        </aside>

        {/* Chat column — only the message list scrolls */}
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--admin-card,var(--paper))] shadow-sm">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--accent-soft)]/50 px-4 py-2.5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
                Review chat
              </p>
              <p className="text-xs text-[var(--muted)]">
                Conversation with Nahda AI Assist
              </p>
            </div>
            {busy ? (
              <span className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                Working
              </span>
            ) : null}
          </div>

          <div
            ref={scrollerRef}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-[var(--surface)]/35 px-3 py-4 sm:px-5 sm:py-5"
          >
            {messages.map((m) => (
              <ChatBubble
                key={m.id}
                message={m}
                onNotify={() => setNotifyOpen(true)}
              />
            ))}
          </div>

          <form
            onSubmit={onComposerSubmit}
            className="shrink-0 border-t border-[var(--line)] bg-[var(--admin-card,var(--paper))] p-3 sm:p-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="field min-w-0 flex-1">
                <span className="sr-only">Message</span>
                <textarea
                  rows={2}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    selectedPaper
                      ? "Optional focus for the model — e.g. “emphasize methods novelty and figure captions”"
                      : "Select a paper first, then describe what to emphasize…"
                  }
                  className="mt-0 resize-none"
                  disabled={busy}
                />
              </label>
              <button
                type="submit"
                disabled={busy || !paperId}
                className="btn-primary shrink-0 !px-4 !py-2.5 text-xs disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* CTA after review — opens notification modal */}
      {latestReport ? (
        <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--admin-card,var(--paper))] px-4 py-3 shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
              Review ready
            </p>
            <p className="mt-0.5 text-sm font-semibold text-[var(--ink)]">
              {latestReport.manuscriptId} — open document & author notification
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl bg-[var(--ink)] px-4 py-3 text-left text-white shadow-sm transition hover:bg-[#16324d]"
            onClick={() => setNotifyOpen(true)}
          >
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-white/65">
              After the review
            </span>
            <span className="block text-sm font-semibold">
              Document & author notification
            </span>
          </button>
        </div>
      ) : null}

      {notifyOpen && latestReport && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[220] flex items-end justify-center bg-[var(--ink)]/55 p-0 sm:items-center sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ai-notify-title"
              onClick={(e) => {
                if (e.target === e.currentTarget && !sendBusy && !exportBusy) {
                  setNotifyOpen(false);
                }
              }}
            >
              <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-[var(--admin-card,var(--paper))] text-[var(--ink)] shadow-2xl sm:rounded-2xl">
                <div className="shrink-0 border-b border-[var(--line)] bg-[var(--ink)] px-5 py-4 text-[var(--paper)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--paper)]/65">
                        After the review
                      </p>
                      <h2
                        id="ai-notify-title"
                        className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--paper)]"
                      >
                        Document & author notification
                      </h2>
                      <p className="mt-1 text-sm text-[var(--paper)]/75">
                        {latestReport.manuscriptId} · download the letter, choose
                        authors, set status, then send.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg bg-[var(--paper)]/10 px-2.5 py-1.5 text-xs font-semibold text-[var(--paper)] hover:bg-[var(--paper)]/20"
                      disabled={sendBusy || exportBusy}
                      onClick={() => setNotifyOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--ink)]">
                      1 · Download review letter
                    </h3>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Word-compatible .doc with every stage, finding, and editor
                      note.
                    </p>
                    <button
                      type="button"
                      disabled={exportBusy}
                      className="btn-secondary mt-3 !px-3.5 !py-2 text-xs disabled:opacity-50"
                      onClick={() => void exportDoc()}
                    >
                      {exportBusy ? "Preparing…" : "Download .doc review letter"}
                    </button>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-[var(--ink)]">
                      2 · Review status
                    </h3>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Applied to the submission when you send the letter.
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {REVIEW_STATUS_OPTIONS.map((opt) => {
                        const active = decisionStatus === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setDecisionStatus(opt.value)}
                            className={`rounded-xl border px-3 py-2.5 text-left transition ${
                              active
                                ? "border-[var(--accent)] bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]"
                                : "border-[var(--line)] bg-[var(--admin-card,var(--paper))] hover:border-[var(--accent)]/40"
                            }`}
                          >
                            <span className="block text-xs font-semibold text-[var(--ink)]">
                              {opt.label}
                            </span>
                            <span className="mt-0.5 block text-[10px] text-[var(--muted)]">
                              {opt.hint}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-[var(--ink)]">
                      3 · Author emails
                    </h3>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Select who should receive this decision letter.
                    </p>
                    {emailChoices.length === 0 ? (
                      <p className="mt-3 text-xs text-[var(--muted)]">
                        No emails on this submission.
                      </p>
                    ) : (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {emailChoices.map((email) => {
                          const on = selectedEmails.includes(email);
                          const isPrimary =
                            email ===
                            (selectedPaper?.author.email ?? "")
                              .trim()
                              .toLowerCase();
                          return (
                            <li key={email}>
                              <button
                                type="button"
                                onClick={() => toggleEmail(email)}
                                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                  on
                                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                                    : "border-[var(--line)] bg-[var(--admin-card,var(--paper))] text-[var(--ink)] hover:border-[var(--accent)]/40"
                                }`}
                              >
                                {email}
                                {isPrimary ? " · corresponding" : ""}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  {sendNote ? (
                    <p className="rounded-lg border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--accent)]">
                      {sendNote}
                    </p>
                  ) : null}
                </div>

                <div className="shrink-0 border-t border-[var(--line)] bg-[var(--surface)]/50 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      className="btn-secondary !px-3.5 !py-2 text-xs"
                      disabled={sendBusy || exportBusy}
                      onClick={() => setNotifyOpen(false)}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      disabled={
                        sendBusy ||
                        selectedEmails.length === 0 ||
                        !latestReport ||
                        !selectedPaper
                      }
                      className="btn-primary !px-4 !py-2.5 text-xs disabled:opacity-50"
                      onClick={() => void sendReview()}
                    >
                      {sendBusy ? "Sending…" : "Send letter & apply status"}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function ChatBubble({
  message,
  onNotify,
}: {
  message: ChatMessage;
  onNotify?: () => void;
}) {
  if (message.role === "system") {
    return (
      <div className="mx-auto w-full max-w-4xl rounded-xl border border-dashed border-[var(--accent)]/25 bg-[var(--admin-card,var(--paper))]/80 px-4 py-3 text-center text-xs leading-relaxed text-[var(--muted)]">
        {message.text}
      </div>
    );
  }

  const mine = message.role === "user";
  const wideReport = Boolean(message.report);
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:px-5 sm:py-4 ${
          mine
            ? "max-w-[min(100%,36rem)] rounded-br-md bg-[var(--accent)] text-white"
            : wideReport
              ? "w-full max-w-none rounded-bl-md border border-[var(--line)] bg-[var(--admin-card,var(--paper))] text-[var(--ink)]"
              : "max-w-[min(100%,52rem)] rounded-bl-md border border-[var(--line)] bg-[var(--admin-card,var(--paper))] text-[var(--ink)]"
        }`}
      >
        {!mine ? (
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
            Nahda AI
          </p>
        ) : null}
        <p className="whitespace-pre-wrap text-[13px] sm:text-sm">{message.text}</p>

        {message.progress?.length ? (
          <ul className="mt-3 space-y-1.5 border-t border-[var(--line)] pt-3">
            {message.progress.map((step, i) => (
              <li
                key={step}
                className="flex items-center gap-2 text-xs text-[var(--muted)]"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--accent)]">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        ) : null}

        {message.report ? (
          <ReportCard report={message.report} onNotify={onNotify} />
        ) : null}
      </div>
    </div>
  );
}

function ReportCard({
  report,
  onNotify,
}: {
  report: AiReviewReport;
  onNotify?: () => void;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]/70">
      <div className="border-b border-[var(--line)] bg-[var(--accent-soft)] px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
          Arranged editorial notes
        </p>
        <p className="mt-0.5 text-sm font-semibold text-[var(--ink)]">
          {report.manuscriptId} · recommended{" "}
          <span className="text-[var(--accent)]">
            {report.recommendedStatus.replace(/_/g, " ")}
          </span>
        </p>
      </div>
      <div className="max-h-[min(42rem,72vh)] space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          {report.overallSummary}
        </p>
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {report.sections.map((section) => (
            <article
              key={section.toolId}
              className="rounded-lg border border-[var(--line)] bg-[var(--admin-card,var(--paper))] p-3.5 sm:p-4"
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--accent)]">
                {section.stageLabel}
              </p>
              <h4 className="mt-1 text-[15px] font-semibold text-[var(--ink)]">
                {section.title}
              </h4>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">
                {section.summary}
              </p>
              <ul className="mt-3 space-y-1.5">
                {section.findings.map((f) => (
                  <li
                    key={f}
                    className="flex gap-2 text-xs leading-snug text-[var(--ink)] sm:text-[13px]"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-orange)]" />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="mt-3 rounded-md bg-[var(--accent-soft)] px-2.5 py-2 text-xs leading-relaxed text-[var(--accent)]">
                <span className="font-semibold">Editor note:</span>{" "}
                {section.editorNote}
              </p>
            </article>
          ))}
        </div>
        <p className="text-xs italic leading-relaxed text-[var(--muted)] sm:text-[13px]">
          {report.closingNote}
        </p>
        {onNotify ? (
          <button
            type="button"
            onClick={onNotify}
            className="w-full rounded-xl bg-[var(--ink)] px-3 py-3.5 text-left text-[var(--paper)] transition hover:opacity-90"
          >
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] opacity-65">
              After the review
            </span>
            <span className="block text-sm font-semibold">
              Document & author notification
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
