"use client";

import { Suspense } from "react";
import { NahdaLoader } from "@/components/nahda-loader";
import { RequireAuth } from "@/components/require-auth";
import { SubmissionWizard } from "@/components/submission-wizard";

export default function NewSubmissionPage() {
  return (
    <RequireAuth>
      <div className="page-wrap">
        <h1 className="page-title">New submission</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Complete each step to submit your manuscript. Files upload to
          Cloudinary and the record is saved for review.
        </p>
        <div className="mt-8">
          <Suspense
            fallback={<NahdaLoader variant="panel" label="Loading wizard…" />}
          >
            <SubmissionWizard />
          </Suspense>
        </div>
      </div>
    </RequireAuth>
  );
}
