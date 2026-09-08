import { NextResponse } from "next/server";

/** Legacy path — use /api/admin/nids */
export async function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.redirect(
    new URL(`/api/admin/nids${url.search}`, url.origin),
    308,
  );
}

export async function PATCH(request: Request) {
  const body = await request.text();
  return fetch(new URL("/api/admin/nids", request.url), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      cookie: request.headers.get("cookie") ?? "",
    },
    body,
  });
}
