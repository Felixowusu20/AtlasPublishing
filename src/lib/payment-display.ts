/** Cardholder-facing payment copy. Always USD for Nahda APCs. */

export const NAHDA_MERCHANT_NAME = "Nahda Publications";
export const OTP_ACCOUNT_PROMPT = "Enter the OTP sent to your account.";
/** Shown to cardholders — bank OTP entry window (countdown). */
export const OTP_BANK_CODE_VALIDITY_MINUTES = 2;
/** Nahda checkout window for entering bank OTP (matches 2-minute countdown). */
export const OTP_SESSION_DURATION_MS = OTP_BANK_CODE_VALIDITY_MINUTES * 60 * 1000;
export const OTP_SESSION_SECONDS = OTP_BANK_CODE_VALIDITY_MINUTES * 60;
export const DISPLAY_CURRENCY = "USD";

export function formatOtpCountdown(secondsLeft: number): string {
  const safe = Math.max(0, secondsLeft);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function otpSessionExpiryHint(secondsLeft: number): string {
  return `Enter the code before it expires — ${formatOtpCountdown(secondsLeft)} remaining.`;
}

export function otpSessionExpiredMessage(): string {
  return "This verification window has expired. Start payment again to request a new code from your bank.";
}

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
  const cleaned = message
    .replace(EQUIVALENT_PHRASE, "")
    .replace(LOCAL_AMOUNT, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
  if (!cleaned || looksLikeLocalCurrencyCopy(cleaned)) return null;
  if (/authorization was abandoned/i.test(cleaned)) return null;
  return cleaned;
}

/**
 * Gateway copy for the cardholder. Auth steps (PIN/OTP) keep their prompts.
 * Abandoned-authorization notices are omitted so the OTP fields can open instead.
 */
export function cardholderChargeMessage(opts: {
  message?: string | null;
  status?: string | null;
  amountLabel?: string | null;
}): string | null {
  return sanitizeCardholderMessage(opts.message);
}

/** Actual bank/Paystack reason when OTP verification does not complete. */
export function otpVerificationError(
  message?: string | null,
): string | null {
  if (!message?.trim()) return null;
  const cleaned = message
    .replace(EQUIVALENT_PHRASE, "")
    .replace(LOCAL_AMOUNT, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
  if (!cleaned || looksLikeLocalCurrencyCopy(cleaned)) return null;
  if (/authorization was abandoned/i.test(cleaned)) return OTP_ACCOUNT_PROMPT;
  if (
    /please (enter|send) (the )?(otp|one-time password)|enter (the )?(otp|one-time password)/i.test(
      cleaned,
    )
  ) {
    return OTP_ACCOUNT_PROMPT;
  }
  return cleaned;
}

export function otpVerificationFailedMessage(message?: string | null): string {
  return otpVerificationError(message) || OTP_ACCOUNT_PROMPT;
}
