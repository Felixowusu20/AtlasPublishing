/**
 * Build an A4 PDF from the live Nahda article template using Chrome print,
 * matching Print preview (journal colors, two columns, repeating footer).
 */

import { buildNahdaPrintDocument } from "@/lib/nahda-print-document";
import { CLOUDINARY_MAX_UPLOAD_BYTES } from "@/lib/prepare-upload-file";

export function pdfErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message.trim()) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message: unknown }).message ?? "");
    if (message.trim()) return message;
  }
  return fallback;
}

function waitForImages(root: ParentNode) {
  const images = Array.from(root.querySelectorAll("img"));
  return Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        window.setTimeout(done, 4000);
      });
    }),
  );
}

/** Print the journal template with Chrome and return an A4 PDF blob. */
export async function articleTemplateToPdf(
  source: HTMLElement,
): Promise<Blob> {
  const article =
    source.matches(".nahda-article")
      ? source
      : source.querySelector<HTMLElement>(".nahda-article");
  if (!article) {
    throw new Error("The Nahda article template is not ready yet.");
  }

  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready.catch(() => undefined);
  }
  await waitForImages(article);

  const html = buildNahdaPrintDocument(article);
  const res = await fetch("/api/admin/nahda-pdf", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html }),
  });

  if (!res.ok) {
    let message = "Could not print the Nahda-styled PDF.";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* keep fallback */
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  if (blob.size > CLOUDINARY_MAX_UPLOAD_BYTES) {
    throw new Error(
      "The printed PDF is too large to upload. Shorten figures or try again.",
    );
  }
  if (blob.size < 100) {
    throw new Error("The Nahda print PDF was empty. Try Print preview, then Publish again.");
  }
  return blob;
}

export function nahdaPdfFile(title: string, blob: Blob) {
  const base = (title || "article")
    .replace(/[^\w\s-]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return new File([blob], `${base || "nahda-article"}.pdf`, {
    type: "application/pdf",
  });
}
