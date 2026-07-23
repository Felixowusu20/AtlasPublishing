import { prisma } from "@/lib/db";
import { jsonOk, unauthorized } from "@/lib/api";
import { getSession, publicUser, SESSION_COOKIE } from "@/lib/session";

export async function GET() {
  const session = await getSession(SESSION_COOKIE);
  if (!session) return unauthorized();

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || user.role !== "AUTHOR") return unauthorized();

  return jsonOk({ user: publicUser(user) });
}
