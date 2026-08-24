import { jsonError, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";

/** PDFs are built in the admin browser so Hobby-plan Vercel does not need Chrome. */
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  return jsonError(
    "This admin page is out of date. Hard-refresh (Cmd-Shift-R), then Publish again. The Nahda PDF is generated in your browser — Chrome is not required on the server.",
    410,
  );
}
