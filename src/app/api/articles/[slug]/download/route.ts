import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { fetchCloudinaryAsset } from "@/lib/cloudinary-fetch";
import { mimeFromUrl } from "@/lib/file-view";

type Params = { params: Promise<{ slug: string }> };

function safeFilename(title: string, slug: string) {
  const base = (title || slug)
    .replace(/[^\w\s-]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `${base || slug}.pdf`;
}

/**
 * Public download for a published article PDF.
 * Increments the download counter, then streams the PDF (via Cloudinary
 * authenticated download when public CDN delivery is ACL-blocked).
 */
export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;

  try {
    const article = await prisma.publishedArticle.findFirst({
      where: { slug, isActive: true },
      select: { id: true, manuscriptUrl: true, title: true },
    });

    if (!article) return jsonError("Article not found", 404);
    if (!article.manuscriptUrl) {
      return jsonError("PDF is not available for this article yet", 404);
    }

    const asset = await fetchCloudinaryAsset(article.manuscriptUrl);
    if (!asset) {
      console.error(
        "[article-download] Cloudinary fetch failed for",
        article.manuscriptUrl,
      );
      return jsonError(
        "Could not fetch the PDF. The file may be blocked by storage settings.",
        502,
      );
    }

    await prisma.publishedArticle.update({
      where: { id: article.id },
      data: { downloads: { increment: 1 } },
    });

    const filename = safeFilename(article.title, slug);
    const contentType =
      mimeFromUrl(article.manuscriptUrl) !== "application/octet-stream"
        ? mimeFromUrl(article.manuscriptUrl)
        : asset.upstreamType || "application/pdf";

    return new NextResponse(asset.bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
        "Content-Length": String(asset.bytes.byteLength),
      },
    });
  } catch (err) {
    console.error("[article-download]", err);
    return jsonError("Could not download article", 500);
  }
}
