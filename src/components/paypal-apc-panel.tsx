"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PAYPAL_ACCOUNT } from "@/lib/paypal";

type Props = {
  submissionId: string;
  manuscriptId: string;
  amountLabel: string;
  journalTitle?: string;
  journalAlias?: string;
  paymentReference?: string | null;
  onReported?: () => void;
};

export function PaypalApcPanel({
  submissionId,
  manuscriptId,
  amountLabel,
  journalTitle,
  journalAlias,
  paymentReference,
  onReported,
}: Props) {
  const router = useRouter();
  const [reference, setReference] = useState(paymentReference ?? "");
  const [alias, setAlias] = useState(journalAlias ?? "");
  const [title, setTitle] = useState(journalTitle ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (paymentReference) setReference(paymentReference);
    if (journalAlias) setAlias(journalAlias);
    if (journalTitle) setTitle(journalTitle);
  }, [paymentReference, journalAlias, journalTitle]);

  useEffect(() => {
    if (reference && alias) return;
    void (async () => {
      try {
        const res = await fetch("/api/payments/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId }),
        });
        const data = await res.json();
        if (!res.ok) return;
        if (typeof data.paymentReference === "string") {
          setReference(data.paymentReference);
        }
        if (typeof data.journalAlias === "string") setAlias(data.journalAlias);
        if (typeof data.journalTitle === "string") setTitle(data.journalTitle);
      } catch {
        // keep props
      }
    })();
  }, [submissionId, reference, alias]);

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }

  async function reportSent() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not notify editors");
      onReported?.();
      router.replace("/dashboard?apc=reported");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not notify editors");
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
      <div className="bg-[var(--accent)] px-5 py-5 text-white sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">
          APC · PayPal
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          {amountLabel || "USD"}
        </p>
        <p className="mt-2 text-sm text-white/85">
          {manuscriptId}
          {title ? ` · ${title}` : ""}
          {alias ? ` (${alias})` : ""}
        </p>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-6">
        <p className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-3.5 py-3 text-sm leading-relaxed text-[var(--ink)]">
          <strong className="text-[var(--accent)]">Nahda Publications PayPal</strong>
          <br />
          Please send your APC to {PAYPAL_ACCOUNT.accountName} ·{" "}
          {PAYPAL_ACCOUNT.email} — the official PayPal account used by Nahda
          Publications for article processing charges.
        </p>

        <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)]/60 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs text-[var(--muted)]">Account name</p>
              <p className="font-semibold text-[var(--ink)]">
                {PAYPAL_ACCOUNT.accountName}
              </p>
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-[var(--accent)]"
              onClick={() => void copy(PAYPAL_ACCOUNT.accountName, "name")}
            >
              {copied === "name" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-[var(--muted)]">PayPal email</p>
              <p className="break-all font-semibold text-[var(--ink)]">
                {PAYPAL_ACCOUNT.email}
              </p>
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-[var(--accent)]"
              onClick={() => void copy(PAYPAL_ACCOUNT.email, "email")}
            >
              {copied === "email" ? "Copied" : "Copy"}
            </button>
          </div>
          {reference ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-rose-800">
                    PayPal note (required)
                  </p>
                  <p className="mt-0.5 break-all font-mono text-xs font-bold text-rose-900">
                    {reference}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-rose-800"
                  onClick={() => void copy(reference, "ref")}
                >
                  {copied === "ref" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-[var(--muted)]">
          <li>Open PayPal and send the amount above (use the required note).</li>
          <li>Come back here and tap “I’ve sent the PayPal payment”.</li>
          <li>
            You’ll return to your author dashboard. After editors confirm, your
            receipt is emailed to the submitting author.
          </li>
        </ol>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={PAYPAL_ACCOUNT.sendUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary !px-4 !py-2.5 text-sm"
          >
            Open PayPal
          </a>
          <button
            type="button"
            disabled={busy}
            onClick={() => void reportSent()}
            className="btn-primary !px-4 !py-2.5 text-sm disabled:opacity-60"
          >
            {busy ? "Saving…" : "I’ve sent the PayPal payment"}
          </button>
        </div>

        {error ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
