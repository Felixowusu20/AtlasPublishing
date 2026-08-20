import mammoth from "mammoth";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { uploadToCloudinary } from "@/lib/cloudinary";
import {
  extractGoogleDocId,
  googleDocExportUrl,
  htmlToPlainText,
  sanitizeManuscriptHtml,
  sliceHtmlFromIntroduction,
} from "@/lib/import-manuscript";

export const runtime = "nodejs";
export const maxDuration = 180;

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_MB = Math.round(MAX_BYTES / (1024 * 1024));

async function docxToManuscript(buffer: Buffer) {
  const figures: Array<{
    id: string;
    url: string;
    filename: string;
    caption: string;
  }> = [];
  let imageIndex = 0;

  const converted = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: [
        "b => strong",
        "i => em",
        "u => u",
        "strike => s",
        "comment-reference => ",
      ],
      convertImage: mammoth.images.imgElement(async (image) => {
        const bytes = await image.read();
        const ext =
          (image.contentType.split("/")[1] || "png").replace("jpeg", "jpg") ||
          "png";
        imageIndex += 1;
        const filename = `import-${Date.now().toString(36)}-${imageIndex}.${ext}`;
        const uploaded = await uploadToCloudinary(Buffer.from(bytes), {
          folder: "nahda/article-figures",
          resourceType: "image",
          filename,
        });
        const id = `fig-${Date.now().toString(36)}-${imageIndex}`;
        const caption = `Figure ${imageIndex}`;
        figures.push({
          id,
          url: uploaded.url,
          filename,
          caption,
        });
        return { src: uploaded.url };
      }),
    },
  );

  const html = sanitizeManuscriptHtml(converted.value || "");
  const sliced = sliceHtmlFromIntroduction(html);
  const warnings = converted.messages
    .map((m) => m.message)
    .filter(Boolean)
    .slice(0, 8);

  return {
    body: sliced.body,
    figures,
    trimmedFrontMatter: sliced.trimmedFrontMatter,
    warnings,
  };
}

async function fetchGoogleDocx(url: string): Promise<Buffer> {
  const id = extractGoogleDocId(url);
  if (!id) {
    throw new Error("That does not look like a Google Docs link.");
  }
  const exportUrl = googleDocExportUrl(id);
  const res = await fetch(exportUrl, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(
      "Could not download the Google Doc. Share it as “Anyone with the link can view”, then try again.",
    );
  }
  const type = res.headers.get("content-type") || "";
  if (type.includes("text/html")) {
    throw new Error(
      "Google Docs blocked the download. Open Share → Anyone with the link, or download as .docx and upload the file.",
    );
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 64) {
    throw new Error("The Google Doc export was empty.");
  }
  if (bytes.length > MAX_BYTES) {
    throw new Error(
      `That Google Doc is larger than ${MAX_MB} MB. Download it as .docx, compress images, and upload the file.`,
    );
  }
  return bytes;
}

/**
 * Import a Word .docx or a shared Google Doc into the article body
 * (Introduction through References). Header/abstract stay on the template.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    const form = await request.formData();
    const file = form.get("file");
    const googleUrl = String(form.get("googleUrl") ?? "").trim();

    let buffer: Buffer | null = null;
    let sourceName = "document.docx";

    if (file instanceof File) {
      if (file.size > MAX_BYTES) {
        return jsonError(
          `File is too large (max ${MAX_MB} MB). Compress images in Word, or download a smaller .docx.`,
          413,
        );
      }
      const name = file.name.toLowerCase();
      if (name.endsWith(".doc") && !name.endsWith(".docx")) {
        return jsonError(
          "Please save the file as .docx (Word or Google Docs → File → Download → Microsoft Word).",
        );
      }
      if (!name.endsWith(".docx") && file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        return jsonError("Upload a Word .docx file, or paste a Google Docs link.");
      }
      buffer = Buffer.from(await file.arrayBuffer());
      sourceName = file.name;
    } else if (googleUrl) {
      buffer = await fetchGoogleDocx(googleUrl);
      sourceName = "google-doc.docx";
    } else {
      return jsonError("Choose a Word .docx file or paste a Google Docs link.");
    }

    if (!buffer || buffer.length < 64) {
      return jsonError("The document was empty.");
    }

    const imported = await docxToManuscript(buffer);
    if (!htmlToPlainText(imported.body)) {
      return jsonError(
        "No body text was found. Check that the document includes an Introduction (or later sections).",
      );
    }

    return jsonOk({
      body: imported.body,
      figures: imported.figures,
      trimmedFrontMatter: imported.trimmedFrontMatter,
      warnings: imported.warnings,
      sourceName,
    });
  } catch (err) {
    console.error("[import-manuscript]", err);
    return jsonError(
      err instanceof Error ? err.message : "Import failed",
      500,
    );
  }
}
