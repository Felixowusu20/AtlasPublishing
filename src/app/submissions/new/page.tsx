"use client";

import { RequireAuth } from "@/components/require-auth";
import { SubmissionWizard } from "@/components/submission-wizard";

export default function NewSubmissionPage() {
  return (
    <RequireAuth>
      <div className="page-wrap">
        <h1 className="page-title">New submission</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Complete each step to submit your manuscript. Data is mocked for now
          and is not saved to a database yet.
        </p>
        <div className="mt-8">
          <SubmissionWizard />
        </div>
      </div>
    </RequireAuth>
  );
}
