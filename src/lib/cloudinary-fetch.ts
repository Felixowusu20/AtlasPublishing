import { cloudinary } from "@/lib/cloudinary";

export type ResourceType = "image" | "raw" | "video" | "auto";

export type ParsedAsset = {
  publicId: string;
  resourceType: ResourceType;
  format?: string;
  version?: string;
};

function isTransformSegment(seg: string) {
  return (
    seg.startsWith("s--") ||
    seg.includes(",") ||
    /^(fl_|c_|w_|h_|q_|f_|e_|t_|l_|b_|r_|a_|d_|g_|u_|o_|so_)/.test(seg)
  );
}

/** Pull public_id + resource type from a Cloudinary delivery URL. */
export function parseCloudinaryDeliveryUrl(url: string): ParsedAsset | null {
  try {
    const { pathname } = new URL(url);
    // /<cloud>/raw/upload/v123/folder/file.pdf
    // /<cloud>/raw/upload/fl_attachment/v123/folder/file.pdf
    // /<cloud>/image/upload/c_fill,w_100/v123/folder/file.jpg
    const parts = pathname.split("/").filter(Boolean);
    const uploadIdx = parts.findIndex((p) => p === "upload");
    if (uploadIdx < 1) return null;

    const resourceType = parts[uploadIdx - 1] as ResourceType;
    if (!["image", "raw", "video", "auto"].includes(resourceType)) return null;

    const after = parts.slice(uploadIdx + 1);
    let i = 0;
    let version: string | undefined;
    while (i < after.length) {
      const seg = after[i];
      if (/^v\d+$/.test(seg)) {
        version = seg.slice(1);
        i += 1;
        break;
      }
      if (isTransformSegment(seg)) {
        i += 1;
        continue;
      }
      break;
    }

    let publicId = decodeURIComponent(after.slice(i).join("/"));
    if (!publicId) return null;

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

export async function fetchRemoteBytes(target: string) {
  const upstream = await fetch(target, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; NahdaPublications/1.0; +https://nahdapublications.com)",
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
export async function downloadViaCloudinaryAdmin(
  publicId: string,
  resourceType: ResourceType,
  format?: string,
) {
  const types: ResourceType[] =
    resourceType === "auto"
      ? ["image", "raw", "video"]
      : [resourceType, resourceType === "image" ? "raw" : "image"];

  let resolvedPublicId = publicId;

  for (const type of types) {
    let resolvedFormat = format;
    try {
      const resource = await cloudinary.api.resource(resolvedPublicId, {
        resource_type: type,
      });
      resolvedFormat = resource.format || resolvedFormat;
      resolvedPublicId = resource.public_id || resolvedPublicId;
    } catch {
      // try download anyway / next type
    }

    try {
      const downloadUrl = cloudinary.utils.private_download_url(
        resolvedPublicId,
        resolvedFormat || "",
        {
          resource_type: type,
          type: "upload",
          attachment: true,
        },
      );
      const got = await fetchRemoteBytes(downloadUrl);
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

/** Fetch a Cloudinary asset by delivery URL, bypassing public ACL when needed. */
export async function fetchCloudinaryAsset(url: string) {
  const parsed = parseCloudinaryDeliveryUrl(url);
  if (parsed) {
    const viaAdmin = await downloadViaCloudinaryAdmin(
      parsed.publicId,
      parsed.resourceType,
      parsed.format,
    );
    if (viaAdmin) return viaAdmin;
  }

  const got = await fetchRemoteBytes(url);
  if (got) {
    return {
      ...got,
      url,
      format: parsed?.format,
      resourceType: parsed?.resourceType ?? ("raw" as ResourceType),
    };
  }
  return null;
}
