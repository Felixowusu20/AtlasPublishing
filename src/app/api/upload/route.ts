import { NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { jsonError, unauthorized } from "@/lib/api";
import { requireAdmin, requireUser } from "@/lib/session";

/**
 * Server-side upload (small files only on Vercel — body limit ~4.5MB).
 * Prefer /api/upload/sign + browser → Cloudinary for manuscripts.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  const author = admin ? null : await requireUser(["AUTHOR"]);
  if (!admin && !author) return unauthorized();

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError("file is required");
    }

    // Soft guard so authors get a clear message instead of a blank platform error
    const maxBytes = 4 * 1024 * 1024;
    if (file.size > maxBytes) {
      return jsonError(
        "File is too large for server upload (max ~4 MB). Use the latest app build which uploads manuscripts directly to Cloudinary.",
        413,
      );
    }

    const folder = String(form.get("folder") ?? "nahda");
    const resourceType = (String(form.get("resourceType") ?? "auto") as
      | "image"
      | "raw"
      | "auto"
      | "video");

    const result = await uploadToCloudinary(file, {
      folder,
      resourceType,
      filename: file.name,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return jsonError("Upload failed", 500);
  }
}
