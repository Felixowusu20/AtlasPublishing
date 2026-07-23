import { jsonOk } from "@/lib/api";
import { ADMIN_SESSION_COOKIE, clearSessionCookie } from "@/lib/session";

export async function POST() {
  await clearSessionCookie(ADMIN_SESSION_COOKIE);
  return jsonOk({ ok: true });
}
