"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/components/auth-provider";
import { StatusBadge } from "@/components/status-badge";
import { initials } from "@/lib/auth";
import { notifications, submissions } from "@/data/mock";
import type { Submission, SubmissionStatus } from "@/lib/types";

type FilterKey = "all" | "action" | "active" | "draft" | "published";

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "action", label: "Needs action" },
  { key: "active", label: "In review" },
  { key: "draft", label: "Drafts" },
  { key: "published", label: "Published" },
];

function matchesFilter(sub: Submission, filter: FilterKey) {
  if (filter === "all") return true;
  if (filter === "action") return Boolean(sub.actionRequired);
  if (filter === "draft") return sub.status === "Draft";
  if (filter === "published") return sub.status === "Published";
  return sub.status !== "Draft" && sub.status !== "Published";
}

function stageProgress(status: SubmissionStatus) {
  const order: SubmissionStatus[] = [
    "Draft",
    "Submitted",
    "Technical Check",
    "Under Review",
    "Minor Revision",
    "Major Revision",
    "Accepted",
    "In Production",
    "Published",
  ];
  if (status === "Rejected") return 40;
  const idx = order.indexOf(status);
  if (idx < 0) return 10;
  return Math.round(((idx + 1) / order.length) * 100);
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardInner />
    </RequireAuth>
  );
}

function DashboardInner() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterKey>("all");

  const drafts = submissions.filter((s) => s.status === "Draft");
  const active = submissions.filter(
    (s) => s.status !== "Draft" && s.status !== "Published",
  );
  const published = submissions.filter((s) => s.status === "Published");
  const needsAction = submissions.filter((s) => s.actionRequired);
  const unread = notifications.filter((n) => n.unread).length;

  const filtered = useMemo(
    () => submissions.filter((s) => matchesFilter(s, filter)),
    [filter],
  );

  if (!user) return null;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-full bg-[var(--paper)]">
      {/* Welcome banner */}
      <section className="border-b border-[var(--line)] bg-[var(--ink)] text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-10">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-lg font-semibold text-white shadow-lg shadow-black/20">
              {initials(user.name)}
            </div>
            <div>
              <p className="text-sm text-slate-300">{greeting}</p>
              <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight">
                {user.name}
              </h1>
              <p className="mt-1.5 text-sm text-slate-400">
                {user.institution}
                {user.orcid ? `, ORCID ${user.orcid}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/notifications"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              Notifications
              {unread > 0 && (
                <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-[var(--ink)]">
                  {unread}
                </span>
              )}
            </Link>
            <Link
              href="/submissions/new"
              className="inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-slate-100"
            >
              New submission
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* KPI row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Needs action"
            value={needsAction.length}
            hint="Deadlines and revisions"
            tone="amber"
          />
          <StatCard
            label="In progress"
            value={drafts.length + active.length}
            hint="Drafts and active reviews"
            tone="teal"
          />
          <StatCard
            label="Under review"
            value={active.length}
            hint="With editors or reviewers"
            tone="sky"
          />
          <StatCard
            label="Published"
            value={published.length}
            hint="Live on Atlas journals"
            tone="emerald"
          />
        </div>

        {/* Action required */}
        {needsAction.length > 0 && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white shadow-sm">
            <div className="flex items-center justify-between border-b border-amber-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-amber-950">
                  Action required
                </h2>
                <p className="mt-0.5 text-xs text-amber-800/80">
                  These manuscripts need your attention before they can move
                  forward.
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                {needsAction.length}
              </span>
            </div>
            <ul className="divide-y divide-amber-100">
              {needsAction.map((sub) => (
                <li
                  key={sub.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={sub.status} />
                      <span className="text-xs font-medium text-amber-900/70">
                        {sub.manuscriptId}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-sm font-semibold text-[var(--ink)]">
                      {sub.title}
                    </p>
                    <p className="mt-1 text-xs text-amber-900/75">
                      {sub.actionRequired}
                    </p>
                  </div>
                  <Link
                    href={`/submissions/${sub.id}`}
                    className="btn-primary shrink-0 !px-4 !py-2 text-sm"
                  >
                    Continue
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Manuscripts */}
          <section>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                  Your manuscripts
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Track status, revise files, and open full records.
                </p>
              </div>
              <Link
                href="/submissions/new"
                className="text-sm font-semibold text-[var(--accent)] hover:underline"
              >
                + Start another
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5 rounded-xl border border-[var(--line)] bg-white p-1.5">
              {filters.map((f) => {
                const count = submissions.filter((s) =>
                  matchesFilter(s, f.key),
                ).length;
                const activeFilter = filter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      activeFilter
                        ? "bg-[var(--ink)] text-white"
                        : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {f.label}
                    <span
                      className={`ml-1.5 ${activeFilter ? "text-white/70" : "text-[var(--muted)]"}`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-3">
              {filtered.length === 0 && (
                <div className="card px-6 py-12 text-center">
                  <p className="text-sm font-medium text-[var(--ink)]">
                    No manuscripts in this view
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Try another filter or start a new submission.
                  </p>
                  <Link
                    href="/submissions/new"
                    className="btn-primary mt-5 inline-flex"
                  >
                    New submission
                  </Link>
                </div>
              )}

              {filtered.map((sub) => {
                const progress = stageProgress(sub.status);
                return (
                  <article
                    key={sub.id}
                    className="group card overflow-hidden transition hover:border-[var(--accent)]/35 hover:shadow-md"
                  >
                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={sub.status} />
                            {sub.actionRequired && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                                Action needed
                              </span>
                            )}
                          </div>
                          <h3 className="mt-2 text-base font-semibold leading-snug text-[var(--ink)] group-hover:text-[var(--accent)]">
                            {sub.title}
                          </h3>
                          <p className="mt-1.5 text-xs text-[var(--muted)]">
                            {sub.manuscriptId}, {sub.articleType},{" "}
                            {sub.journalTitle}
                          </p>
                        </div>
                        <Link
                          href={`/submissions/${sub.id}`}
                          className="shrink-0 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:bg-white hover:text-[var(--accent)]"
                        >
                          {sub.status === "Draft" ? "Resume" : "Track"}
                        </Link>
                      </div>

                      <div className="mt-4">
                        <div className="mb-1.5 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
                          <span>Editorial progress</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
                          <div
                            className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
                        <span>
                          Updated{" "}
                          <span className="font-medium text-[var(--ink)]">
                            {sub.updatedAt}
                          </span>
                        </span>
                        {sub.submittedAt && (
                          <span>
                            Submitted{" "}
                            <span className="font-medium text-[var(--ink)]">
                              {sub.submittedAt}
                            </span>
                          </span>
                        )}
                        <span>
                          Authors{" "}
                          <span className="font-medium text-[var(--ink)]">
                            {sub.authors.length}
                          </span>
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-[var(--ink)]">
                Quick actions
              </h2>
              <div className="mt-3 space-y-1.5">
                {[
                  ["/submissions/new", "Submit a manuscript"],
                  ["/journals", "Browse journals"],
                  ["/authors/guidelines", "Author guidelines"],
                  ["/authors/fees", "Fees and waivers"],
                  ["/search", "Search articles"],
                ].map(([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-[var(--ink)] transition hover:bg-[var(--surface)]"
                  >
                    {label}
                    <span className="text-[var(--muted)]">→</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--ink)]">
                  Recent activity
                </h2>
                <Link
                  href="/notifications"
                  className="text-xs font-semibold text-[var(--accent)]"
                >
                  View all
                </Link>
              </div>
              <ul className="mt-3 space-y-3">
                {notifications.slice(0, 3).map((n) => (
                  <li
                    key={n.id}
                    className="rounded-xl border border-[var(--line)] bg-[var(--surface)]/50 px-3 py-3"
                  >
                    <div className="flex items-start gap-2">
                      {n.unread && (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                      )}
                      <div className={!n.unread ? "pl-3.5" : ""}>
                        <p className="text-xs font-semibold text-[var(--ink)]">
                          {n.title}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
                          {n.body}
                        </p>
                        <p className="mt-1.5 text-[10px] text-[var(--muted)]">
                          {n.time}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card overflow-hidden">
              <div className="bg-[var(--accent-soft)] px-5 py-4">
                <h2 className="text-sm font-semibold text-[var(--accent)]">
                  Author profile
                </h2>
              </div>
              <div className="space-y-3 p-5 text-sm">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Email
                  </p>
                  <p className="mt-0.5 font-medium text-[var(--ink)]">
                    {user.email}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Role
                  </p>
                  <p className="mt-0.5 font-medium capitalize text-[var(--ink)]">
                    {user.role}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Interests
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(user.researchInterests.length
                      ? user.researchInterests
                      : ["Not set"]
                    ).map((interest) => (
                      <span
                        key={interest}
                        className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11px] text-[var(--muted)]"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href="/profile"
                  className="mt-2 inline-flex text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  Manage profile →
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "amber" | "teal" | "sky" | "emerald";
}) {
  const tones = {
    amber: "from-amber-50 to-white border-amber-100",
    teal: "from-[var(--accent-soft)] to-white border-teal-100",
    sky: "from-sky-50 to-white border-sky-100",
    emerald: "from-emerald-50 to-white border-emerald-100",
  };
  const valueTone = {
    amber: "text-amber-900",
    teal: "text-[var(--accent)]",
    sky: "text-sky-800",
    emerald: "text-emerald-800",
  };

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm ${tones[tone]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${valueTone[tone]}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
    </div>
  );
}
