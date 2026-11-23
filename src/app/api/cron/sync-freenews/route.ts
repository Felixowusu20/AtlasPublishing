import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { syncFreeNewsForNahda } from "@/lib/sync-freenews";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Scheduled / manual cron endpoint.
 * Authorization: Bearer CRON_SECRET or x-cron-secret header.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return jsonError("CRON_SECRET is not configured", 500);
  }
  const auth = request.headers.get("authorization") ?? "";
  const header = request.headers.get("x-cron-secret") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : header;
  if (token !== secret) return unauthorized();

  try {
    const result = await syncFreeNewsForNahda();
    return jsonOk({ ok: true, result });
  } catch (err) {
    console.error("[cron-freenews]", err);
    return jsonError(
      err instanceof Error ? err.message : "Free News sync failed",
      500,
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
