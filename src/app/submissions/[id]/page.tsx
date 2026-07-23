import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { getSubmissionById, submissionSteps } from "@/data/mock";

const workflow = [
  "Submission",
  "Technical Check",
  "Editor Assignment",
  "Peer Review",
  "Decision",
  "Revision",
  "Production",
  "Publication",
];

function workflowIndex(status: string) {
  const map: Record<string, number> = {
    Draft: 0,
    Submitted: 0,
    "Technical Check": 1,
    "Under Review": 3,
    "Major Revision": 5,
    "Minor Revision": 5,
    Accepted: 6,
    Rejected: 4,
    "In Production": 6,
    Published: 7,
  };
  return map[status] ?? 0;
}

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sub = getSubmissionById(id);
  if (!sub) notFound();

  const current = workflowIndex(sub.status);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-[var(--accent)] hover:underline"
      >
        ← Dashboard
      </Link>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={sub.status} />
            <span className="text-sm text-[var(--muted)]">{sub.manuscriptId}</span>
          </div>
          <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            {sub.title}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {sub.journalTitle} · {sub.articleType}
          </p>
        </div>
        {sub.status === "Draft" && (
          <Link href="/submissions/new" className="btn-primary w-fit">
            Resume submission
          </Link>
        )}
      </div>

      <section className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Editorial progress
        </h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {workflow.map((stage, index) => {
            const done = index <= current;
            const active = index === current;
            return (
              <li key={stage} className="text-center">
                <div
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                    active
                      ? "bg-[var(--accent)] text-white"
                      : done
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {index + 1}
                </div>
                <p
                  className={`mt-2 text-xs ${active ? "font-semibold text-[var(--ink)]" : "text-[var(--muted)]"}`}
                >
                  {stage}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="font-semibold text-[var(--ink)]">Abstract</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            {sub.abstract}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {sub.keywords.map((k) => (
              <span
                key={k}
                className="rounded-full bg-[var(--surface)] px-2.5 py-0.5 text-xs text-[var(--muted)]"
              >
                {k}
              </span>
            ))}
          </div>

          {(sub.funding || sub.conflictOfInterest || sub.ethicsStatement) && (
            <div className="mt-6 space-y-4 border-t border-[var(--line)] pt-6 text-sm">
              {sub.funding && (
                <div>
                  <p className="font-medium text-[var(--ink)]">Funding</p>
                  <p className="mt-1 text-[var(--muted)]">{sub.funding}</p>
                </div>
              )}
              {sub.conflictOfInterest && (
                <div>
                  <p className="font-medium text-[var(--ink)]">
                    Conflict of interest
                  </p>
                  <p className="mt-1 text-[var(--muted)]">
                    {sub.conflictOfInterest}
                  </p>
                </div>
              )}
              {sub.ethicsStatement && (
                <div>
                  <p className="font-medium text-[var(--ink)]">Ethics</p>
                  <p className="mt-1 text-[var(--muted)]">{sub.ethicsStatement}</p>
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-[var(--ink)]">Authors</h2>
            <ul className="mt-4 space-y-3">
              {sub.authors.map((author) => (
                <li key={author.id} className="text-sm">
                  <p className="font-medium text-[var(--ink)]">
                    {author.name}
                    {author.isCorresponding && (
                      <span className="ml-2 text-xs text-[var(--accent)]">
                        corresponding
                      </span>
                    )}
                  </p>
                  <p className="text-[var(--muted)]">{author.affiliation}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-[var(--ink)]">Timeline</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">Submitted</dt>
                <dd>{sub.submittedAt ?? "Not submitted"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">Last update</dt>
                <dd>{sub.updatedAt}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">Wizard step</dt>
                <dd>
                  {sub.progressStep} / {submissionSteps.length}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
