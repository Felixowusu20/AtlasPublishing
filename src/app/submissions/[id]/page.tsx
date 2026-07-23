"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { RequireAuth } from "@/components/require-auth";
import { ManuscriptViewer } from "@/components/manuscript-viewer";
import { uiStatus } from "@/lib/submission-utils";

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
  journal: { title: string };
  feedback: Feedback[];
  updatedAt: string;
  submittedAt?: string | null;
};

function Detail({ id }: { id: string }) {
  const [sub, setSub] = useState<Submission | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch(`/api/submissions/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Not found");
        setSub(data.submission);
      })
      .catch((err) => setError(err.message));
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="text-xs font-semibold text-[var(--accent)]">
        ← Dashboard
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={uiStatus(sub.status as Parameters<typeof uiStatus>[0])} />
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
            title={`${sub.manuscriptId} — your manuscript`}
          />
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-[family-name:var(--font-display)] text-xl">
          Reviewer feedback
        </h2>
        <div className="mt-4 space-y-3">
          {sub.feedback.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              No reviewer messages yet. You will also get an email when feedback
              arrives.
            </p>
          )}
          {sub.feedback.map((f) => (
            <article
              key={f.id}
              className="rounded-xl border border-[var(--line)] bg-white p-4"
            >
              <p className="text-xs text-[var(--muted)]">
                {f.reviewer.name} ·{" "}
                {uiStatus(f.status as Parameters<typeof uiStatus>[0])} ·{" "}
                {new Date(f.createdAt).toLocaleString()}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{f.message}</p>
            </article>
          ))}
        </div>
      </section>
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
