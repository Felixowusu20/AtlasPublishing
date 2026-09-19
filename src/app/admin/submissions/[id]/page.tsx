"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, use } from "react";
import { ManuscriptViewer } from "@/components/manuscript-viewer";
import { NahdaLoader } from "@/components/nahda-loader";
import { FeedbackHistory } from "@/components/feedback-history";
import { readApiJson, uploadFileDirect } from "@/lib/client-upload";
import { formatBytes } from "@/lib/prepare-upload-file";
import { formatArticleDate } from "@/lib/article-dates";
import { uiStatus } from "@/lib/submission-utils";

const statuses = [
  "TECHNICAL_CHECK",
  "UNDER_REVIEW",
  "MAJOR_REVISION",
  "MINOR_REVISION",
  "ACCEPTED",
  "REJECTED",
  "IN_PRODUCTION",
  "PUBLISHED",
] as const;

type Feedback = {
  id: string;
  message: string;
  status: (typeof statuses)[number];
  createdAt: string;
  reviewer: { name: string };
  fileUrl?: string | null;
  fileName?: string | null;
  fileBytes?: number | null;
};

type Submission = {
  id: string;
  manuscriptId: string;
  title: string;
  abstract: string;
  keywords: string[];
  articleType: string;
  status: (typeof statuses)[number] | "SUBMITTED" | "DRAFT";
  progress: number;
  apcPaymentStatus?: string | null;
  manuscriptUrl?: string | null;
  manuscriptPublicId?: string | null;
  coverLetter?: string | null;
  author: { name: string; email: string; institution?: string | null };
  journal: { title: string; apc?: string | null };
  submittedAt?: string | null;
  payment?: {
    amountCents: number;
    amountLabel?: string;
    status: string;
    paidAt?: string | null;
    internalAmount?: number | null;
    internalCurrency?: string | null;
    internalAmountLabel?: string | null;
    exchangeRate?: number | null;
    paystackReference?: string | null;
  } | null;
  feedback: Feedback[];
};

export default function AdminSubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [status, setStatus] = useState<(typeof statuses)[number]>("UNDER_REVIEW");
  const [message, setMessage] = useState("");
  const [reviewFile, setReviewFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [actionRequired, setActionRequired] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const [waiving, setWaiving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/submissions/${id}`);
    const data = await res.json();
    if (res.ok) {
      setSubmission(data.submission);
      if (
        statuses.includes(
          data.submission.status as (typeof statuses)[number],
        )
      ) {
        setStatus(data.submission.status);
      }
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per submission id
  }, [id]);

  async function waiveApc() {
    if (!submission) return;
    setWaiving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/payments/waive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: submission.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not waive APC");
      setSubmission(data.submission);
      setSuccess("APC waived. Status set to In Production.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Waive failed");
    } finally {
      setWaiving(false);
    }
  }

  async function confirmPaypalApc() {
    if (!submission) return;
    if (
      !confirm(
        "Confirm that PayPal APC payment was received for this manuscript? The submitting author will be emailed a Nahda receipt.",
      )
    ) {
      return;
    }
    setConfirming(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: submission.id,
          paypalReference: submission.payment?.paystackReference ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not confirm payment");
      if (data.submission) setSubmission(data.submission);
      else await load();
      setSuccess(
        `PayPal APC confirmed. Receipt emailed to ${data.receiptSentTo ?? submission.author.email}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirm failed");
    } finally {
      setConfirming(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const comment = message.trim();
    if (!reviewFile && comment.length < 10) {
      setError("Write a short comment, or attach a review file.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      let filePayload: {
        fileUrl?: string;
        filePublicId?: string;
        fileName?: string;
        fileBytes?: number;
        fileResourceType?: string;
      } = {};
      if (reviewFile) {
        const uploaded = await uploadFileDirect(reviewFile, {
          folder: "atlas/review-files",
          resourceType: "raw",
          prepare: false,
        });
        filePayload = {
          fileUrl: uploaded.url,
          filePublicId: uploaded.publicId,
          fileName: reviewFile.name,
          fileBytes: reviewFile.size,
          fileResourceType: ["image", "raw", "video", "auto"].includes(
            uploaded.resourceType,
          )
            ? uploaded.resourceType
            : "raw",
        };
      }

      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          message: comment,
          actionRequired: actionRequired || undefined,
          assignToMe: true,
          ...filePayload,
        }),
      });
      const data = await readApiJson<{
        error?: string;
        submission?: Submission;
        emailSent?: boolean;
        checkoutUrl?: string;
        apcAmountLabel?: string;
      }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "Failed");
      }
      setMessage("");
      setActionRequired("");
      setReviewFile(null);
      setFileInputKey((n) => n + 1);
      if (data.submission) setSubmission(data.submission);
      if (status === "ACCEPTED") {
        setSuccess(
          data.checkoutUrl
            ? `Accepted. Payment link sent${data.apcAmountLabel ? ` (${data.apcAmountLabel})` : ""}.`
            : data.emailSent
              ? "Accepted. No APC due; moved toward production."
              : "Accepted.",
        );
      } else {
        setSuccess(
          data.emailSent
            ? "Feedback sent. The author was emailed and can download the file from their dashboard."
            : "Feedback saved.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (!submission) {
    return <NahdaLoader variant="panel" label="Loading submission…" />;
  }

  return (
    <div>
      <Link
        href="/admin/submissions"
        className="text-xs font-semibold text-[var(--accent)]"
      >
        ← Inbox
      </Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 font-semibold text-[var(--accent)]">
              {uiStatus(submission.status as Parameters<typeof uiStatus>[0])}
            </span>
            <span className="text-[var(--muted)]">{submission.manuscriptId}</span>
          </div>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
            {submission.title}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {submission.author.name} ({submission.author.email}) ·{" "}
            {submission.journal.title} · {submission.articleType}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Submitted{" "}
            <span className="font-medium text-[var(--ink)]">
              {formatArticleDate(submission.submittedAt) || "—"}
            </span>
          </p>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-[var(--muted)]">
              <span>Author-visible progress</span>
              <span>{submission.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${submission.progress}%` }}
              />
            </div>
          </div>

          <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5">
            <h2 className="text-sm font-semibold">Abstract</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              {submission.abstract}
            </p>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Keywords: {submission.keywords.join(", ")}
            </p>
          </section>

          {submission.payment && (
            <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5 text-sm">
              <h2 className="text-sm font-semibold">APC payment (admin)</h2>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-[var(--muted)]">
                    Customer price
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {submission.payment.amountLabel ??
                      `$${(submission.payment.amountCents / 100).toLocaleString("en-US")} USD`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-[var(--muted)]">
                    Payment status
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {submission.payment.status}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-[var(--muted)]">
                    Amount (USD)
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    {submission.payment.amountLabel ??
                      `$${(submission.payment.amountCents / 100).toLocaleString("en-US")} USD`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-[var(--muted)]">
                    Method
                  </dt>
                  <dd className="mt-0.5 font-medium">PayPal</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wider text-[var(--muted)]">
                    Payment reference
                  </dt>
                  <dd className="mt-0.5 font-mono text-xs">
                    {submission.payment.paystackReference ?? "—"}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          {submission.manuscriptUrl && (
            <section className="mt-6">
              <ManuscriptViewer
                url={submission.manuscriptUrl}
                publicId={submission.manuscriptPublicId}
                title={`${submission.manuscriptId} — manuscript`}
              />
            </section>
          )}

          <section className="mt-6">
            <FeedbackHistory
              submissionId={submission.id}
              items={submission.feedback}
            />
          </section>
        </div>

        <form
          onSubmit={onSubmit}
          className="h-fit space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold">Send review feedback</h2>
          <p className="text-xs text-[var(--muted)]">
            Attach a review file (any format or size) and an optional comment.
            The author is emailed and can download the file from their dashboard.
          </p>
          <label className="field">
            <span>New status</span>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as (typeof statuses)[number])
              }
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {uiStatus(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Comment to author (optional with a file)</span>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Optional note. Required only if you do not attach a file."
            />
          </label>
          <label className="field">
            <span>Review file (any format, any size)</span>
            <input
              key={fileInputKey}
              type="file"
              onChange={(e) => setReviewFile(e.target.files?.[0] ?? null)}
            />
            {reviewFile && (
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                {reviewFile.name} · {formatBytes(reviewFile.size)}
              </p>
            )}
          </label>
          <label className="field">
            <span>Action required (optional)</span>
            <input
              value={actionRequired}
              onChange={(e) => setActionRequired(e.target.value)}
              placeholder="Shown as alert on author dashboard"
            />
          </label>
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          {success && (
            <div className="space-y-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
              <p>{success}</p>
              {(submission.status === "IN_PRODUCTION" ||
                (submission.status === "ACCEPTED" &&
                  submission.apcPaymentStatus !== "PENDING")) && (
                <Link
                  href={`/admin/publishedArticles?id=${submission.id}`}
                  className="btn-primary inline-flex !px-3 !py-2 text-xs"
                >
                  Open Publish papers
                </Link>
              )}
            </div>
          )}
          {(submission.status === "ACCEPTED" ||
            submission.status === "IN_PRODUCTION") && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
              <p className="font-medium">
                {submission.apcPaymentStatus === "PENDING"
                  ? "Waiting for APC payment"
                  : submission.status === "IN_PRODUCTION"
                    ? "In production"
                    : "Ready for production"}
              </p>
              {submission.apcPaymentStatus === "PENDING" ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={confirming}
                    onClick={() => void confirmPaypalApc()}
                    className="text-xs font-semibold text-[var(--accent)] underline disabled:opacity-50"
                  >
                    {confirming ? "Confirming…" : "Confirm PayPal payment"}
                  </button>
                  <button
                    type="button"
                    disabled={waiving}
                    onClick={() => void waiveApc()}
                    className="text-xs font-semibold text-[var(--muted)] underline disabled:opacity-50"
                  >
                    {waiving ? "Waiving…" : "Waive APC"}
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/admin/manuscripts?id=${submission.id}`}
                    className="text-xs font-semibold text-[var(--accent)] underline"
                  >
                    Full manuscripts
                  </Link>
                  <Link
                    href={`/admin/publishedArticles?id=${submission.id}`}
                    className="text-xs font-semibold text-[var(--accent)] underline"
                  >
                    Publish papers
                  </Link>
                </div>
              )}
            </div>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading
              ? reviewFile
                ? "Uploading and sending…"
                : "Sending…"
              : "Send feedback"}
          </button>
        </form>
      </div>
    </div>
  );
}
