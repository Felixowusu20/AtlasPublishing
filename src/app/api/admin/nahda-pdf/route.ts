import { jsonError, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";

/** PDFs are built in the admin browser so Hobby-plan Vercel does not need Chrome. */
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  return jsonError(
    "Refresh this page and try Publish again. The Nahda PDF is now generated in your browser.",
    410,
  );
}
