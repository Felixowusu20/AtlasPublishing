import { prisma } from "@/lib/db";
import { jsonOk, unauthorized } from "@/lib/api";
import { requireUser } from "@/lib/session";

export async function GET() {
  const session = await requireUser(["AUTHOR"]);
  if (!session) return unauthorized();

  const notifications = await prisma.notification.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return jsonOk({ notifications });
}

export async function PATCH(request: Request) {
  const session = await requireUser(["AUTHOR"]);
  if (!session) return unauthorized();

  const body = (await request.json()) as { ids?: string[]; markAll?: boolean };
  if (body.markAll) {
    await prisma.notification.updateMany({
      where: { userId: session.sub, unread: true },
      data: { unread: false },
    });
  } else if (body.ids?.length) {
    await prisma.notification.updateMany({
      where: { userId: session.sub, id: { in: body.ids } },
      data: { unread: false },
    });
  }

  return jsonOk({ ok: true });
}
