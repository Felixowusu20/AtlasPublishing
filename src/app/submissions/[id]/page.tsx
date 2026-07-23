"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { RequireAuth } from "@/components/require-auth";
import { ManuscriptViewer } from "@/components/manuscript-viewer";
import { ResubmitPanel } from "@/components/resubmit-panel";
import { canAuthorResubmit, uiStatus } from "@/lib/submission-utils";

type Feedback = {
  id: string;
  message: string;
  status: string;
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
  status: string;
  progress: number;
  actionRequired?: string | null;
  manuscriptUrl?: string | null;
  manuscriptPublicId?: string | null;
  journal: { title: string };
  feedback: Feedback[];
  updatedAt: string;
  submittedAt?: string | null;
};

function Detail({ id }: { id: string }) {
  const [sub, setSub] = useState<Submission | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/submissions/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Not found");
    setSub(data.submission);
  }

  useEffect(() => {
    void load().catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-sm text-rose-700">{error}</p>
        <Link href="/dashboard" className="btn-primary mt-4 inline-flex">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!sub) {
    return (
      <p className="p-10 text-center text-sm text-[var(--muted)]">Loading…</p>
    );
  }

  const showResubmit = canAuthorResubmit(sub.status, sub.actionRequired);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="text-xs font-semibold text-[var(--accent)]">
        ← Dashboard
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge
          status={uiStatus(sub.status as Parameters<typeof uiStatus>[0])}
        />
        <span className="text-xs text-[var(--muted)]">{sub.manuscriptId}</span>
      </div>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        {sub.title}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {sub.journal.title} · {sub.articleType}
      </p>

      <div className="mt-6">
        <div className="mb-1.5 flex justify-between text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
          <span>Editorial progress</span>
          <span>{sub.progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--surface)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all"
            style={{ width: `${sub.progress}%` }}
          />
        </div>
      </div>

      {sub.actionRequired && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {sub.actionRequired}
        </div>
      )}

      {showResubmit && (
        <section className="mt-8 scroll-mt-24" id="resubmit">
          <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                  Author action
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                  Resubmit revised manuscript
                </h2>
                <p className="mt-1 text-sm text-amber-900/80">
                  After you fix reviewer comments, upload the corrected file and
                  a short message, then submit.
                </p>
              </div>
              <a href="#resubmit-form" className="btn-primary shrink-0">
                Resubmit
              </a>
            </div>
            <div id="resubmit-form">
              <ResubmitPanel
                submissionId={sub.id}
                manuscriptId={sub.manuscriptId}
                onDone={() => void load()}
              />
            </div>
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-[family-name:var(--font-display)] text-xl">
          Reviewer feedback
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          The same feedback is emailed to you when a reviewer sends an update.
        </p>
        <div className="mt-4 space-y-3">
          {sub.feedback.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              No reviewer messages yet.
            </p>
          )}
          {sub.feedback.map((f) => (
            <article
              key={f.id}
              className="rounded-xl border border-[var(--line)] bg-white p-4"
            >
              <p className="text-xs text-[var(--muted)]">
                {f.message.startsWith("Author response")
                  ? "You"
                  : f.reviewer.name}{" "}
                · {uiStatus(f.status as Parameters<typeof uiStatus>[0])} ·{" "}
                {new Date(f.createdAt).toLocaleString()}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{f.message}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 card p-5">
        <h2 className="text-sm font-semibold">Abstract</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          {sub.abstract}
        </p>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Keywords: {sub.keywords.join(", ")}
        </p>
      </section>

      {sub.manuscriptUrl && (
        <section className="mt-8">
          <ManuscriptViewer
            url={sub.manuscriptUrl}
            publicId={sub.manuscriptPublicId}
            title={`${sub.manuscriptId} — your manuscript`}
          />
        </section>
      )}
    </div>
  );
}

export default function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <Detail id={id} />
    </RequireAuth>
  );
}
