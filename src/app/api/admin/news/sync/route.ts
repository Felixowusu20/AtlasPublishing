import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { syncFreeNewsForNahda } from "@/lib/sync-freenews";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Super-admin: pull FreeNews science/education stories into CMS + /news. */
export async function POST() {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const result = await syncFreeNewsForNahda();
    return jsonOk({ ok: true, result });
  } catch (err) {
    console.error("[freenews-sync]", err);
    return jsonError(
      err instanceof Error ? err.message : "Could not sync Free News",
      500,
    );
  }
}
