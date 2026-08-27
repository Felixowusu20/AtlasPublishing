"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin-auth-provider";
import { NahdaLoader } from "@/components/nahda-loader";

type ReceiptRow = {
  id: string;
  receiptNumber: string;
  paidAt: string;
  amountLabel: string;
  paystackReference: string | null;
  manuscriptId: string;
  title: string;
  journalShortTitle: string;
  authorNames: string[];
  emails: string[];
  downloadPath: string;
};

function todayInput() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function monthAgoInput() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

export default function AdminFinancesPage() {
  const { user } = useAdminAuth();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(monthAgoInput);
  const [to, setTo] = useState(todayInput);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [totals, setTotals] = useState({ count: 0, amountLabel: "$0 USD" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(next?: { q?: string; from?: string; to?: string }) {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    const query = (next?.q ?? q).trim();
    const fromDate = next?.from ?? from;
    const toDate = next?.to ?? to;
    if (query) params.set("q", query);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    try {
      const res = await fetch(`/api/admin/receipts?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load receipts");
      setReceipts(data.receipts ?? []);
      setTotals({
        count: data.totals?.count ?? 0,
        amountLabel: data.totals?.amountLabel ?? "$0 USD",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load receipts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial range only
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    void load();
  }

  if (user && user.role !== "SUPER_ADMIN") {
    return (
      <p className="rounded-xl border border-[var(--line)] bg-white p-6 text-sm text-[var(--muted)]">
        Finances are available to super admins only.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
            Finances
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Paid APC receipts. Search by receipt ID, author name, or email, and
            narrow by paid date.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            In this range
          </p>
          <p className="text-lg font-semibold text-[var(--accent)]">
            {totals.amountLabel}
          </p>
          <p className="text-xs text-[var(--muted)]">
            {totals.count} {totals.count === 1 ? "receipt" : "receipts"}
          </p>
        </div>
      </div>

      <form
        onSubmit={onSearch}
        className="mt-6 grid gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1fr_10rem_10rem_auto]"
      >
        <label className="field sm:col-span-2 lg:col-span-1">
          <span>Receipt ID, email, or author name</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="NPR-…, name, or email"
          />
        </label>
        <label className="field">
          <span>From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="field">
          <span>To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full !px-4 !py-2.5">
            Search
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        {loading ? (
          <NahdaLoader variant="panel" label="Loading receipts…" />
        ) : receipts.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[var(--muted)]">
            No receipts match this search.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--line)] bg-[var(--surface)]/70 text-[10px] uppercase tracking-wider text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Receipt</th>
                  <th className="px-4 py-3 font-semibold">Paid</th>
                  <th className="px-4 py-3 font-semibold">Authors</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Manuscript</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {receipts.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--line)] last:border-0"
                  >
                    <td className="px-4 py-3 align-top">
                      <p className="font-mono text-xs font-semibold">
                        {row.receiptNumber}
                      </p>
                      {row.paystackReference && (
                        <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
                          {row.paystackReference}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-[var(--muted)]">
                      {new Date(row.paidAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm">{row.authorNames.join(", ")}</p>
                      <p className="mt-1 text-[11px] text-[var(--muted)]">
                        {row.emails.join(", ")}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top font-semibold">
                      {row.amountLabel}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-xs font-medium">
                        {row.journalShortTitle} · {row.manuscriptId}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
                        {row.title}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-1">
                        <a
                          href={row.downloadPath}
                          className="text-xs font-semibold text-[var(--accent)] hover:underline"
                        >
                          Download
                        </a>
                        <a
                          href={`/api/admin/receipts/${row.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-[var(--muted)] hover:underline"
                        >
                          View
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
