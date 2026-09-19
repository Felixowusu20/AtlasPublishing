import { rateLimitAuth } from "@/lib/auth-rate-limit";
import { jsonError } from "@/lib/api";
import {
  clientIpFromRequest,
  // verifyTurnstileToken, // Cloudflare paused
} from "@/lib/turnstile";

/** Shared auth POST guard: rate limit (+ Turnstile when re-enabled). */
export async function guardAuthPost(
  request: Request,
  _turnstileToken?: string | null,
): Promise<Response | null> {
  const ip = clientIpFromRequest(request) || "unknown";
  const path = new URL(request.url).pathname;
  const limited = rateLimitAuth(`${path}:${ip}`);
  if (!limited.ok) {
    return jsonError("Too many attempts. Try again later.", 429);
  }

  // Cloudflare Turnstile paused — re-enable later:
  // const verified = await verifyTurnstileToken(_turnstileToken, ip);
  // if (!verified.ok) {
  //   return jsonError(verified.error ?? "Human verification required.", 400);
  // }

  return null;
}
