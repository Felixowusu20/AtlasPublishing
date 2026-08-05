/**
 * Client helpers for API responses + direct Cloudinary uploads.
 * Direct upload avoids production "Request Entity Too Large" on Vercel.
 */

export type UploadedAsset = {
  url: string;
  publicId: string;
  resourceType: string;
};

/** Parse fetch response as JSON; surface plain-text platform errors clearly. */
export async function readApiJson<T = Record<string, unknown>>(
  res: Response,
): Promise<T> {
  const text = await res.text();
  if (!text) {
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    if (/request entity too large/i.test(text)) {
      throw new Error(
        "File is too large for this server. Please use a smaller file or try again after the latest upload fix is deployed.",
      );
    }
    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 160);
    throw new Error(
      snippet
        ? `Server error (${res.status}): ${snippet}`
        : `Request failed (${res.status})`,
    );
  }
}

/**
 * Upload a file straight to Cloudinary using a server-issued signature.
 * Large manuscripts never pass through the Next.js/Vercel request body.
 */
export async function uploadFileDirect(
  file: File,
  options: {
    folder?: string;
    resourceType?: "image" | "raw" | "auto" | "video";
  } = {},
): Promise<UploadedAsset> {
  const folder = options.folder ?? "nahda";
  const resourceType = options.resourceType ?? "auto";

  const signRes = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, resourceType }),
  });
  const signed = await readApiJson<{
    error?: string;
    cloudName?: string;
    apiKey?: string;
    timestamp?: number;
    signature?: string;
    folder?: string;
    resourceType?: string;
  }>(signRes);

  if (!signRes.ok) {
    throw new Error(signed.error ?? "Could not prepare secure upload");
  }

  if (
    !signed.cloudName ||
    !signed.apiKey ||
    !signed.timestamp ||
    !signed.signature
  ) {
    throw new Error("Upload signature incomplete");
  }

  const type = signed.resourceType || resourceType;
  const endpoint = `https://api.cloudinary.com/v1_1/${signed.cloudName}/${type}/upload`;

  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", signed.apiKey);
  fd.append("timestamp", String(signed.timestamp));
  fd.append("signature", signed.signature);
  fd.append("folder", signed.folder || folder);

  const cloudRes = await fetch(endpoint, { method: "POST", body: fd });
  const cloudData = await readApiJson<{
    error?: { message?: string };
    secure_url?: string;
    url?: string;
    public_id?: string;
    resource_type?: string;
  }>(cloudRes);

  if (!cloudRes.ok) {
    throw new Error(
      cloudData.error?.message ?? `Cloudinary upload failed (${cloudRes.status})`,
    );
  }

  const url = cloudData.secure_url || cloudData.url;
  if (!url || !cloudData.public_id) {
    throw new Error("Upload succeeded but no file URL was returned");
  }

  return {
    url,
    publicId: cloudData.public_id,
    resourceType: cloudData.resource_type || type,
  };
}
