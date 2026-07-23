import { prisma } from "@/lib/db";
import { jsonOk, unauthorized } from "@/lib/api";
import {
  ADMIN_SESSION_COOKIE,
  getSession,
  publicUser,
} from "@/lib/session";

export async function GET() {
  const session = await getSession(ADMIN_SESSION_COOKIE);
  if (!session) return unauthorized();

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "REVIEWER")) {
    return unauthorized();
  }

  return jsonOk({ user: publicUser(user) });
}
