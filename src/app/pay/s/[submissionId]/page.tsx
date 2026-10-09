"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApcPayPanel } from "@/components/apc-pay-panel";
import { NahdaLoader } from "@/components/nahda-loader";
import { RequireAuth } from "@/components/require-auth";

type PayInfo = {
  id: string;
  manuscriptId: string;
  title: string;
  apcPaymentStatus?: string | null;
  payment?: {
    amountCents?: number | null;
    amountLabel?: string | null;
  } | null;
};

function AuthorPayInner({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [info, setInfo] = useState<PayInfo | null>(null);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const subRes = await fetch(
          `/api/submissions/${encodeURIComponent(submissionId)}`,
        );
        const subData = await subRes.json();
        if (!subRes.ok) {
          throw new Error(subData.error ?? "Could not load payment");
        }
        const sub = subData.submission as PayInfo;
        setInfo(sub);

        if (
          sub.apcPaymentStatus === "PAID" ||
          sub.apcPaymentStatus === "WAIVED"
        ) {
          setPaid(true);
          router.replace("/dashboard?paid=1");
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
            ? "Payment confirmed. Opening your dashboard…"
            : "Loading PayPal payment instructions…"
        }
      />
    );
  }

  return (
    <div className="mx-auto min-h-[80vh] max-w-2xl bg-[var(--paper)] px-4 py-10 sm:px-6">
      <p className="mb-3 text-sm text-[var(--muted)]">
        <a href="/dashboard" className="font-semibold text-[var(--accent)] hover:underline">
          ← Author dashboard
        </a>
      </p>
      <ApcPayPanel
        submissionId={info.id}
        manuscriptId={info.manuscriptId}
        apcPaymentStatus={info.apcPaymentStatus}
        amountCents={info.payment?.amountCents}
        amountLabel={info.payment?.amountLabel}
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
