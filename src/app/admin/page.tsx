"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin-auth-provider";

type Counts = {
  submissions: number;
  journals: number;
  articles: number;
  announcements: number;
  reviewers: number;
  publishQueue: number;
};

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function listLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

export default function AdminHomePage() {
  const { user } = useAdminAuth();
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const [subs, journals, articles, announcements, reviewers, publish] =
          await Promise.all([
            fetch("/api/admin/submissions").then(readJson),
            fetch("/api/admin/journals").then(readJson),
            fetch("/api/admin/articles").then(readJson),
            fetch("/api/admin/announcements").then(readJson),
            user.role === "SUPER_ADMIN"
              ? fetch("/api/admin/reviewers").then(readJson)
              : Promise.resolve({ reviewers: [] as unknown[] }),
            fetch("/api/admin/publish-queue").then(readJson),
          ]);
        if (cancelled) return;
        setCounts({
          submissions: listLength(subs.submissions),
          journals: listLength(journals.journals),
          articles: listLength(articles.articles),
          announcements: listLength(announcements.announcements),
          reviewers: listLength(reviewers.reviewers),
          publishQueue: listLength(publish.queue),
        });
      } catch {
        if (!cancelled) {
          setCounts({
            submissions: 0,
            journals: 0,
            articles: 0,
            announcements: 0,
            reviewers: 0,
            publishQueue: 0,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        Welcome, {user.name}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {user.role === "SUPER_ADMIN"
          ? "Manage CMS content, journals, reviewers, and the submission inbox."
          : "Review manuscripts, prepare full articles, and publish accepted papers."}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label="Inbox"
          value={counts?.submissions}
          href="/admin/submissions"
        />
        <Stat
          label="Full manuscripts"
          value={counts?.publishQueue}
          href="/admin/manuscripts"
        />
        <Stat
          label="Publish queue"
          value={counts?.publishQueue}
          href="/admin/publishedArticles"
        />
        {user.role === "SUPER_ADMIN" && (
          <>
            <Stat label="Journals" value={counts?.journals} href="/admin/journals" />
            <Stat
              label="Latest articles"
              value={counts?.articles}
              href="/admin/articles"
            />
            <Stat
              label="Announcements"
              value={counts?.announcements}
              href="/admin/announcements"
            />
            <Stat
              label="Reviewers"
              value={counts?.reviewers}
              href="/admin/reviewers"
            />
            <Stat label="Hero slides" value="CMS" href="/admin/hero" />
            <Stat label="Recycle bin" value="Bin" href="/admin/recycle-bin" />
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number | string | null | undefined;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm transition hover:border-[var(--accent)]/40"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-[var(--ink)]">
        {value ?? "—"}
      </p>
    </Link>
  );
}
