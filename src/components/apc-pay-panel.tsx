"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCustomerUsd } from "@/lib/format-usd";
import { NahdaCheckoutModal } from "@/components/nahda-checkout-modal";

type Props = {
  submissionId: string;
  manuscriptId: string;
  apcPaymentStatus?: string | null;
  amountCents?: number | null;
  amountLabel?: string | null;
  onPaid?: () => void;
};

export function ApcPayPanel({
  submissionId,
  manuscriptId,
  apcPaymentStatus,
  amountCents,
  amountLabel: amountLabelProp,
  onPaid,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [paidLabel, setPaidLabel] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  function goToDashboard() {
    router.replace("/dashboard?paid=1");
  }
  const [amountLabel, setAmountLabel] = useState(() => {
    if (amountLabelProp) return amountLabelProp;
    if (amountCents != null && amountCents > 0) {
      return formatCustomerUsd(amountCents);
    }
    return "";
  });

  useEffect(() => {
    if (amountLabelProp) {
      setAmountLabel(amountLabelProp);
    } else if (amountCents != null && amountCents > 0) {
      setAmountLabel(formatCustomerUsd(amountCents));
    }
  }, [amountCents, amountLabelProp]);

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
        goToDashboard();
        return;
      }

      if (typeof data.amountLabel === "string" && data.amountLabel) {
        setAmountLabel(data.amountLabel);
      }
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
          {apcPaymentStatus === "PAID" ? "Payment successful" : "APC status"}
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          {apcPaymentStatus === "PAID"
            ? "Payment received"
            : apcPaymentStatus === "WAIVED"
              ? "APC waived"
              : "No APC required"}
        </h2>
        <p className="mt-2 text-sm text-emerald-900/80">
          {apcPaymentStatus === "PAID"
            ? `Your payment of ${amountLabel || paidLabel || "the article processing charge"} has been received. Thank you for your payment.`
            : "Your manuscript can proceed in production."}
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
        amountLabel={amountLabel}
        onPaid={() => {
          setPaidLabel(amountLabel);
          setInfo(
            `PAYMENT SUCCESSFUL. Your payment of ${amountLabel} has been received. Thank you for your payment.`,
          );
          setCheckoutOpen(false);
          onPaid?.();
          goToDashboard();
        }}
      />

      <section className="mt-6 rounded-2xl border-2 border-[var(--accent)]/30 bg-gradient-to-br from-[var(--accent-soft)] to-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          Payment request
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Amount due
        </h2>
        <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)]">
          {amountLabel || "USD"}
        </p>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Thank you for your order ({manuscriptId}). Please complete your secure
          payment using the button below.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void openCheckout()}
            className="btn-primary !px-4 !py-2.5 text-sm disabled:opacity-60"
          >
            {busy
              ? "Opening…"
              : amountLabel
                ? `Pay ${amountLabel}`
                : "Pay now"}
          </button>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Secure payment • Visa • Mastercard
        </p>
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
