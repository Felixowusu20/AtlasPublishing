"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { uiStatus } from "@/lib/submission-utils";

type Submission = {
  id: string;
  manuscriptId: string;
  title: string;
  status: Parameters<typeof uiStatus>[0];
  progress: number;
  updatedAt: string;
  author: { name: string; email: string };
  journal: { title: string };
};

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/submissions");
      const data = await res.json();
      if (res.ok) setSubmissions(data.submissions);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Submission inbox
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Review manuscripts and send feedback. Authors get dashboard + email
        updates and progress changes instantly.
      </p>

      <div className="mt-6 space-y-3">
        {loading && (
          <p className="text-sm text-[var(--muted)]">Loading inbox…</p>
        )}
        {!loading && submissions.length === 0 && (
          <p className="rounded-xl border border-[var(--line)] bg-white p-8 text-center text-sm text-[var(--muted)]">
            No submissions yet.
          </p>
        )}
        {submissions.map((sub) => (
          <Link
            key={sub.id}
            href={`/admin/submissions/${sub.id}`}
            className="block rounded-xl border border-[var(--line)] bg-white p-4 transition hover:border-[var(--accent)]/40"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 font-semibold text-[var(--accent)]">
                {uiStatus(sub.status)}
              </span>
              <span className="text-[var(--muted)]">{sub.manuscriptId}</span>
            </div>
            <h2 className="mt-2 font-semibold text-[var(--ink)]">{sub.title}</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {sub.author.name} · {sub.journal.title}
            </p>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-[var(--muted)]">
                <span>Progress</span>
                <span>{sub.progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${sub.progress}%` }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
