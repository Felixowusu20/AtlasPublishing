import { SubmissionWizard } from "@/components/submission-wizard";

export default function NewSubmissionPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        New submission
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Complete each step to submit your manuscript. Data is mocked — nothing is
        saved to a database yet.
      </p>
      <div className="mt-8">
        <SubmissionWizard />
      </div>
    </div>
  );
}
