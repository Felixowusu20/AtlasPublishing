/**
 * Canonical public site origin from NEXT_PUBLIC_APP_URL (set in Vercel env).
 * Never hardcode localhost into emails, Stripe redirects, or production links.
 */
export function getAppBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");
  if (raw) return raw;

  // Local-only fallback so `next dev` still works without the env var.
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  throw new Error(
    "NEXT_PUBLIC_APP_URL is not set. Add it in Vercel → Settings → Environment Variables.",
  );
}

/** Soft variant: returns "" in production if unset (for optional URL builders). */
export function getAppBaseUrlOptional(): string {
  try {
    return getAppBaseUrl();
  } catch {
    return "";
  }
}
