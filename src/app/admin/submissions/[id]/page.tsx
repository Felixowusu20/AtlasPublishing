"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, use } from "react";
import { ManuscriptViewer } from "@/components/manuscript-viewer";
import { uiStatus } from "@/lib/submission-utils";

const statuses = [
  "TECHNICAL_CHECK",
  "UNDER_REVIEW",
  "MAJOR_REVISION",
  "MINOR_REVISION",
  "ACCEPTED",
  "REJECTED",
  "IN_PRODUCTION",
  "PUBLISHED",
] as const;

type Feedback = {
  id: string;
  message: string;
  status: (typeof statuses)[number];
  createdAt: string;
  reviewer: { name: string };
};

type Submission = {
  id: string;
  manuscriptId: string;
  title: string;
  abstract: string;
  keywords: string[];
  articleType: string;
  status: (typeof statuses)[number] | "SUBMITTED" | "DRAFT";
  progress: number;
  manuscriptUrl?: string | null;
  coverLetter?: string | null;
  author: { name: string; email: string; institution?: string | null };
  journal: { title: string };
  feedback: Feedback[];
};

export default function AdminSubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [status, setStatus] = useState<(typeof statuses)[number]>("UNDER_REVIEW");
  const [message, setMessage] = useState("");
  const [actionRequired, setActionRequired] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/submissions/${id}`);
    const data = await res.json();
    if (res.ok) {
      setSubmission(data.submission);
      if (
        statuses.includes(
          data.submission.status as (typeof statuses)[number],
        )
      ) {
        setStatus(data.submission.status);
      }
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/submissions/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        message,
        actionRequired: actionRequired || undefined,
        assignToMe: true,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setMessage("");
    setActionRequired("");
    setSubmission(data.submission);
  }

  if (!submission) {
    return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  }

  return (
    <div>
      <Link
        href="/admin/submissions"
        className="text-xs font-semibold text-[var(--accent)]"
      >
        ← Inbox
      </Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 font-semibold text-[var(--accent)]">
              {uiStatus(submission.status as Parameters<typeof uiStatus>[0])}
            </span>
            <span className="text-[var(--muted)]">{submission.manuscriptId}</span>
          </div>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl">
            {submission.title}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {submission.author.name} ({submission.author.email}) ·{" "}
            {submission.journal.title} · {submission.articleType}
          </p>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-[var(--muted)]">
              <span>Author-visible progress</span>
              <span>{submission.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${submission.progress}%` }}
              />
            </div>
          </div>

          <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5">
            <h2 className="text-sm font-semibold">Abstract</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              {submission.abstract}
            </p>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Keywords: {submission.keywords.join(", ")}
            </p>
          </section>

          {submission.manuscriptUrl && (
            <section className="mt-6">
              <ManuscriptViewer
                url={submission.manuscriptUrl}
                title={`${submission.manuscriptId} — manuscript`}
              />
            </section>
          )}

          <section className="mt-6">
            <h2 className="text-sm font-semibold">Feedback history</h2>
            <div className="mt-3 space-y-3">
              {submission.feedback.length === 0 && (
                <p className="text-sm text-[var(--muted)]">No feedback yet.</p>
              )}
              {submission.feedback.map((f) => (
                <div
                  key={f.id}
                  className="rounded-xl border border-[var(--line)] bg-white p-4"
                >
                  <p className="text-xs text-[var(--muted)]">
                    {f.reviewer.name} · {uiStatus(f.status)} ·{" "}
                    {new Date(f.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{f.message}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <form
          onSubmit={onSubmit}
          className="h-fit space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold">Send review feedback</h2>
          <p className="text-xs text-[var(--muted)]">
            Author receives an email and a dashboard notification. Progress bar
            updates immediately.
          </p>
          <label className="field">
            <span>New status</span>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as (typeof statuses)[number])
              }
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {uiStatus(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Message to author</span>
            <textarea
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Summarize decision and requested changes…"
            />
          </label>
          <label className="field">
            <span>Action required (optional)</span>
            <input
              value={actionRequired}
              onChange={(e) => setActionRequired(e.target.value)}
              placeholder="Shown as alert on author dashboard"
            />
          </label>
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Sending…" : "Send feedback"}
          </button>
        </form>
      </div>
    </div>
  );
}
