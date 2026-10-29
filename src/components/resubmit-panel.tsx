"use client";

import { FormEvent, useState } from "react";
import { readApiJson, uploadFileDirect } from "@/lib/client-upload";

type Props = {
  submissionId: string;
  manuscriptId: string;
  onDone?: () => void;
};

export function ResubmitPanel({ submissionId, manuscriptId, onDone }: Props) {
  const [responseFile, setResponseFile] = useState<File | null>(null);
  const [revisedFile, setRevisedFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!responseFile) {
      setError(
        "Upload the file that shows how you addressed the reviewers’ comments.",
      );
      return;
    }
    if (!revisedFile) {
      setError("Upload your revised manuscript.");
      return;
    }
    setLoading(true);
    setError("");
    setOk("");
    try {
      const [responseUpload, manuscriptUpload] = await Promise.all([
        uploadFileDirect(responseFile, {
          folder: "atlas/review-responses",
          resourceType: "raw",
          prepare: false,
        }),
        uploadFileDirect(revisedFile, {
          folder: "atlas/manuscripts",
          resourceType: "raw",
        }),
      ]);

      const res = await fetch(`/api/submissions/${submissionId}/resubmit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manuscriptUrl: manuscriptUpload.url,
          manuscriptPublicId: manuscriptUpload.publicId,
          manuscriptFileName: revisedFile.name,
          responseFileUrl: responseUpload.url,
          responseFilePublicId: responseUpload.publicId,
          responseFileName: responseFile.name,
          responseFileBytes: responseFile.size,
          responseFileResourceType: responseUpload.resourceType,
        }),
      });
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Resubmission failed");

      setResponseFile(null);
      setRevisedFile(null);
      setFileKey((key) => key + 1);
      setOk(`${manuscriptId} resubmitted. It is back under review.`);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resubmit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-white p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <span>Response to reviewers</span>
          <p className="text-xs font-normal text-[var(--muted)]">
            The file that shows how you addressed the comments. Reviewers keep
            this to read.
          </p>
          <input
            key={`response-${fileKey}`}
            type="file"
            accept=".pdf,.doc,.docx,.rtf,.txt,.odt"
            required
            onChange={(e) => setResponseFile(e.target.files?.[0] ?? null)}
          />
          {responseFile ? (
            <p className="text-xs font-medium text-amber-950">
              {responseFile.name}
            </p>
          ) : null}
        </label>
        <label className="field rounded-xl border border-[var(--line)] bg-[var(--surface)]/70 p-3">
          <span>Revised manuscript</span>
          <p className="text-xs font-normal text-[var(--muted)]">
            Replaces the manuscript you originally submitted.
          </p>
          <input
            key={`revised-${fileKey}`}
            type="file"
            accept=".pdf,.doc,.docx,.rtf,.txt,.odt"
            required
            onChange={(e) => setRevisedFile(e.target.files?.[0] ?? null)}
          />
          {revisedFile ? (
            <p className="text-xs font-medium text-[var(--ink)]">
              {revisedFile.name}
            </p>
          ) : null}
        </label>
      </div>
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
      {ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {ok}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Resubmitting…" : "Resubmit for review"}
      </button>
    </form>
  );
}
