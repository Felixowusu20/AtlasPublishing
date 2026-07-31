"use client";

import { useEffect, useState } from "react";

type Props = {
  submissionId: string;
  manuscriptId: string;
  apcPaymentStatus?: string | null;
  amountCents?: number | null;
  onPaid?: () => void;
};

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function ApcPayPanel({
  submissionId,
  manuscriptId,
  apcPaymentStatus,
  amountCents,
  onPaid,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function confirmPaid(sessionId?: string | null) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          ...(sessionId ? { sessionId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not confirm payment");
      setInfo("Payment confirmed. Your manuscript is now in production.");
      onPaid?.();
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.pathname);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirm failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const sessionId = params.get("session_id");
    if (payment === "cancelled") {
      setInfo("Checkout cancelled.");
      return;
    }
    if (payment === "success") {
      void confirmPaid(sessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  if (
    apcPaymentStatus === "PAID" ||
    apcPaymentStatus === "WAIVED" ||
    apcPaymentStatus === "NOT_REQUIRED"
  ) {
    return (
      <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
          {apcPaymentStatus === "PAID"
            ? "Paid"
            : apcPaymentStatus === "WAIVED"
              ? "Waived"
              : "No charge"}
        </p>
        <p className="mt-1 text-sm text-emerald-950/90">
          {manuscriptId} is in production. You will receive an email when it is
          published.
        </p>
      </section>
    );
  }

  if (apcPaymentStatus !== "PENDING") return null;

  async function startCheckout() {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout");
      if (data.alreadyCleared) {
        setInfo("Already cleared.");
        onPaid?.();
        return;
      }
      if (!data.checkoutUrl) {
        throw new Error("No checkout URL returned");
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border-2 border-[var(--accent)]/30 bg-gradient-to-br from-[var(--accent-soft)] to-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
        Payment required
      </p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
        Article processing charge
        {amountCents != null && amountCents > 0
          ? `: ${formatCents(amountCents)}`
          : ""}
      </h2>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void startCheckout()}
          className="btn-primary !px-4 !py-2.5 text-sm disabled:opacity-60"
        >
          {busy ? "Working…" : "Pay now"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void confirmPaid()}
          className="btn-secondary !px-4 !py-2.5 text-sm disabled:opacity-60"
        >
          I’ve paid
        </button>
      </div>
      {info && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {info}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
    </section>
  );
}
