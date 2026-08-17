/** Cardholder-facing payment copy. Always USD for Nahda APCs. */

export const NAHDA_MERCHANT_NAME = "Nahda Publications";
export const DISPLAY_CURRENCY = "USD";

const LOCAL_AMOUNT =
  /(?:GH[S₵]|₵)\s*[\d,]+(?:\.\d+)?|\b[\d,]+(?:\.\d+)?\s*(?:GHS|cedis?)\b/gi;
const EQUIVALENT_PHRASE =
  /(?:\(?\s*)?(?:equivalent(?:\s+to)?|approx\.?|approximately|converted\s+amount)\s*:?\s*[^)\n]*\)?/gi;

/** True when copy converts or restates the charge in GHS (or similar). */
export function looksLikeLocalCurrencyCopy(text: string): boolean {
  return /GH[S₵]|₵|cedis?|equivalent(?:\s+to)?\s+GH|approx\.?\s+GH|converted\s+amount/i.test(
    text,
  );
}

/**
 * Strip local-currency equivalents from gateway messages shown to the cardholder.
 * USD amounts and PIN/OTP instructions are kept.
 */
export function sanitizeCardholderMessage(
  message: string | null | undefined,
): string | null {
  if (!message?.trim()) return null;
  let cleaned = message
    .replace(EQUIVALENT_PHRASE, "")
    .replace(LOCAL_AMOUNT, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
  if (!cleaned || looksLikeLocalCurrencyCopy(cleaned)) return null;
  return cleaned;
}
