/**
 * Nahda Publications PayPal APC collection.
 * Payments are sent manually to this PayPal account (not Paystack).
 */

export const PAYPAL_ACCOUNT = {
  /** PayPal login / send-to email (Nahda Publications). */
  email: "Asareowusuclems2024@gmail.com",
  /** PayPal account display name. */
  accountName: "Asare Clement",
  /** Legal / publishing house that owns this account. */
  organization: "Nahda Publications",
  /** Open PayPal login / send-money flow. */
  sendUrl: "https://www.paypal.com/signin",
} as const;

export function paypalConfigured(): boolean {
  return Boolean(PAYPAL_ACCOUNT.email && PAYPAL_ACCOUNT.accountName);
}

/** Journal code shown to authors in payment notes (shortTitle → slug). */
export function journalPaymentAlias(journal: {
  shortTitle?: string | null;
  slug?: string | null;
  title?: string | null;
}): string {
  const short = (journal.shortTitle ?? "").trim();
  if (short) return short;
  const slug = (journal.slug ?? "").trim();
  if (slug) return slug.toUpperCase();
  const title = (journal.title ?? "").trim();
  return title || "NAHDA";
}

/**
 * Unique payment memo for PayPal notes so finance can match the manuscript.
 * Example: APC-AJS-NAHDA-2026-0142
 */
export function makePaypalPaymentReference(opts: {
  journalAlias: string;
  manuscriptId: string;
}): string {
  const journal = opts.journalAlias
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase()
    .slice(0, 16);
  const ms = opts.manuscriptId
    .replace(/[^A-Za-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase()
    .slice(0, 32);
  return `APC-${journal || "NAHDA"}-${ms || "MS"}`;
}
