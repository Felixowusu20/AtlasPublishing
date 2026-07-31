import { prisma } from "@/lib/db";
import { jsonOk, unauthorized } from "@/lib/api";
import { requireUser } from "@/lib/session";

export async function GET() {
  const session = await requireUser(["AUTHOR"]);
  if (!session) return unauthorized();

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.sub },
      include: {
        submission: {
          select: {
            id: true,
            manuscriptId: true,
            status: true,
            publishedArticle: {
              select: {
                slug: true,
                manuscriptUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({
      where: { userId: session.sub, unread: true },
    }),
  ]);

  return jsonOk({ notifications, unreadCount });
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

  const unreadCount = await prisma.notification.count({
    where: { userId: session.sub, unread: true },
  });

  return jsonOk({ ok: true, unreadCount });
}
