import { jsonOk } from "@/lib/api";
import { clearSessionCookie, SESSION_COOKIE } from "@/lib/session";

export async function POST() {
  await clearSessionCookie(SESSION_COOKIE);
  return jsonOk({ ok: true });
}
