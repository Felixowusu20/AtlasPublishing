type Variant = "screen" | "panel" | "inline" | "dark";

type Props = {
  /** Short status line, e.g. "Loading your manuscript…" */
  label?: string;
  variant?: Variant;
  className?: string;
};

const SIZES: Record<Variant, { box: string; icon: string; text: string }> = {
  screen: { box: "h-24 w-24", icon: "h-14 w-14", text: "text-base" },
  dark: { box: "h-24 w-24", icon: "h-14 w-14", text: "text-base" },
  panel: { box: "h-16 w-16", icon: "h-9 w-9", text: "text-sm" },
  inline: { box: "h-10 w-10", icon: "h-6 w-6", text: "text-sm" },
};

/**
 * Brand loading state: the Nahda favicon pumping inside pulsing rings.
 * Safe in server components — animation is pure CSS.
 */
export function NahdaLoader({ label, variant = "panel", className }: Props) {
  const size = SIZES[variant];
  const onDark = variant === "dark";

  const wrapper =
    variant === "screen" || variant === "dark"
      ? "flex min-h-[60vh] w-full flex-col items-center justify-center gap-5 px-6 py-16"
      : variant === "panel"
        ? "flex w-full flex-col items-center justify-center gap-4 px-6 py-12"
        : "flex w-full items-center justify-center gap-3 px-4 py-6";

  const isRow = variant === "inline";

  return (
    <div
      className={`${wrapper} ${className ?? ""}`}
      role="status"
      aria-live="polite"
    >
      <div className={`relative flex ${size.box} items-center justify-center`}>
        <span
          className={`absolute inset-0 animate-ping rounded-full ${
            onDark ? "bg-white/20" : "bg-[var(--accent)]/25"
          }`}
          aria-hidden
        />
        <span
          className={`absolute inset-[12%] animate-pulse rounded-full ${
            onDark ? "bg-white/10" : "bg-[var(--accent)]/15"
          }`}
          aria-hidden
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/favicon.png"
          alt=""
          className={`nahda-favicon-pump relative ${size.icon} rounded-2xl object-contain shadow-lg ${
            onDark ? "ring-1 ring-white/25" : "ring-1 ring-[var(--accent)]/20"
          }`}
        />
      </div>

      <div className={isRow ? "text-left" : "text-center"}>
        <p
          className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${
            onDark ? "text-emerald-200/90" : "text-[var(--accent)]"
          }`}
        >
          Nahda Publications
        </p>
        <p
          className={`mt-1 ${size.text} ${
            onDark ? "text-white/80" : "text-[var(--muted)]"
          }`}
        >
          {label ?? "Loading…"}
        </p>
      </div>

      {!isRow && (
        <div
          className={`h-1 w-40 overflow-hidden rounded-full ${
            onDark ? "bg-white/15" : "bg-[var(--surface)]"
          }`}
          aria-hidden
        >
          <div className="nahda-load-bar h-full w-1/2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--brand-orange)]" />
        </div>
      )}
    </div>
  );
}
