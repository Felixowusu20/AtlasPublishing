"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NahdaCheckoutModal } from "@/components/nahda-checkout-modal";
import { NahdaLoader } from "@/components/nahda-loader";
import { RequireAuth } from "@/components/require-auth";

type PayInfo = {
  id: string;
  manuscriptId: string;
  title: string;
  apcPaymentStatus?: string | null;
  payment?: { amountLabel?: string | null } | null;
};

function AuthorPayInner({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [info, setInfo] = useState<PayInfo | null>(null);
  const [amountLabel, setAmountLabel] = useState("");
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [subRes, checkoutRes] = await Promise.all([
          fetch(`/api/submissions/${encodeURIComponent(submissionId)}`),
          fetch("/api/payments/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ submissionId }),
          }),
        ]);
        const subData = await subRes.json();
        const checkoutData = await checkoutRes.json();
        if (!subRes.ok) {
          throw new Error(subData.error ?? "Could not load payment");
        }
        const sub = subData.submission as PayInfo;
        setInfo(sub);

        const alreadyCleared =
          Boolean(checkoutData.alreadyCleared) ||
          sub.apcPaymentStatus === "PAID" ||
          sub.apcPaymentStatus === "WAIVED";
        if (alreadyCleared) {
          setPaid(true);
          router.replace("/dashboard?paid=1");
          return;
        }

        if (typeof checkoutData.amountLabel === "string" && checkoutData.amountLabel) {
          setAmountLabel(checkoutData.amountLabel);
        } else if (sub.payment?.amountLabel) {
          setAmountLabel(sub.payment.amountLabel);
        }

        if (!checkoutRes.ok) {
          throw new Error(checkoutData.error ?? "Could not start checkout");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load payment");
      }
    })();
  }, [submissionId, router]);

  if (error) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-center">
          <p className="text-sm text-rose-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!info || paid) {
    return (
      <NahdaLoader
        variant="screen"
        label={
          paid
            ? "Payment successful. Opening your dashboard…"
            : "Opening secure payment…"
        }
      />
    );
  }

  return (
    <div className="min-h-[80vh] bg-[var(--paper)]">
      <NahdaCheckoutModal
        open
        closable={false}
        onClose={() => undefined}
        submissionId={info.id}
        manuscriptId={info.manuscriptId}
        amountLabel={amountLabel || info.payment?.amountLabel || ""}
        onPaid={() => {
          setPaid(true);
          router.replace("/dashboard?paid=1");
        }}
      />
    </div>
  );
}

export default function AuthorPayPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = use(params);
  return (
    <RequireAuth>
      <AuthorPayInner submissionId={submissionId} />
    </RequireAuth>
  );
}
