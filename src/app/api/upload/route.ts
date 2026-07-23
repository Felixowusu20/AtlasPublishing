import { NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { jsonError, unauthorized } from "@/lib/api";
import { requireAdmin, requireUser } from "@/lib/session";

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

    const folder = String(form.get("folder") ?? "atlas");
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
