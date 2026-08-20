import { usdToPaystackAmount } from "@/lib/paystack";
import { INTERNAL_PAYSTACK_CURRENCY } from "@/lib/payment-currency";

export function isApcAlreadyCleared(
  status: string | null | undefined,
): boolean {
  return status === "PAID" || status === "WAIVED" || status === "NOT_REQUIRED";
}

/**
 * Confirm the Paystack charge matches our stored internal (GHS) amount.
 * USD customer price is never compared as the gateway amount.
 */
export function internalChargeMatches(opts: {
  verifiedAmount: number;
  verifiedCurrency: string;
  usdCents: number;
  storedInternalAmount?: number | null;
  storedInternalCurrency?: string | null;
}): boolean {
  if (opts.verifiedAmount <= 0) return false;

  const verifiedCurrency = (opts.verifiedCurrency || "").toUpperCase();
  const storedCurrency = (
    opts.storedInternalCurrency || INTERNAL_PAYSTACK_CURRENCY
  ).toUpperCase();

  if (
    opts.storedInternalAmount &&
    opts.storedInternalAmount > 0 &&
    verifiedCurrency === storedCurrency &&
    opts.verifiedAmount === opts.storedInternalAmount
  ) {
    return true;
  }

  const expected = usdToPaystackAmount(opts.usdCents, verifiedCurrency);
  if (opts.verifiedAmount === expected) return true;

  // Small FX rounding tolerance on recomputed local amounts (1% or 100 subunits).
  const drift = Math.abs(opts.verifiedAmount - expected);
  return drift <= Math.max(100, expected * 0.01);
}

export function metadataMatchesSubmission(
  metadata: unknown,
  submissionId: string,
): boolean {
  if (!metadata || typeof metadata !== "object") return true;
  const meta = metadata as Record<string, unknown>;
  const metaSubmissionId =
    typeof meta.submissionId === "string" ? meta.submissionId : null;
  return !metaSubmissionId || metaSubmissionId === submissionId;
}
