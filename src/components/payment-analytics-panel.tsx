"use client";

import { useCallback, useEffect, useState } from "react";
import { NahdaLoader } from "@/components/nahda-loader";

const PALETTE = [
  "#1e6847",
  "#2a7f9e",
  "#d65c33",
  "#6b5b95",
  "#c4a35a",
  "#3d6f8f",
  "#8b4513",
  "#4a7c59",
];

type RangePreset = "daily" | "weekly" | "monthly" | "annual" | "custom";

type JournalPaymentSlice = {
  id: string;
  shortTitle: string;
  title: string;
  amountCents: number;
  amountLabel: string;
  count: number;
  pct: number;
};

type PaymentAnalytics = {
  range: {
    preset: RangePreset;
    label: string;
    from: string;
    to: string;
  };
  totals: {
    amountCents: number;
    amountLabel: string;
    payments: number;
    pending: number;
    waived: number;
  };
  byJournal: JournalPaymentSlice[];
};

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "annual", label: "Annual" },
  { id: "custom", label: "Custom" },
];

function toInputDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function piePath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  if (endAngle - startAngle >= 359.99) {
    // Full circle — use two arcs
    const mid = startAngle + 180;
    const a = polar(cx, cy, r, startAngle);
    const b = polar(cx, cy, r, mid);
    return [
      `M ${cx} ${cy}`,
      `L ${a.x} ${a.y}`,
      `A ${r} ${r} 0 1 1 ${b.x} ${b.y}`,
      `A ${r} ${r} 0 1 1 ${a.x} ${a.y}`,
      "Z",
    ].join(" ");
  }
  const start = polar(cx, cy, r, endAngle);
  const end = polar(cx, cy, r, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function PaymentPieChart({ slices }: { slices: JournalPaymentSlice[] }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 92;

  if (slices.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)]/40 px-4 text-center text-sm text-[var(--muted)]">
        No paid APC in this range yet.
      </div>
    );
  }

  const total = slices.reduce((s, x) => s + x.amountCents, 0);
  let angle = 0;
  const wedges = slices.map((s, i) => {
    const sweep =
      total > 0 ? (s.amountCents / total) * 360 : 360 / slices.length;
    const start = angle;
    const end = angle + Math.max(sweep, s.amountCents > 0 ? 0.35 : 0);
    angle = end;
    return {
      ...s,
      color: PALETTE[i % PALETTE.length]!,
      d: piePath(cx, cy, r, start, end),
    };
  });

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start">
      <div className="relative shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="drop-shadow-sm"
          role="img"
          aria-label="APC payments by journal"
        >
          <circle cx={cx} cy={cy} r={r} fill="#f3f6f9" />
          {wedges.map((w) => (
            <path key={w.id} d={w.d} fill={w.color} stroke="white" strokeWidth="2">
              <title>
                {w.shortTitle}: {w.amountLabel} ({w.pct}%)
              </title>
            </path>
          ))}
          <circle cx={cx} cy={cy} r={48} fill="white" />
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            className="fill-[var(--ink)]"
            fontSize="11"
            fontWeight="600"
          >
            Total
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            className="fill-[var(--accent)]"
            fontSize="13"
            fontWeight="700"
          >
            {slices.length} jrn
          </text>
        </svg>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-2.5">
        {wedges.map((w) => (
          <li
            key={w.id}
            className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)]/35 px-3 py-2.5"
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white"
              style={{ background: w.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--ink)]">
                {w.shortTitle}
              </p>
              <p className="truncate text-[11px] text-[var(--muted)]" title={w.title}>
                {w.count} payment{w.count === 1 ? "" : "s"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums text-[var(--ink)]">
                {w.amountLabel}
              </p>
              <p className="text-[11px] font-medium tabular-nums text-[var(--accent)]">
                {w.pct}%
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PaymentAnalyticsPanel() {
  const [preset, setPreset] = useState<RangePreset>("monthly");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<PaymentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPayments = useCallback(
    async (range: RangePreset, fromDate?: string, toDate?: string) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ range });
        if (range === "custom") {
          if (!fromDate || !toDate) {
            setLoading(false);
            return;
          }
          params.set("from", fromDate);
          params.set("to", toDate);
        }
        const res = await fetch(`/api/admin/analytics/payments?${params}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not load payments");
        setData(json as PaymentAnalytics);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (preset === "custom") return;
    void fetchPayments(preset);
  }, [preset, fetchPayments]);

  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink)]">
            Payment analytics
          </h2>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            APC revenue by journal (USD) — pie share, totals, and date range
          </p>
        </div>
        {data?.range.label ? (
          <p className="text-xs font-medium text-[var(--accent)]">
            {data.range.label}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[var(--line)] px-4 py-3.5 sm:px-5">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPreset(p.id);
                  if (p.id === "custom" && data?.range) {
                    setFrom(toInputDate(data.range.from));
                    setTo(toInputDate(data.range.to));
                  }
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  preset === p.id
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {preset === "custom" ? (
            <div className="flex flex-wrap items-end gap-3">
              <label className="field !mb-0 min-w-[140px] flex-1">
                <span>From</span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label className="field !mb-0 min-w-[140px] flex-1">
                <span>To</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn-primary !px-4 !py-2 text-sm"
                disabled={!from || !to || loading}
                onClick={() => void fetchPayments("custom", from, to)}
              >
                Apply range
              </button>
            </div>
          ) : null}
        </div>

        <div className="p-4 sm:p-5">
          {loading && !data ? (
            <NahdaLoader variant="panel" label="Loading payment analytics…" />
          ) : error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : data ? (
            <>
              <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MiniStat
                  label="Total collected"
                  value={data.totals.amountLabel}
                  hint="Paid APC (USD)"
                  tone="teal"
                />
                <MiniStat
                  label="Payments"
                  value={String(data.totals.payments)}
                  hint="Successful charges"
                  tone="sky"
                />
                <MiniStat
                  label="Pending"
                  value={String(data.totals.pending)}
                  hint="Awaiting author pay"
                  tone="amber"
                />
                <MiniStat
                  label="Waived"
                  value={String(data.totals.waived)}
                  hint="Admin waivers"
                  tone="violet"
                />
              </div>

              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Share by journal
                </p>
                {loading ? (
                  <span className="text-[11px] text-[var(--muted)]">Refreshing…</span>
                ) : null}
              </div>
              <PaymentPieChart slices={data.byJournal} />
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function MiniStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "teal" | "sky" | "amber" | "violet";
}) {
  const tones = {
    teal: "border-teal-100 bg-teal-50/80",
    sky: "border-sky-100 bg-sky-50/80",
    amber: "border-amber-100 bg-amber-50/80",
    violet: "border-violet-100 bg-violet-50/80",
  };
  return (
    <div className={`rounded-xl border px-3.5 py-3 ${tones[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--ink)]">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-[var(--muted)]">{hint}</p>
    </div>
  );
}
