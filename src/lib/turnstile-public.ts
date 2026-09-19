/** Client-safe Turnstile helpers — DISABLED for now (re-enable later). */

/** Kill switch — must match server `TURNSTILE_ACTIVE` in turnstile.ts */
const TURNSTILE_ACTIVE = false;

export function turnstileSiteKey(): string | null {
  // const value = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  // return value || null;
  if (!TURNSTILE_ACTIVE) return null;
  const value = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return value || null;
}

export function turnstileEnabled(): boolean {
  // return Boolean(turnstileSiteKey());
  return TURNSTILE_ACTIVE && Boolean(turnstileSiteKey());
}
