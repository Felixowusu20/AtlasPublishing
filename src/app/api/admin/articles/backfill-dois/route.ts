import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { backfillMissingDois } from "@/lib/doi";
import { requireAdmin } from "@/lib/session";

/** Assign Atlas DOIs to published articles that are missing one. */
export async function POST() {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const updated = await backfillMissingDois(prisma);
    return jsonOk({ updated });
  } catch (err) {
    console.error("[backfill-dois]", err);
    return jsonError("Could not backfill DOIs", 500);
  }
}
