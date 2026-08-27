import { cloudinary } from "@/lib/cloudinary";

export type CloudinarySignParams = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  resourceType: "image" | "raw" | "auto" | "video";
  useFilename?: string;
  uniqueFilename?: string;
  filenameOverride?: string;
};

/**
 * Signed params for browser → Cloudinary direct upload.
 * Keeps large manuscripts off the Vercel/server body limit (~4.5MB).
 */
export function signCloudinaryUpload(opts: {
  folder: string;
  resourceType?: "image" | "raw" | "auto" | "video";
  filename?: string;
}): CloudinarySignParams {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured");
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = opts.folder || "nahda";
  const resourceType = opts.resourceType ?? "auto";
  const filename = opts.filename?.trim().slice(0, 180);

  // Sign only the params included in the browser FormData (besides file/api_key).
  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder,
  };
  if (filename) {
    paramsToSign.use_filename = "true";
    paramsToSign.unique_filename = "true";
    paramsToSign.filename_override = filename;
  }

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    resourceType,
    ...(filename
      ? {
          useFilename: "true",
          uniqueFilename: "true",
          filenameOverride: filename,
        }
      : {}),
  };
}
