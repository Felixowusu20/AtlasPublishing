/**
 * Client helpers for API responses + direct Cloudinary uploads.
 * Direct upload avoids production "Request Entity Too Large" on Vercel.
 */

import {
  friendlyUploadSizeError,
  prepareUploadFile,
} from "@/lib/prepare-upload-file";

export type UploadedAsset = {
  url: string;
  publicId: string;
  resourceType: string;
};

const CHUNK_SIZE = 6 * 1024 * 1024;

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

type CloudinaryUploadJson = {
  error?: { message?: string };
  secure_url?: string;
  url?: string;
  public_id?: string;
  resource_type?: string;
  done?: boolean;
};

function throwCloudinaryError(message: string, fileSize: number): never {
  throw new Error(
    friendlyUploadSizeError(message, fileSize) ?? message,
  );
}

/**
 * Upload a file straight to Cloudinary using a server-issued signature.
 * Large manuscripts never pass through the Next.js/Vercel request body.
 * Files over 5 MB are sent in chunks (Cloudinary REST requirement for large assets).
 */
export async function uploadFileDirect(
  file: File,
  options: {
    folder?: string;
    resourceType?: "image" | "raw" | "auto" | "video";
  } = {},
): Promise<UploadedAsset> {
  const prepared = await prepareUploadFile(file);
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

  const formFields = () => {
    const fd = new FormData();
    fd.append("api_key", signed.apiKey!);
    fd.append("timestamp", String(signed.timestamp));
    fd.append("signature", signed.signature!);
    fd.append("folder", signed.folder || folder);
    return fd;
  };

  const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const useChunks = prepared.size > CHUNK_SIZE;
  let cloudData: CloudinaryUploadJson | null = null;

  if (!useChunks) {
    const fd = formFields();
    fd.append("file", prepared);
    const cloudRes = await fetch(endpoint, { method: "POST", body: fd });
    cloudData = await readApiJson<CloudinaryUploadJson>(cloudRes);
    if (!cloudRes.ok) {
      throwCloudinaryError(
        cloudData.error?.message ?? `Cloudinary upload failed (${cloudRes.status})`,
        prepared.size,
      );
    }
  } else {
    let start = 0;
    while (start < prepared.size) {
      const end = Math.min(start + CHUNK_SIZE, prepared.size) - 1;
      const chunk = prepared.slice(start, end + 1);
      const fd = formFields();
      fd.append("file", chunk);
      const cloudRes = await fetch(endpoint, {
        method: "POST",
        body: fd,
        headers: {
          "X-Unique-Upload-Id": uploadId,
          "Content-Range": `bytes ${start}-${end}/${prepared.size}`,
        },
      });
      cloudData = await readApiJson<CloudinaryUploadJson>(cloudRes);
      if (!cloudRes.ok) {
        throwCloudinaryError(
          cloudData.error?.message ??
            `Cloudinary upload failed (${cloudRes.status})`,
          prepared.size,
        );
      }
      start = end + 1;
    }
  }

  const url = cloudData?.secure_url || cloudData?.url;
  if (!url || !cloudData?.public_id) {
    throw new Error("Upload succeeded but no file URL was returned");
  }

  return {
    url,
    publicId: cloudData.public_id,
    resourceType: cloudData.resource_type || type,
  };
}
