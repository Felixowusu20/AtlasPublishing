import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { trashSubmission } from "@/lib/recycle-bin";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    const where =
      admin.role === "REVIEWER"
        ? {
            deletedAt: null,
            OR: [
              { reviewerId: admin.sub },
              { reviewerId: null, status: { not: "DRAFT" as const } },
            ],
          }
        : { deletedAt: null, status: { not: "DRAFT" as const } };

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
  } catch (err) {
    console.error("[admin submissions GET]", err);
    return jsonError("Could not load submissions", 500);
  }
}

/** Move a submission to the recycle bin. */
export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("Missing id");

  try {
    const result = await prisma.$transaction(async (tx) => {
      return trashSubmission(tx, {
        submissionId: id,
        deletedById: admin.sub,
      });
    });

    if (!result) return jsonError("Submission not found", 404);
    return jsonOk({ ok: true, recycled: true, id: result.id });
  } catch (err) {
    console.error("[admin submissions DELETE]", err);
    return jsonError("Could not delete submission", 500);
  }
}
