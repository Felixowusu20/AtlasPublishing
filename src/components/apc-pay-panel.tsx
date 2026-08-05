"use client";

import { useEffect, useState } from "react";
import { NahdaCheckoutModal } from "@/components/nahda-checkout-modal";

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
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [amountLabel, setAmountLabel] = useState(
    amountCents != null && amountCents > 0 ? formatCents(amountCents) : "",
  );

  useEffect(() => {
    if (amountCents != null && amountCents > 0) {
      setAmountLabel(formatCents(amountCents));
    }
  }, [amountCents]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      void confirmPaid();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount for return URL
  }, []);

  async function confirmPaid(reference?: string | null) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          ...(reference ? { reference } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not confirm payment");
      setInfo(
        "Payment confirmed. Your manuscript is now in production — check your email for the Nahda Publications receipt.",
      );
      onPaid?.();
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      window.history.replaceState({}, "", url.pathname + url.search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm payment");
    } finally {
      setBusy(false);
    }
  }

  async function openCheckout() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout");

      if (data.alreadyCleared) {
        setInfo("This manuscript’s APC is already cleared.");
        onPaid?.();
        return;
      }

      if (data.amountLabel) setAmountLabel(data.amountLabel as string);
      setCheckoutOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  if (
    apcPaymentStatus === "PAID" ||
    apcPaymentStatus === "WAIVED" ||
    apcPaymentStatus === "NOT_REQUIRED"
  ) {
    return (
      <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
          APC status
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          {apcPaymentStatus === "PAID"
            ? "Payment received"
            : apcPaymentStatus === "WAIVED"
              ? "APC waived"
              : "No APC required"}
        </h2>
        <p className="mt-2 text-sm text-emerald-900/80">
          Your manuscript can proceed in production.
        </p>
      </section>
    );
  }

  return (
    <>
      <NahdaCheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        submissionId={submissionId}
        manuscriptId={manuscriptId}
        amountLabel={amountLabel || "USD"}
        onPaid={() => {
          setInfo(
            "Payment confirmed. Your manuscript is now in production — check your email for the Nahda Publications receipt.",
          );
          setCheckoutOpen(false);
          onPaid?.();
        }}
      />

      <section className="mt-6 rounded-2xl border-2 border-[var(--accent)]/30 bg-gradient-to-br from-[var(--accent-soft)] to-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          Payment required
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Article processing charge
          {amountCents != null && amountCents > 0
            ? `: ${formatCents(amountCents)} USD`
            : amountLabel
              ? `: ${amountLabel} USD`
              : ""}
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Amount due is shown in US dollars. Pay securely on the Nahda checkout
          — you will receive an official Nahda Publications receipt by email.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void openCheckout()}
            className="btn-primary !px-4 !py-2.5 text-sm disabled:opacity-60"
          >
            {busy ? "Opening…" : "Pay now"}
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
    </>
  );
}
