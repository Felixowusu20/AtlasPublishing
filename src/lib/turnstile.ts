/**
 * Cloudflare Turnstile — DISABLED for now (re-enable later).
 * Human check for auth forms only when keys are set.
 */

function env(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

/** Kill switch — set true when Turnstile should enforce again. */
const TURNSTILE_ACTIVE = false;

export function turnstileConfigured(): boolean {
  // return Boolean(env("TURNSTILE_SECRET_KEY") && env("NEXT_PUBLIC_TURNSTILE_SITE_KEY"));
  return TURNSTILE_ACTIVE && Boolean(env("TURNSTILE_SECRET_KEY") && env("NEXT_PUBLIC_TURNSTILE_SITE_KEY"));
}

export function turnstileSiteKey(): string | null {
  // return env("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
  if (!TURNSTILE_ACTIVE) return null;
  return env("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  // Cloudflare verification paused — always allow.
  if (!turnstileConfigured()) {
    return { ok: true };
  }
  if (!token?.trim()) {
    return { ok: false, error: "Please complete the human verification." };
  }

  const secret = env("TURNSTILE_SECRET_KEY");
  if (!secret) {
    return { ok: false, error: "Human verification is misconfigured." };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token.trim());
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    );
    const data = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    if (!data.success) {
      const codes = data["error-codes"]?.join(", ");
      console.warn("[turnstile] verification failed", codes);
      return { ok: false, error: "Human verification failed. Try again." };
    }
    return { ok: true };
  } catch (err) {
    console.error("[turnstile] siteverify error", err);
    return { ok: false, error: "Could not verify human check. Try again." };
  }
}

export function clientIpFromRequest(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}
