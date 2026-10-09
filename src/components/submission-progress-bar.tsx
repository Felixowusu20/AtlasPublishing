type Props = {
  progress: number;
  /** When true (or progress is 100), bar turns red with a Published tag. */
  published?: boolean;
  label?: string;
  className?: string;
  /** Thicker bar on detail pages */
  size?: "sm" | "md";
};

/**
 * Editorial progress track. Published manuscripts switch to a red 100% bar
 * with an explicit “Published” tag instead of the green in-progress style.
 */
export function SubmissionProgressBar({
  progress,
  published = false,
  label = "Editorial progress",
  className,
  size = "md",
}: Props) {
  const isPublished = published || progress >= 100;
  const width = Math.min(100, Math.max(0, isPublished ? 100 : progress));
  const trackH = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-wider">
        <span className="text-[var(--muted)]">{label}</span>
        {isPublished ? (
          <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
            Published
          </span>
        ) : (
          <span className="text-[var(--muted)]">{width}%</span>
        )}
      </div>
      <div
        className={`${trackH} overflow-hidden rounded-full ${
          isPublished ? "bg-rose-100" : "bg-[var(--surface)]"
        }`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isPublished ? "bg-rose-600" : "bg-[var(--accent)]"
          }`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
