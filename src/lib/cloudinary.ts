import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

export type UploadResult = {
  url: string;
  publicId: string;
  resourceType: string;
};

export async function uploadToCloudinary(
  file: File | Buffer,
  options: {
    folder?: string;
    resourceType?: "image" | "raw" | "auto" | "video";
    filename?: string;
  } = {},
): Promise<UploadResult> {
  const folder = options.folder ?? "atlas";
  const resourceType = options.resourceType ?? "auto";

  let buffer: Buffer;
  if (Buffer.isBuffer(file)) {
    buffer = file;
  } else {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }

  const originalName =
    options.filename ||
    (file instanceof File ? file.name : undefined);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        // Keep original extension so PDFs/DOCX can be detected for in-app viewing
        use_filename: Boolean(originalName),
        unique_filename: true,
        filename_override: originalName,
        type: "upload",
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
        });
      },
    );
    stream.end(buffer);
  });
}

export async function destroyCloudinaryAsset(
  publicId: string,
  resourceType: "image" | "raw" | "video" = "image",
) {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
