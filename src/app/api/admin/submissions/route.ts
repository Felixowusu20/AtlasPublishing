import { prisma } from "@/lib/db";
import { jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const where =
    admin.role === "REVIEWER"
      ? {
          OR: [
            { reviewerId: admin.sub },
            { reviewerId: null, status: { not: "DRAFT" as const } },
          ],
        }
      : { status: { not: "DRAFT" as const } };

  const submissions = await prisma.submission.findMany({
    where,
    include: {
      journal: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          institution: true,
        },
      },
      reviewer: {
        select: { id: true, name: true, email: true },
      },
      feedback: {
        orderBy: { createdAt: "desc" },
        include: {
          reviewer: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return jsonOk({ submissions });
}
