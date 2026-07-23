import { NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
import { jsonError, unauthorized } from "@/lib/api";
import { mimeFromUrl, toInlineCloudinaryUrl } from "@/lib/file-view";
import { requireAdmin, requireUser } from "@/lib/session";

type ResourceType = "image" | "raw" | "video" | "auto";

type ParsedAsset = {
  publicId: string;
  resourceType: ResourceType;
  format?: string;
  version?: string;
};

/** Pull public_id + resource type from a Cloudinary delivery URL. */
function parseCloudinaryDeliveryUrl(url: string): ParsedAsset | null {
  try {
    const { pathname } = new URL(url);
    // /<cloud>/image/upload/v123/folder/file.pdf
    // /<cloud>/raw/upload/s--xx--/v123/folder/file.docx
    const match = pathname.match(
      /\/(image|raw|video|auto)\/upload\/(?:(?:[^/]+\/)*)?(?:v(\d+)\/)?(.+)$/,
    );
    if (!match) return null;

    const resourceType = match[1] as ResourceType;
    const version = match[2];
    let publicId = decodeURIComponent(match[3]);

    // Strip transformation segments mistakenly captured (signed urls etc.)
    // publicId should not start with s-- or fl_ etc. when version present;
    // if version missing, publicId may still include transforms — keep last path after upload.

    // Remove file extension for image/video assets (Cloudinary public_id usually omits it)
    let format: string | undefined;
    if (resourceType === "image" || resourceType === "video") {
      const extMatch = publicId.match(/\.([a-z0-9]+)$/i);
      if (extMatch) {
        format = extMatch[1].toLowerCase();
        publicId = publicId.slice(0, -(format.length + 1));
      }
    } else {
      // raw: public_id typically includes the extension
      const extMatch = publicId.match(/\.([a-z0-9]+)$/i);
      if (extMatch) format = extMatch[1].toLowerCase();
    }

    return { publicId, resourceType, format, version };
  } catch {
    return null;
  }
}

async function fetchBytes(target: string) {
  const upstream = await fetch(target, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; AtlasAcademicPublishing/1.0; +https://atlas)",
      Accept: "*/*",
    },
  });
  if (!upstream.ok) return null;
  const bytes = await upstream.arrayBuffer();
  if (!bytes.byteLength) return null;
  const upstreamType = upstream.headers.get("content-type")?.split(";")[0];
  // Cloudinary ACL denials sometimes return empty gif/plain
  if (
    upstreamType === "image/gif" &&
    bytes.byteLength < 100 &&
    upstream.headers.get("x-cld-error")
  ) {
    return null;
  }
  return { bytes, upstreamType };
}

/**
 * Authenticated Admin download — works even when public PDF delivery is
 * blocked (X-Cld-Error: deny or ACL failure).
 */
async function downloadViaAdmin(
  publicId: string,
  resourceType: ResourceType,
  format?: string,
) {
  const types: ResourceType[] =
    resourceType === "auto"
      ? ["image", "raw", "video"]
      : [resourceType, resourceType === "image" ? "raw" : "image"];

  for (const type of types) {
    let resolvedFormat = format;
    try {
      const resource = await cloudinary.api.resource(publicId, {
        resource_type: type,
      });
      resolvedFormat = resource.format || resolvedFormat;
      publicId = resource.public_id || publicId;
    } catch {
      // try download anyway / next type
    }

    try {
      const downloadUrl = cloudinary.utils.private_download_url(
        publicId,
        resolvedFormat || "",
        {
          resource_type: type,
          type: "upload",
          attachment: false,
        },
      );
      const got = await fetchBytes(downloadUrl);
      if (got) {
        return {
          ...got,
          url: downloadUrl,
          format: resolvedFormat,
          resourceType: type,
        };
      }
    } catch {
      // next
    }
  }
  return null;
}

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
      const viaAdmin = await downloadViaAdmin(publicId, resourceType, format);
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
        const payload = await fetchBytes(candidate);
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
