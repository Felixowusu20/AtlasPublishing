import { NextResponse } from "next/server";
import { articleViewPath } from "@/lib/submission-utils";

type Params = { params: Promise<{ slug: string }> };

/** Alias: same generated Nahda PDF as the author download, opened inline. */
export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  return NextResponse.redirect(new URL(articleViewPath(slug), request.url), 308);
}
