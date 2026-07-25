export function formatMetric(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  if (value >= 1_000) return `${(value / 1000).toFixed(1)}k`;
  return value.toLocaleString();
}

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
  const items: [string, number][] = [
    ["views", views],
    ["downloads", downloads],
  ];
  if (typeof citations === "number") items.push(["citations", citations]);

  return (
    <span
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)] ${className}`}
    >
      {items.map(([label, value]) => (
        <span key={label} className="inline-flex items-baseline gap-1">
          <span className="font-semibold text-[var(--ink)]">
            {formatMetric(value)}
          </span>
          {label}
        </span>
      ))}
    </span>
  );
}
