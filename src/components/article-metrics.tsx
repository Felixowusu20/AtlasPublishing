export function formatMetric(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  if (value >= 1_000) return `${(value / 1000).toFixed(1)}k`;
  return value.toLocaleString();
}

export type MetricKind = "views" | "downloads" | "citations";

export function ViewsIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function DownloadsIcon({
  className = "h-3.5 w-3.5",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export function CitationsIcon({
  className = "h-3.5 w-3.5",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M7.2 18.5c-1.7 0-3.1-.5-4.1-1.6C2 15.7 1.5 14 1.5 11.9c0-2.3.7-4.3 2.1-6.1C5 4 6.9 2.8 9.2 2.2l.7 1.9c-1.5.5-2.7 1.3-3.5 2.4-.8 1.1-1.2 2.2-1.2 3.4.3-.2.8-.3 1.4-.3 1.1 0 2 .4 2.7 1.1.7.7 1 1.6 1 2.7 0 1.1-.4 2-1.1 2.7-.7.7-1.6 1.1-2.7 1.1h-.3Zm10.6 0c-1.7 0-3.1-.5-4.1-1.6-1.1-1.2-1.6-2.9-1.6-5 0-2.3.7-4.3 2.1-6.1 1.4-1.8 3.3-3 5.6-3.6l.7 1.9c-1.5.5-2.7 1.3-3.5 2.4-.8 1.1-1.2 2.2-1.2 3.4.3-.2.8-.3 1.4-.3 1.1 0 2 .4 2.7 1.1.7.7 1 1.6 1 2.7 0 1.1-.4 2-1.1 2.7-.7.7-1.6 1.1-2.7 1.1h-.3Z" />
    </svg>
  );
}

export function MetricIcon({
  kind,
  className,
}: {
  kind: MetricKind;
  className?: string;
}) {
  if (kind === "views") return <ViewsIcon className={className} />;
  if (kind === "downloads") return <DownloadsIcon className={className} />;
  return <CitationsIcon className={className} />;
}

const LABELS: Record<MetricKind, string> = {
  views: "Views",
  downloads: "Downloads",
  citations: "Citations",
};

type Props = {
  views: number;
  downloads: number;
  citations?: number;
  className?: string;
};

/** Compact views / downloads badges for article cards in listings. */
export function ArticleMetrics({
  views,
  downloads,
  citations,
  className = "",
}: Props) {
  const items: [MetricKind, number][] = [
    ["views", views],
    ["downloads", downloads],
  ];
  if (typeof citations === "number") items.push(["citations", citations]);

  return (
    <span
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--muted)] ${className}`}
    >
      {items.map(([kind, value]) => (
        <span
          key={kind}
          className="inline-flex items-center gap-1"
          title={LABELS[kind]}
        >
          <MetricIcon kind={kind} className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span className="font-semibold text-[var(--ink)]">
            {formatMetric(value)}
          </span>
          <span className="sr-only">{LABELS[kind]}</span>
        </span>
      ))}
    </span>
  );
}

type PanelProps = {
  views: number;
  downloads: number;
  citations: number;
  className?: string;
};

/** Three-tile metrics panel (sidebar / dropdown) with icons instead of labels. */
export function ArticleMetricsPanel({
  views,
  downloads,
  citations,
  className = "",
}: PanelProps) {
  const items: [MetricKind, number][] = [
    ["views", views],
    ["downloads", downloads],
    ["citations", citations],
  ];

  return (
    <dl className={`grid grid-cols-3 gap-2 text-center ${className}`}>
      {items.map(([kind, value]) => (
        <div
          key={kind}
          className="rounded-xl bg-[var(--surface)] px-2 py-3"
          title={LABELS[kind]}
        >
          <dt className="flex justify-center text-[var(--accent)]">
            <MetricIcon kind={kind} className="h-4 w-4" />
            <span className="sr-only">{LABELS[kind]}</span>
          </dt>
          <dd className="mt-1.5 font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)]">
            {formatMetric(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
