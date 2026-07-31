import { prisma } from "@/lib/db";
import type { Role } from "@/generated/prisma/client";

type NotifyAdminsArgs = {
  title: string;
  body: string;
  submissionId?: string | null;
  /** Defaults to SUPER_ADMIN + REVIEWER */
  roles?: Role[];
  /** Also notify these user ids (e.g. assigned reviewer) */
  extraUserIds?: string[];
};

/**
 * Create in-app notifications for editorial staff.
 * Used by the admin bell + browser/OS notification panel.
 */
export async function notifyAdmins(args: NotifyAdminsArgs) {
  const roles = args.roles ?? (["SUPER_ADMIN", "REVIEWER"] as Role[]);

  const staff = await prisma.user.findMany({
    where: { role: { in: roles } },
    select: { id: true },
  });

  const userIds = new Set<string>(staff.map((u) => u.id));
  for (const id of args.extraUserIds ?? []) {
    if (id) userIds.add(id);
  }

  if (userIds.size === 0) return { count: 0 };

  await prisma.notification.createMany({
    data: [...userIds].map((userId) => ({
      userId,
      submissionId: args.submissionId ?? null,
      title: args.title,
      body: args.body,
      unread: true,
    })),
  });

  return { count: userIds.size };
}
