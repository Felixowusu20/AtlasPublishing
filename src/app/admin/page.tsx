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
};

export default function AdminHomePage() {
  const { user } = useAdminAuth();
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    void (async () => {
      const [subs, journals, articles, announcements, reviewers] =
        await Promise.all([
          fetch("/api/admin/submissions").then((r) => r.json()),
          fetch("/api/admin/journals").then((r) => r.json()),
          fetch("/api/admin/articles").then((r) => r.json()),
          fetch("/api/admin/announcements").then((r) => r.json()),
          user?.role === "SUPER_ADMIN"
            ? fetch("/api/admin/reviewers").then((r) => r.json())
            : Promise.resolve({ reviewers: [] }),
        ]);
      setCounts({
        submissions: subs.submissions?.length ?? 0,
        journals: journals.journals?.length ?? 0,
        articles: articles.articles?.length ?? 0,
        announcements: announcements.announcements?.length ?? 0,
        reviewers: reviewers.reviewers?.length ?? 0,
      });
    })();
  }, [user?.role]);

  if (!user) return null;

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        Welcome, {user.name}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {user.role === "SUPER_ADMIN"
          ? "Manage CMS content, journals, reviewers, and the submission inbox."
          : "Review manuscripts and send feedback to authors."}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label="Inbox"
          value={counts?.submissions}
          href="/admin/submissions"
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
