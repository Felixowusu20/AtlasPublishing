import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since");
  const unreadOnly = searchParams.get("unread") === "1";

  const where: {
    userId: string;
    unread?: boolean;
    createdAt?: { gt: Date };
  } = { userId: admin.sub };

  if (unreadOnly) where.unread = true;
  if (since) {
    const d = new Date(since);
    if (!Number.isNaN(d.getTime())) where.createdAt = { gt: d };
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      include: {
        submission: {
          select: {
            id: true,
            manuscriptId: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.notification.count({
      where: { userId: admin.sub, unread: true },
    }),
  ]);

  return jsonOk({ notifications, unreadCount });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    const body = z
      .object({
        ids: z.array(z.string()).optional(),
        markAll: z.boolean().optional(),
      })
      .parse(await request.json());

    if (body.markAll) {
      await prisma.notification.updateMany({
        where: { userId: admin.sub, unread: true },
        data: { unread: false },
      });
    } else if (body.ids?.length) {
      await prisma.notification.updateMany({
        where: { userId: admin.sub, id: { in: body.ids } },
        data: { unread: false },
      });
    }

    const unreadCount = await prisma.notification.count({
      where: { userId: admin.sub, unread: true },
    });

    return jsonOk({ ok: true, unreadCount });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[admin notifications PATCH]", err);
    return jsonError("Could not update notifications", 500);
  }
}
