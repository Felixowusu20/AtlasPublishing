"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin-auth-provider";
import { NahdaLoader } from "@/components/nahda-loader";

type InboxItem = {
  paymentId: string;
  reportedAt: string;
  amountCents: number;
  amountLabel: string;
  paypalReference: string | null;
  submission: {
    id: string;
    manuscriptId: string;
    title: string;
    status: string;
    apcPaymentStatus: string;
    author: { name: string; email: string };
    journal: { title: string; shortTitle: string | null };
  };
};

export default function AdminApcInboxPage() {
  const { user } = useAdminAuth();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/payments/awaiting");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load inbox");
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load inbox");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function confirmPayment(item: InboxItem) {
    if (
      !window.confirm(
        `Confirm PayPal APC (${item.amountLabel}) for ${item.submission.manuscriptId}? A receipt will be emailed to ${item.submission.author.email}.`,
      )
    ) {
      return;
    }
    setBusyId(item.submission.id);
    setSuccess("");
    setError("");
    try {
      const res = await fetch("/api/admin/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: item.submission.id,
          paypalReference: item.paypalReference ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not confirm");
      setSuccess(
        `Confirmed ${item.submission.manuscriptId}. Receipt sent to ${data.receiptSentTo ?? item.submission.author.email}.`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm");
    } finally {
      setBusyId(null);
    }
  }

  async function waivePayment(item: InboxItem) {
    if (
      !window.confirm(
        `Waive APC for ${item.submission.manuscriptId}? The manuscript will move to production without payment.`,
      )
    ) {
      return;
    }
    setBusyId(item.submission.id);
    setSuccess("");
    setError("");
    try {
      const res = await fetch("/api/admin/payments/waive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: item.submission.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not waive");
      setSuccess(`APC waived for ${item.submission.manuscriptId}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not waive");
    } finally {
      setBusyId(null);
    }
  }

  if (user && user.role !== "SUPER_ADMIN" && user.role !== "REVIEWER") {
    return (
      <p className="rounded-xl border border-[var(--line)] bg-white p-6 text-sm text-[var(--muted)]">
        Editors only.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            Finances
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)] sm:text-3xl">
            APC awaiting confirmation
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Authors who clicked “I’ve sent payment” after a PayPal transfer.
            Confirm when funds arrive (receipt emailed), or waive if approved.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink)]"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      {loading ? (
        <NahdaLoader variant="panel" label="Loading APC inbox…" />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white p-8 text-center text-sm text-[var(--muted)]">
          No reported payments waiting. When authors mark PayPal as sent, they
          appear here.
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const busy = busyId === item.submission.id;
            return (
              <li
                key={item.paymentId}
                className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2.5">
                  <span className="rounded-full bg-amber-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Payment reported
                  </span>
                  <span className="text-xs text-amber-950/80">
                    Reported{" "}
                    {new Date(item.reportedAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <div className="space-y-3 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--accent)]">
                        {item.submission.manuscriptId}
                      </p>
                      <h2 className="mt-1 font-semibold leading-snug text-[var(--ink)]">
                        {item.submission.title}
                      </h2>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {item.submission.journal.shortTitle ||
                          item.submission.journal.title}{" "}
                        · {item.submission.author.name} (
                        {item.submission.author.email})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--ink)]">
                        {item.amountLabel}
                      </p>
                      {item.paypalReference ? (
                        <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
                          {item.paypalReference}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void confirmPayment(item)}
                      className="btn-primary !px-3 !py-2 text-xs disabled:opacity-50"
                    >
                      {busy ? "Working…" : "Confirm PayPal payment"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void waivePayment(item)}
                      className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--muted)] disabled:opacity-50"
                    >
                      Waive APC
                    </button>
                    <Link
                      href={`/admin/submissions/${item.submission.id}`}
                      className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink)]"
                    >
                      Open submission
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-[var(--muted)]">
        Paid receipts stay under{" "}
        <Link href="/admin/finances" className="font-semibold text-[var(--accent)]">
          Finances
        </Link>
        .
      </p>
    </div>
  );
}
