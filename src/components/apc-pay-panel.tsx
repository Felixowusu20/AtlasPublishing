"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCustomerUsd } from "@/lib/format-usd";
import { PaypalApcPanel } from "@/components/paypal-apc-panel";

type Props = {
  submissionId: string;
  manuscriptId: string;
  apcPaymentStatus?: string | null;
  amountCents?: number | null;
  amountLabel?: string | null;
  onPaid?: () => void;
  autoOpen?: boolean;
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
  const [amountLabel, setAmountLabel] = useState(() => {
    if (amountLabelProp) return amountLabelProp;
    if (amountCents != null && amountCents > 0) {
      return formatCustomerUsd(amountCents);
    }
    return "";
  });
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [journalAlias, setJournalAlias] = useState<string | undefined>();
  const [journalTitle, setJournalTitle] = useState<string | undefined>();
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (amountLabelProp) {
      setAmountLabel(amountLabelProp);
    } else if (amountCents != null && amountCents > 0) {
      setAmountLabel(formatCustomerUsd(amountCents));
    }
  }, [amountCents, amountLabelProp]);

  useEffect(() => {
    if (apcPaymentStatus !== "PENDING") return;
    void (async () => {
      try {
        const res = await fetch("/api/payments/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId }),
        });
        const data = await res.json();
        if (data.alreadyCleared) {
          setCleared(true);
          onPaid?.();
          router.replace("/dashboard?paid=1");
          return;
        }
        if (typeof data.amountLabel === "string" && data.amountLabel) {
          setAmountLabel(data.amountLabel);
        }
        if (typeof data.paymentReference === "string") {
          setPaymentReference(data.paymentReference);
        }
        if (typeof data.journalAlias === "string") {
          setJournalAlias(data.journalAlias);
        }
        if (typeof data.journalTitle === "string") {
          setJournalTitle(data.journalTitle);
        }
      } catch {
        // panel still shows base props
      }
    })();
  }, [apcPaymentStatus, submissionId, onPaid, router]);

  if (
    cleared ||
    apcPaymentStatus === "PAID" ||
    apcPaymentStatus === "WAIVED" ||
    (apcPaymentStatus === "NOT_REQUIRED" &&
      !(amountCents != null && amountCents > 0))
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
            ? `Your PayPal payment of ${amountLabel || "the article processing charge"} has been received. Thank you for your payment.`
            : "Your manuscript can proceed in production."}
        </p>
      </section>
    );
  }

  return (
    <PaypalApcPanel
      submissionId={submissionId}
      manuscriptId={manuscriptId}
      amountLabel={amountLabel}
      journalTitle={journalTitle}
      journalAlias={journalAlias}
      paymentReference={paymentReference}
    />
  );
}
