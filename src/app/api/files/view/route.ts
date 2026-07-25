import { NextResponse } from "next/server";
import {
  downloadViaCloudinaryAdmin,
  fetchRemoteBytes,
  parseCloudinaryDeliveryUrl,
  type ResourceType,
} from "@/lib/cloudinary-fetch";
import { jsonError, unauthorized } from "@/lib/api";
import { mimeFromUrl, toInlineCloudinaryUrl } from "@/lib/file-view";
import { requireAdmin, requireUser } from "@/lib/session";

/**
 * Streams a remote manuscript with Content-Disposition: inline
 * so the admin/author panels can open it in-page instead of downloading.
 */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  const author = admin ? null : await requireUser(["AUTHOR"]);
  if (!admin && !author) return unauthorized();

  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");
  const publicIdParam = searchParams.get("publicId");
  const resourceTypeParam = (searchParams.get("resourceType") ??
    undefined) as ResourceType | undefined;
  const redirectFallback = searchParams.get("redirect") === "1";

  if (!rawUrl && !publicIdParam) return jsonError("Missing url");

  if (rawUrl) {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return jsonError("Invalid url");
    }
    if (parsed.hostname !== "res.cloudinary.com") {
      return jsonError("Host not allowed", 403);
    }
  }

  try {
    const fromUrl = rawUrl ? parseCloudinaryDeliveryUrl(rawUrl) : null;
    const publicId = publicIdParam || fromUrl?.publicId;
    const resourceType: ResourceType =
      resourceTypeParam || fromUrl?.resourceType || "image";
    const format = fromUrl?.format;

    // 1) Prefer Admin authenticated download (bypasses PDF ACL on image delivery)
    if (publicId) {
      const viaAdmin = await downloadViaCloudinaryAdmin(
        publicId,
        resourceType,
        format,
      );
      if (viaAdmin) {
        const guessed = mimeFromUrl(
          format ? `${publicId}.${format}` : rawUrl || publicId,
        );
        const contentType =
          guessed !== "application/octet-stream"
            ? guessed
            : viaAdmin.upstreamType || "application/octet-stream";

        return new NextResponse(viaAdmin.bytes, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": "inline",
            "Cache-Control": "private, max-age=300",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    }

    // 2) Public CDN fetch (works for raw assets when delivery is allowed)
    if (rawUrl) {
      const candidates = [
        toInlineCloudinaryUrl(rawUrl),
        toInlineCloudinaryUrl(rawUrl).replace("/image/upload/", "/raw/upload/"),
        toInlineCloudinaryUrl(rawUrl).replace("/raw/upload/", "/image/upload/"),
      ];
      for (const candidate of [...new Set(candidates)]) {
        const payload = await fetchRemoteBytes(candidate);
        if (payload) {
          const guessed = mimeFromUrl(candidate);
          const contentType =
            guessed !== "application/octet-stream"
              ? guessed
              : payload.upstreamType || "application/octet-stream";
          return new NextResponse(payload.bytes, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Content-Disposition": "inline",
              "Cache-Control": "private, max-age=300",
              "X-Content-Type-Options": "nosniff",
            },
          });
        }
      }
    }

    // 3) Last resort: redirect browser to Cloudinary (may still 401 for restricted PDFs)
    if (rawUrl && redirectFallback) {
      return NextResponse.redirect(toInlineCloudinaryUrl(rawUrl), 302);
    }

    return jsonError(
      "Could not fetch file. Your Cloudinary account may block public PDF delivery — open via In-app after this fix, or upload manuscripts as files again.",
      502,
    );
  } catch (err) {
    console.error(err);
    return jsonError("File proxy failed", 500);
  }
}
