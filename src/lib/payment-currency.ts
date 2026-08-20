import {
  CUSTOMER_CURRENCY,
  customerUsdMajor,
  formatCustomerUsd,
} from "@/lib/format-usd";

export { CUSTOMER_CURRENCY, customerUsdMajor, formatCustomerUsd };

/** GHS is backend/Paystack processing only. */

export const INTERNAL_PAYSTACK_CURRENCY = "GHS";

const LEAK_KEY =
  /^(ghsAmount|ghs_amount|exchangeRate|exchange_rate|convertedAmount|converted_amount|settlementAmount|settlement_amount|settlementCurrency|settlement_currency|internalCurrency|internal_currency|internalAmount|internal_amount|chargedCurrency|charged_currency|chargedAmount|charged_amount)$/i;

const LEAK_TEXT = /(?:\bGHS\b|GH₵|₵|\bcedis?\b|\bGhana\s+Cedis?\b)/i;

/**
 * Server-only USD→GHS rate. Never send this to customer-facing clients.
 * Prefers USD_TO_GHS_RATE, then PAYSTACK_GHS_PER_USD, then a conservative default.
 */
export function usdToGhsRate(): number {
  const named = Number(process.env.USD_TO_GHS_RATE);
  if (Number.isFinite(named) && named > 0) return named;
  const legacy = Number(process.env.PAYSTACK_GHS_PER_USD);
  if (Number.isFinite(legacy) && legacy > 0) return legacy;
  return 15.5;
}

/** Internal Paystack processing currency. Defaults to GHS for Ghana merchants. */
export function internalPaystackCurrency(): string {
  const raw = (process.env.PAYSTACK_CURRENCY ?? INTERNAL_PAYSTACK_CURRENCY)
    .trim()
    .toUpperCase();
  if (!raw || raw === "USD") return INTERNAL_PAYSTACK_CURRENCY;
  return raw;
}

/** Admin-only GHS label from Paystack pesewas. */
export function formatInternalGhs(pesewas: number): string {
  const major = pesewas / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
  return `GHS ${formatted}`;
}

export function customerPayloadHasInternalLeak(payload: unknown): boolean {
  const seen = new Set<unknown>();

  const walk = (value: unknown): boolean => {
    if (value == null) return false;
    if (typeof value === "string") return LEAK_TEXT.test(value);
    if (typeof value !== "object") return false;
    if (seen.has(value)) return false;
    seen.add(value);
    if (Array.isArray(value)) return value.some(walk);
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (LEAK_KEY.test(key)) return true;
      if (walk(nested)) return true;
    }
    return false;
  };

  return walk(payload);
}
