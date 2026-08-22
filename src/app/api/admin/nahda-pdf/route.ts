import { z } from "zod";
import { jsonError, unauthorized } from "@/lib/api";
import { chromePrintToPdf } from "@/lib/chrome-print-pdf";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  html: z.string().min(40).max(8_000_000),
});

/** Print the Nahda article template with Chrome (same output as Print preview). */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid print payload");
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Article HTML is missing or too large");
  }

  try {
    const pdf = await chromePrintToPdf(parsed.data.html);
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[nahda-pdf]", err);
    const message =
      err instanceof Error
        ? err.message
        : "Could not print the Nahda-styled PDF.";
    return jsonError(message, 500);
  }
}
