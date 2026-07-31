import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findArticleByDoi } from "@/lib/doi";
import { articleDownloadPath } from "@/lib/submission-utils";

type Params = { params: Promise<{ path: string[] }> };

/**
 * Resolve an Nahda DOI to the article page or PDF download.
 * Example: /doi/10.58000/ajs.2026.0142
 *          /doi/10.58000/ajs.2026.0142?download=1
 */
export async function GET(request: Request, { params }: Params) {
  const { path } = await params;
  const doi = path.join("/");
  const download = new URL(request.url).searchParams.get("download") === "1";

  try {
    const article = await findArticleByDoi(prisma, doi);
    if (!article) {
      return NextResponse.json(
        { error: "No published article found for this DOI." },
        { status: 404 },
      );
    }

    const base = new URL(request.url);
    const target = download
      ? new URL(articleDownloadPath(article.slug), base.origin)
      : new URL(`/articles/${article.slug}`, base.origin);

    return NextResponse.redirect(target, 302);
  } catch (err) {
    console.error("[doi-resolve]", err);
    return NextResponse.json({ error: "Could not resolve DOI" }, { status: 500 });
  }
}
