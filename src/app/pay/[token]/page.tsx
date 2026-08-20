"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NahdaCheckoutModal } from "@/components/nahda-checkout-modal";
import { NahdaLoader } from "@/components/nahda-loader";

type PayInfo = {
  submissionId: string;
  manuscriptId: string;
  title: string;
  journalTitle: string;
  amountLabel: string | null;
  alreadyCleared: boolean;
  status: string | null;
};

export default function PayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: rawToken } = use(params);
  const token = decodeURIComponent(rawToken);
  const router = useRouter();
  const [info, setInfo] = useState<PayInfo | null>(null);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);

  function goToDashboard() {
    router.replace("/dashboard?paid=1");
  }

  useEffect(() => {
    void fetch(`/api/payments/request?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load payment");
        setInfo(data as PayInfo);
        if (data.alreadyCleared) {
          setPaid(true);
          router.replace("/dashboard?paid=1");
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load payment");
      });
  }, [token, router]);

  if (error) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-center">
          <p className="text-sm text-rose-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!info) {
    return <NahdaLoader variant="screen" label="Opening secure payment…" />;
  }

  if (paid || info.alreadyCleared) {
    return (
      <NahdaLoader variant="screen" label="Payment successful. Opening your dashboard…" />
    );
  }

  return (
    <div className="min-h-[80vh] bg-[var(--paper)]">
      <NahdaCheckoutModal
        open
        closable={false}
        onClose={() => undefined}
        submissionId={info.submissionId}
        manuscriptId={info.manuscriptId}
        amountLabel={info.amountLabel || ""}
        payToken={token}
        onPaid={() => {
          setPaid(true);
          goToDashboard();
        }}
      />
    </div>
  );
}
