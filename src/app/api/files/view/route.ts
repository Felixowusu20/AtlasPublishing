import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/api";
import { mimeFromUrl, toInlineCloudinaryUrl } from "@/lib/file-view";
import { requireAdmin, requireUser } from "@/lib/session";

/**
 * Streams a remote manuscript with Content-Disposition: inline
 * so the admin panel can open it in an iframe instead of downloading.
 */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  const author = admin ? null : await requireUser(["AUTHOR"]);
  if (!admin && !author) return unauthorized();

  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");
  if (!rawUrl) return jsonError("Missing url");

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return jsonError("Invalid url");
  }

  // Only proxy Cloudinary (or same-origin) assets
  const allowedHosts = ["res.cloudinary.com"];
  if (!allowedHosts.includes(parsed.hostname)) {
    return jsonError("Host not allowed", 403);
  }

  try {
    const target = toInlineCloudinaryUrl(rawUrl);
    const upstream = await fetch(target, { redirect: "follow" });
    if (!upstream.ok) {
      return jsonError("Could not fetch file", upstream.status);
    }

    const bytes = await upstream.arrayBuffer();
    const contentType =
      upstream.headers.get("content-type")?.split(";")[0] ||
      mimeFromUrl(rawUrl);

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error(err);
    return jsonError("File proxy failed", 500);
  }
}
