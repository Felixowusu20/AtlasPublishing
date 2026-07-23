"use client";

import { FormEvent, useState } from "react";

type Props = {
  submissionId: string;
  manuscriptId: string;
  onDone?: () => void;
};

export function ResubmitPanel({ submissionId, manuscriptId, onDone }: Props) {
  const [response, setResponse] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Upload your revised manuscript file (PDF preferred).");
      return;
    }
    setLoading(true);
    setError("");
    setOk("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "atlas/manuscripts");
      // raw avoids Cloudinary image/PDF ACL blocks on many accounts
      fd.append("resourceType", "raw");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error ?? "Upload failed");
      }

      const res = await fetch(`/api/submissions/${submissionId}/resubmit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manuscriptUrl: uploadData.url,
          manuscriptPublicId: uploadData.publicId,
          responseToReviewers: response,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Resubmission failed");

      setFile(null);
      setResponse("");
      setOk(
        `${manuscriptId} resubmitted. It is back under review — progress will update on your dashboard.`,
      );
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
      className="mt-4 space-y-3 rounded-xl border border-amber-300 bg-white p-4 shadow-sm"
    >
      <div>
        <p className="text-sm font-semibold text-amber-950">
          Resubmit revised manuscript
        </p>
        <p className="mt-1 text-xs text-amber-900/80">
          Add a short message for the reviewer and upload only the corrected
          file, then click <span className="font-semibold">Resubmit for review</span>.
        </p>
      </div>
      <label className="field">
        <span>Response to reviewers</span>
        <textarea
          required
          rows={4}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Explain how you addressed each comment…"
        />
      </label>
      <label className="field">
        <span>Revised file (PDF preferred)</span>
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
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
      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={loading}>
        {loading ? "Resubmitting…" : "Resubmit for review"}
      </button>
    </form>
  );
}
