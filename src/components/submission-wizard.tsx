"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { articleTypes, journals, submissionSteps } from "@/data/mock";
import type { ArticleType } from "@/lib/types";

type FormState = {
  journalId: string;
  articleType: ArticleType | "";
  title: string;
  abstract: string;
  keywords: string;
  authorName: string;
  authorEmail: string;
  affiliation: string;
  funding: string;
  conflictOfInterest: string;
  ethicsStatement: string;
  coverLetter: string;
  manuscriptFile: string;
};

const initial: FormState = {
  journalId: "",
  articleType: "",
  title: "",
  abstract: "",
  keywords: "",
  authorName: "Dr. Amara Okonkwo",
  authorEmail: "amara.okonkwo@university.edu",
  affiliation: "University of Lagos",
  funding: "",
  conflictOfInterest: "The authors declare no conflict of interest.",
  ethicsStatement: "",
  coverLetter: "",
  manuscriptFile: "",
};

export function SubmissionWizard() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initial);
  const [submitted, setSubmitted] = useState(false);

  const selectedJournal = useMemo(
    () => journals.find((j) => j.id === form.journalId),
    [form.journalId],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function canContinue() {
    if (step === 1) return Boolean(form.journalId && form.articleType);
    if (step === 2)
      return Boolean(form.title.trim() && form.abstract.trim() && form.keywords.trim());
    if (step === 3)
      return Boolean(
        form.authorName.trim() && form.authorEmail.trim() && form.affiliation.trim(),
      );
    if (step === 4) return Boolean(form.conflictOfInterest.trim());
    if (step === 5) return Boolean(form.manuscriptFile);
    return true;
  }

  function next() {
    if (step < 6 && canContinue()) setStep((s) => s + 1);
  }

  function back() {
    if (step > 1) setStep((s) => s - 1);
  }

  function finish() {
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-white p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
          ✓
        </div>
        <h2 className="mt-5 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Submission received
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)]">
          Your manuscript has been queued for technical check. Manuscript ID{" "}
          <span className="font-medium text-[var(--ink)]">AJS-2026-0199</span>{" "}
          (mock). You can track progress from your dashboard.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className="btn-primary">
            Go to dashboard
          </Link>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSubmitted(false);
              setStep(1);
              setForm(initial);
            }}
          >
            Start another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <aside className="h-fit rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm">
        <p className="px-2 pb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Steps
        </p>
        <ol className="space-y-1">
          {submissionSteps.map((s) => {
            const active = s.id === step;
            const done = s.id < step;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => s.id < step && setStep(s.id)}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    active
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : done
                        ? "text-[var(--ink)] hover:bg-[var(--surface)]"
                        : "text-[var(--muted)]"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      active || done
                        ? "bg-[var(--accent)] text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {done ? "✓" : s.id}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{s.label}</span>
                    <span className="block text-xs opacity-80">{s.description}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      <div className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
            Step {step} of 6
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            {submissionSteps[step - 1].label}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {submissionSteps[step - 1].description}
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <label className="field">
              <span>Journal</span>
              <select
                value={form.journalId}
                onChange={(e) => update("journalId", e.target.value)}
              >
                <option value="">Select a journal</option>
                {journals.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Article type</span>
              <select
                value={form.articleType}
                onChange={(e) =>
                  update("articleType", e.target.value as ArticleType | "")
                }
              >
                <option value="">Select article type</option>
                {articleTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            {selectedJournal && (
              <div className="rounded-xl bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
                <p>
                  <span className="font-medium text-[var(--ink)]">Review:</span>{" "}
                  {selectedJournal.reviewType}
                </p>
                <p className="mt-1">
                  <span className="font-medium text-[var(--ink)]">Avg. review:</span>{" "}
                  {selectedJournal.avgReviewDays} days · APC{" "}
                  {selectedJournal.apc}
                </p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <label className="field">
              <span>Manuscript title</span>
              <input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Enter the full title"
              />
            </label>
            <label className="field">
              <span>Abstract</span>
              <textarea
                rows={6}
                value={form.abstract}
                onChange={(e) => update("abstract", e.target.value)}
                placeholder="250–300 words recommended"
              />
            </label>
            <label className="field">
              <span>Keywords</span>
              <input
                value={form.keywords}
                onChange={(e) => update("keywords", e.target.value)}
                placeholder="Comma-separated keywords"
              />
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <label className="field">
              <span>Corresponding author</span>
              <input
                value={form.authorName}
                onChange={(e) => update("authorName", e.target.value)}
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={form.authorEmail}
                onChange={(e) => update("authorEmail", e.target.value)}
              />
            </label>
            <label className="field">
              <span>Affiliation</span>
              <input
                value={form.affiliation}
                onChange={(e) => update("affiliation", e.target.value)}
              />
            </label>
            <p className="text-xs text-[var(--muted)]">
              Co-authors can be added later. This mock form keeps a single author for
              simplicity.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <label className="field">
              <span>Funding</span>
              <input
                value={form.funding}
                onChange={(e) => update("funding", e.target.value)}
                placeholder="Grant name / number (optional)"
              />
            </label>
            <label className="field">
              <span>Conflict of interest</span>
              <textarea
                rows={3}
                value={form.conflictOfInterest}
                onChange={(e) => update("conflictOfInterest", e.target.value)}
              />
            </label>
            <label className="field">
              <span>Ethics statement</span>
              <textarea
                rows={3}
                value={form.ethicsStatement}
                onChange={(e) => update("ethicsStatement", e.target.value)}
                placeholder="IRB / ethics approval details if applicable"
              />
            </label>
            <label className="field">
              <span>Cover letter</span>
              <textarea
                rows={4}
                value={form.coverLetter}
                onChange={(e) => update("coverLetter", e.target.value)}
                placeholder="Optional message to the editor"
              />
            </label>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <label className="field">
              <span>Manuscript file (mock)</span>
              <select
                value={form.manuscriptFile}
                onChange={(e) => update("manuscriptFile", e.target.value)}
              >
                <option value="">Select uploaded file</option>
                <option value="manuscript.docx">manuscript.docx</option>
                <option value="manuscript.pdf">manuscript.pdf</option>
                <option value="manuscript-latex.zip">manuscript-latex.zip</option>
              </select>
            </label>
            <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-8 text-center">
              <p className="text-sm font-medium text-[var(--ink)]">
                File upload is mocked for now
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Later: Cloudinary · PDF / DOCX / LaTeX ZIP · virus scan
              </p>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4 text-sm">
            <ReviewRow label="Journal" value={selectedJournal?.title ?? "—"} />
            <ReviewRow label="Article type" value={form.articleType || "—"} />
            <ReviewRow label="Title" value={form.title || "—"} />
            <ReviewRow label="Keywords" value={form.keywords || "—"} />
            <ReviewRow
              label="Author"
              value={`${form.authorName} · ${form.affiliation}`}
            />
            <ReviewRow label="Manuscript" value={form.manuscriptFile || "—"} />
            <div className="rounded-xl bg-[var(--surface)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Abstract
              </p>
              <p className="mt-2 leading-relaxed text-[var(--ink)]">
                {form.abstract || "—"}
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-[var(--line)] pt-6">
          <button
            type="button"
            onClick={back}
            disabled={step === 1}
            className="btn-secondary disabled:opacity-40"
          >
            Back
          </button>
          {step < 6 ? (
            <button
              type="button"
              onClick={next}
              disabled={!canContinue()}
              className="btn-primary disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <button type="button" onClick={finish} className="btn-primary">
              Submit manuscript
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-[var(--line)] pb-3 sm:flex-row sm:justify-between">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-medium text-[var(--ink)] sm:max-w-[65%] sm:text-right">
        {value}
      </span>
    </div>
  );
}
