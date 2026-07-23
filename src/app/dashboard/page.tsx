"use client";

import Link from "next/link";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/components/auth-provider";
import { StatusBadge } from "@/components/status-badge";
import { submissions } from "@/data/mock";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardInner />
    </RequireAuth>
  );
}

function DashboardInner() {
  const { user } = useAuth();
  const drafts = submissions.filter((s) => s.status === "Draft");
  const active = submissions.filter(
    (s) => s.status !== "Draft" && s.status !== "Published",
  );
  const published = submissions.filter((s) => s.status === "Published");
  const needsAction = submissions.filter((s) => s.actionRequired);

  if (!user) return null;

  return (
    <div className="page-wrap">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Author centre</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Manuscript tracking for {user.name}, {user.institution}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/notifications" className="btn-secondary w-fit">
            Notifications
          </Link>
          <Link href="/submissions/new" className="btn-primary w-fit">
            New submission
          </Link>
        </div>
      </div>

      {needsAction.length > 0 && (
        <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-900">
            Action required
          </h2>
          <ul className="mt-3 space-y-3">
            {needsAction.map((sub) => (
              <li
                key={sub.id}
                className="flex flex-col gap-2 rounded-xl bg-white/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">
                    {sub.manuscriptId}: {sub.title}
                  </p>
                  <p className="mt-1 text-xs text-amber-900/80">
                    {sub.actionRequired}
                  </p>
                </div>
                <Link
                  href={`/submissions/${sub.id}`}
                  className="btn-primary !px-3 !py-2 text-sm"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "In progress", value: drafts.length + active.length },
          { label: "Under review / revision", value: active.length },
          { label: "Published", value: published.length },
        ].map((card) => (
          <div key={card.label} className="card px-5 py-5">
            <p className="text-2xl font-semibold text-[var(--ink)]">{card.value}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {[
          ["/authors/guidelines", "Guidelines"],
          ["/authors/fees", "Fees"],
          ["/articles", "Articles"],
          ["/search", "Search"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            {label}
          </Link>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[var(--ink)]">
          Your manuscripts
        </h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
          <div className="hidden grid-cols-[1.4fr_1fr_auto_auto] gap-4 border-b border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] sm:grid">
            <span>Title</span>
            <span>Journal</span>
            <span>Status</span>
            <span />
          </div>
          <ul className="divide-y divide-[var(--line)]">
            {submissions.map((sub) => (
              <li
                key={sub.id}
                className="grid gap-3 px-5 py-4 sm:grid-cols-[1.4fr_1fr_auto_auto] sm:items-center sm:gap-4"
              >
                <div>
                  <p className="font-medium text-[var(--ink)]">{sub.title}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {sub.manuscriptId}, {sub.articleType}
                  </p>
                </div>
                <p className="text-sm text-[var(--muted)]">{sub.journalTitle}</p>
                <StatusBadge status={sub.status} />
                <Link
                  href={`/submissions/${sub.id}`}
                  className="text-sm font-semibold text-[var(--accent)] hover:underline"
                >
                  {sub.status === "Draft" ? "Resume" : "Track"}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-10 card p-6">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Profile</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wider text-[var(--muted)]">
              ORCID
            </dt>
            <dd className="mt-1 text-sm">{user.orcid || "Not set"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-[var(--muted)]">
              Email
            </dt>
            <dd className="mt-1 text-sm">{user.email}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wider text-[var(--muted)]">
              Research interests
            </dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {(user.researchInterests.length
                ? user.researchInterests
                : ["Add interests in profile later"]
              ).map((interest) => (
                <span
                  key={interest}
                  className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs text-[var(--muted)]"
                >
                  {interest}
                </span>
              ))}
            </dd>
          </div>
        </dl>
        <Link
          href="/profile"
          className="mt-4 inline-block text-sm font-semibold text-[var(--accent)]"
        >
          View full profile →
        </Link>
      </section>
    </div>
  );
}
