/** Customer-facing USD formatting. Safe to import from client components. */

export const CUSTOMER_CURRENCY = "USD";

/**
 * Customer-facing USD label: `$50 USD`, `$1,250 USD`.
 * Whole dollars omit cents; fractional amounts keep two digits.
 */
export function formatCustomerUsd(amountCents: number): string {
  const dollars = amountCents / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: Number.isInteger(dollars) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(dollars);
  return `$${formatted} USD`;
}

export function customerUsdMajor(amountCents: number): number {
  return Math.round(amountCents) / 100;
}
