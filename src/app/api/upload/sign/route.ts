import { z } from "zod";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin, requireUser } from "@/lib/session";
import { signCloudinaryUpload } from "@/lib/cloudinary-sign";

const schema = z.object({
  folder: z.string().min(1).max(120).optional(),
  resourceType: z.enum(["image", "raw", "auto", "video"]).optional(),
});

/**
 * Returns a short-lived Cloudinary upload signature.
 * The browser uploads the file directly to Cloudinary (avoids Vercel 4.5MB limit).
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  const author = admin ? null : await requireUser(["AUTHOR"]);
  if (!admin && !author) return unauthorized();

  try {
    const body = schema.parse(await request.json().catch(() => ({})));
    const signed = signCloudinaryUpload({
      folder: body.folder ?? "nahda",
      resourceType: body.resourceType ?? "auto",
    });
    return jsonOk(signed);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[upload/sign]", err);
    return jsonError(
      err instanceof Error ? err.message : "Could not prepare upload",
      500,
    );
  }
}
