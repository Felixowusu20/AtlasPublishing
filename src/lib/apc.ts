import type { ApcPaymentStatus } from "@/generated/prisma/client";

const EXPLICIT_FREE =
  /\b(free|waived|n\/?a|none|no\s*charge|included|\$?\s*0(?:\.0+)?)\b/i;
const SUBSCRIPTION = /\bsubscription\b/i;

/**
 * Parse a journal APC display string ("$1,200", "USD 850", "Free")
 * into amount cents (Paystack subunit). Returns 0 when payment is not required.
 *
 * Open-access journals with blank or "Subscription" copy still use
 * DEFAULT_APC_CENTS (default $1,200) so accept → pay → production works.
 */
export function parseApcAmountCents(
  apc: string | null | undefined,
  opts?: { openAccess?: boolean },
): number {
  const fallback = (() => {
    const n = Number(process.env.DEFAULT_APC_CENTS ?? "120000");
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : 120000;
  })();

  if (!apc?.trim()) return fallback;

  const raw = apc.trim();
  if (EXPLICIT_FREE.test(raw)) return 0;

  const cleaned = raw.replace(/,/g, "");
  const match = cleaned.match(/(\d+(?:\.\d{1,2})?)/);
  if (match) {
    const dollars = Number(match[1]);
    if (!Number.isFinite(dollars) || dollars <= 0) return 0;
    return Math.round(dollars * 100);
  }

  if (SUBSCRIPTION.test(raw) && opts?.openAccess === false) return 0;
  // OA + "Subscription" label (or unknown text) → charge default APC
  return fallback;
}

export function formatApcAmount(amountCents: number, currency = "usd"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return `$${(amountCents / 100).toFixed(2)}`;
  }
}

/** Cleared APC unlocks Full manuscripts + Publish queue. */
export function isApcCleared(
  status: ApcPaymentStatus | string | null | undefined,
): boolean {
  return (
    status === "PAID" ||
    status === "WAIVED" ||
    status === "NOT_REQUIRED"
  );
}

export function needsApcPayment(
  status: ApcPaymentStatus | string | null | undefined,
): boolean {
  return status === "PENDING";
}
