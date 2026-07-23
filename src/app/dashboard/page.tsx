import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { currentUser, submissions } from "@/data/mock";

export default function DashboardPage() {
  const drafts = submissions.filter((s) => s.status === "Draft");
  const active = submissions.filter(
    (s) => s.status !== "Draft" && s.status !== "Published",
  );
  const published = submissions.filter((s) => s.status === "Published");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            Author dashboard
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Welcome back, {currentUser.name} · {currentUser.institution}
          </p>
        </div>
        <Link href="/submissions/new" className="btn-primary w-fit">
          New submission
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "In progress", value: drafts.length + active.length },
          { label: "Under review / revision", value: active.length },
          { label: "Published", value: published.length },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-[var(--line)] bg-white px-5 py-5 shadow-sm"
          >
            <p className="text-2xl font-semibold text-[var(--ink)]">{card.value}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{card.label}</p>
          </div>
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
                    {sub.manuscriptId} · {sub.articleType}
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

      <section className="mt-10 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Profile</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wider text-[var(--muted)]">
              ORCID
            </dt>
            <dd className="mt-1 text-sm">{currentUser.orcid}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-[var(--muted)]">
              Email
            </dt>
            <dd className="mt-1 text-sm">{currentUser.email}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wider text-[var(--muted)]">
              Research interests
            </dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {currentUser.researchInterests.map((interest) => (
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
      </section>
    </div>
  );
}
