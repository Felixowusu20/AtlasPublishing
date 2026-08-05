"use client";

type Props = {
  open: boolean;
  status: "preparing" | "open" | "confirming";
  amountLabel?: string | null;
};

/**
 * Full-screen Nahda brand shell shown while Paystack popup loads / payment confirms.
 * Logo + name sit above the Paystack iframe area.
 */
export function PaystackBrandOverlay({ open, status, amountLabel }: Props) {
  if (!open) return null;

  const paystackVisible = status === "open";
  const message =
    status === "confirming"
      ? "Confirming your payment…"
      : paystackVisible
        ? "Complete payment in the secure Paystack window"
        : "Preparing secure checkout…";

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col ${
        paystackVisible
          ? "pointer-events-none bg-[var(--ink)]/55"
          : "bg-[var(--ink)]/92 backdrop-blur-md"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Payment in progress"
    >
      {/* Brand header — stays on top of the Paystack pop */}
      <header className="pointer-events-auto relative z-[210] flex items-center justify-center gap-3 border-b border-white/10 bg-[var(--ink)] px-4 py-4 shadow-lg sm:py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-nahda-on-dark.png"
          alt="Nahda Publications"
          className="h-10 w-auto object-contain sm:h-12"
        />
        <div className="min-w-0 text-left">
          <p className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-white sm:text-xl">
            Nahda Publications
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-orange)]">
            Secure APC checkout
          </p>
        </div>
      </header>

      {!paystackVisible ? (
        <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-10 text-center">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(30,104,71,0.35),_transparent_60%)]"
            aria-hidden
          />

          <div className="relative flex flex-col items-center">
            <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)]/30" />
              <span className="absolute inset-2 animate-pulse rounded-full bg-[var(--accent)]/20" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/favicon.png"
                alt=""
                className="nahda-favicon-pump relative h-16 w-16 rounded-2xl object-cover shadow-xl ring-2 ring-white/30"
              />
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200/90">
              Nahda Publications
            </p>
            <h2 className="mt-2 max-w-sm font-[family-name:var(--font-display)] text-2xl text-white sm:text-3xl">
              {message}
            </h2>
            {amountLabel ? (
              <p className="mt-3 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white ring-1 ring-white/15">
                APC due: {amountLabel}
              </p>
            ) : null}
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/65">
              Your payment is processed securely by Paystack. Do not close this
              window until checkout finishes.
            </p>

            <div className="mt-8 h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
              <div className="nahda-load-bar h-full w-1/2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--brand-orange)]" />
            </div>
          </div>
        </div>
      ) : (
        <div className="pointer-events-none flex flex-1 items-start justify-center px-4 pt-3">
          <p className="rounded-full bg-[var(--ink)]/80 px-4 py-1.5 text-xs font-medium text-white/85 ring-1 ring-white/10">
            {message}
            {amountLabel ? ` · ${amountLabel}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
