import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { allocateNextAtlasDoi } from "@/lib/doi";
import { requireAdmin } from "@/lib/session";

/** Preview the next Atlas DOI for a journal (used in the publish form). */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const journalId = new URL(request.url).searchParams.get("journalId");
  if (!journalId) return jsonError("Missing journalId");

  const yearParam = new URL(request.url).searchParams.get("year");
  const year = yearParam ? Number.parseInt(yearParam, 10) : new Date().getFullYear();
  if (!Number.isFinite(year)) return jsonError("Invalid year");

  try {
    const journal = await prisma.journal.findUnique({ where: { id: journalId } });
    if (!journal) return jsonError("Journal not found", 404);

    const doi = await allocateNextAtlasDoi(prisma, journal, year);
    return jsonOk({ doi, year });
  } catch (err) {
    console.error("[publish-queue/doi]", err);
    return jsonError("Could not allocate DOI", 500);
  }
}
