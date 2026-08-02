"use client";

import Link from "next/link";

export type JournalSlice = {
  id: string;
  shortTitle: string;
  title: string;
  articles: number;
  views: number;
  downloads: number;
};

export type MonthPoint = {
  key: string;
  label: string;
  published: number;
  views: number;
  downloads: number;
};

export type EngagementBar = {
  id: string;
  label: string;
  fullTitle: string;
  slug: string;
  views: number;
  downloads: number;
};

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

function formatNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

/** Dual metric bars: views vs downloads for top papers. */
export function EngagementChart({ items }: { items: EngagementBar[] }) {
  if (items.length === 0) {
    return <EmptyChart message="Publish articles to see engagement." />;
  }

  const max = Math.max(
    1,
    ...items.flatMap((i) => [i.views, i.downloads]),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--accent)]" />
          Views
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#d65c33]" />
          Downloads
        </span>
      </div>
      <ul className="space-y-3.5">
        {items.map((item) => (
          <li key={item.id}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <Link
                href={`/articles/${item.slug}`}
                className="truncate text-xs font-semibold text-[var(--ink)] hover:text-[var(--accent)]"
                title={item.fullTitle}
              >
                {item.label}
              </Link>
              <span className="shrink-0 text-[10px] tabular-nums text-[var(--muted)]">
                {formatNum(item.views)} / {formatNum(item.downloads)}
              </span>
            </div>
            <div className="space-y-1">
              <BarTrack
                value={item.views}
                max={max}
                color="var(--accent)"
                label="Views"
              />
              <BarTrack
                value={item.downloads}
                max={max}
                color="#d65c33"
                label="Downloads"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarTrack({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const pct = Math.max(2, Math.round((value / max) * 100));
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-[var(--surface)]"
      title={`${label}: ${value.toLocaleString()}`}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

/** Area + column chart for monthly publish / reach trend. */
export function TrendChart({ months }: { months: MonthPoint[] }) {
  if (months.every((m) => m.published === 0 && m.views === 0 && m.downloads === 0)) {
    return <EmptyChart message="Trend data appears as papers are published." />;
  }

  const w = 560;
  const h = 200;
  const pad = { t: 16, r: 12, b: 32, l: 36 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const maxY = Math.max(
    1,
    ...months.map((m) => Math.max(m.views, m.downloads)),
  );
  const maxPub = Math.max(1, ...months.map((m) => m.published));
  const step = innerW / Math.max(months.length - 1, 1);

  function y(v: number) {
    return pad.t + innerH - (v / maxY) * innerH;
  }

  const viewPts = months
    .map((m, i) => `${pad.l + i * step},${y(m.views)}`)
    .join(" ");
  const dlPts = months
    .map((m, i) => `${pad.l + i * step},${y(m.downloads)}`)
    .join(" ");

  const areaPath = [
    `M ${pad.l} ${pad.t + innerH}`,
    ...months.map((m, i) => `L ${pad.l + i * step} ${y(m.views)}`),
    `L ${pad.l + (months.length - 1) * step} ${pad.t + innerH}`,
    "Z",
  ].join(" ");

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-[var(--accent)]/40" />
          Views
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-[#d65c33]" />
          Downloads
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#2a7f9e]/70" />
          Published
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full"
        role="img"
        aria-label="Monthly views, downloads, and publishes"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const gy = pad.t + innerH * (1 - t);
          return (
            <g key={t}>
              <line
                x1={pad.l}
                x2={w - pad.r}
                y1={gy}
                y2={gy}
                stroke="#e8eef3"
                strokeWidth="1"
              />
              <text
                x={pad.l - 6}
                y={gy + 3}
                textAnchor="end"
                fontSize="9"
                fill="#8a97a6"
              >
                {formatNum(Math.round(maxY * t))}
              </text>
            </g>
          );
        })}

        {/* Published as soft columns (own scale) */}
        {months.map((m, i) => {
          const barH =
            m.published > 0
              ? Math.max(8, (m.published / maxPub) * innerH * 0.45)
              : 0;
          const cx = pad.l + i * step;
          return (
            <rect
              key={`pub-${m.key}`}
              x={cx - 8}
              y={pad.t + innerH - barH}
              width={16}
              height={barH}
              rx={3}
              fill="#2a7f9e"
              opacity={0.28}
            >
              <title>
                {m.label}: {m.published} published
              </title>
            </rect>
          );
        })}

        <path d={areaPath} fill="var(--accent)" opacity="0.12" />
        <polyline
          points={viewPts}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.25"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polyline
          points={dlPts}
          fill="none"
          stroke="#d65c33"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="4 3"
        />

        {months.map((m, i) => (
          <g key={m.key}>
            <circle
              cx={pad.l + i * step}
              cy={y(m.views)}
              r="3.5"
              fill="white"
              stroke="var(--accent)"
              strokeWidth="2"
            />
            <text
              x={pad.l + i * step}
              y={h - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#5b6b7c"
            >
              {m.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Donut chart: article share (or views) by journal. */
export function JournalDonut({ journals }: { journals: JournalSlice[] }) {
  const active = journals.filter((j) => j.articles > 0 || j.views > 0);
  if (active.length === 0) {
    return <EmptyChart message="Journal share appears after publishing." />;
  }

  const metric = active.some((j) => j.views > 0) ? "views" : "articles";
  const total = active.reduce(
    (s, j) => s + (metric === "views" ? j.views : j.articles),
    0,
  );
  const size = 160;
  const r = 58;
  const stroke = 22;
  const c = 2 * Math.PI * r;

  let offset = 0;
  const slices = active.map((j, i) => {
    const value = metric === "views" ? j.views : j.articles;
    const len = total > 0 ? (value / total) * c : 0;
    const slice = {
      ...j,
      value,
      color: PALETTE[i % PALETTE.length],
      dash: `${len} ${c - len}`,
      offset,
      pct: total > 0 ? Math.round((value / total) * 100) : 0,
    };
    offset -= len;
    return slice;
  });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#eef2f6"
            strokeWidth={stroke}
          />
          {slices.map((s) => (
            <circle
              key={s.id}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={s.dash}
              strokeDashoffset={s.offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            >
              <title>
                {s.shortTitle}: {s.value.toLocaleString()} ({s.pct}%)
              </title>
            </circle>
          ))}
          <text
            x={size / 2}
            y={size / 2 - 6}
            textAnchor="middle"
            fontSize="18"
            fontWeight="700"
            fill="#0b1f33"
          >
            {formatNum(total)}
          </text>
          <text
            x={size / 2}
            y={size / 2 + 12}
            textAnchor="middle"
            fontSize="10"
            fill="#5b6b7c"
          >
            {metric === "views" ? "views" : "articles"}
          </text>
        </svg>
      </div>
      <ul className="w-full min-w-0 space-y-2">
        {slices.map((s) => (
          <li key={s.id} className="flex items-center gap-2.5 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: s.color }}
            />
            <span className="min-w-0 flex-1 truncate font-medium text-[var(--ink)]">
              {s.shortTitle}
            </span>
            <span className="tabular-nums text-[var(--muted)]">
              {formatNum(s.value)} · {s.pct}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal ranking bars for a single metric. */
export function RankingChart({
  items,
  metric,
}: {
  items: {
    id: string;
    slug: string;
    title: string;
    views: number;
    downloads: number;
    journal: { shortTitle: string };
  }[];
  metric: "views" | "downloads";
}) {
  if (items.length === 0) {
    return <EmptyChart message="No ranking data yet." />;
  }

  const max = Math.max(1, ...items.map((i) => i[metric]));
  const color = metric === "views" ? "var(--accent)" : "#d65c33";

  return (
    <ul className="space-y-3">
      {items.slice(0, 6).map((item, i) => {
        const value = item[metric];
        const pct = Math.max(4, Math.round((value / max) * 100));
        return (
          <li key={item.id} className="group">
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[10px] font-bold text-[var(--muted)]">
                {i + 1}
              </span>
              <Link
                href={`/articles/${item.slug}`}
                className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--ink)] group-hover:text-[var(--accent)]"
              >
                {item.title}
              </Link>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--ink)]">
                {formatNum(value)}
              </span>
            </div>
            <div className="ml-7 h-2 overflow-hidden rounded-full bg-[var(--surface)]">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            <p className="ml-7 mt-0.5 text-[10px] text-[var(--muted)]">
              {item.journal.shortTitle}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)]/40 px-4 text-center text-sm text-[var(--muted)]">
      {message}
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm ${className}`}
    >
      <div className="border-b border-[var(--line)] px-4 py-3.5 sm:px-5">
        <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">{subtitle}</p>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}
