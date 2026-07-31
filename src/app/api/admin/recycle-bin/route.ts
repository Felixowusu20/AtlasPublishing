import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import {
  restorePublishedArticle,
  restoreSubmission,
} from "@/lib/recycle-bin";

/** List soft-deleted submissions and published articles. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const [articles, submissions] = await Promise.all([
    prisma.publishedArticle.findMany({
      where: { deletedAt: { not: null } },
      include: {
        journal: { select: { id: true, title: true, shortTitle: true } },
      },
      orderBy: { deletedAt: "desc" },
    }),
    prisma.submission.findMany({
      where: { deletedAt: { not: null } },
      include: {
        journal: { select: { id: true, title: true, shortTitle: true } },
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: { deletedAt: "desc" },
    }),
  ]);

  return jsonOk({ articles, submissions });
}

const actionSchema = z.object({
  action: z.enum(["restore", "purge"]),
  type: z.enum(["article", "submission"]),
  id: z.string().min(1),
});

/**
 * Restore from recycle bin, or permanently delete (purge).
 */
export async function POST(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const body = actionSchema.parse(await request.json());

    if (body.action === "restore") {
      if (body.type === "article") {
        const restored = await prisma.$transaction(async (tx) =>
          restorePublishedArticle(tx, body.id),
        );
        if (!restored) return jsonError("Article not found in recycle bin", 404);
        return jsonOk({ ok: true, restored: "article", id: body.id });
      }

      const restored = await prisma.$transaction(async (tx) =>
        restoreSubmission(tx, body.id),
      );
      if (!restored) {
        return jsonError("Submission not found in recycle bin", 404);
      }
      return jsonOk({ ok: true, restored: "submission", id: body.id });
    }

    // Permanent delete
    if (body.type === "article") {
      const article = await prisma.publishedArticle.findFirst({
        where: { id: body.id, deletedAt: { not: null } },
        select: { id: true },
      });
      if (!article) return jsonError("Article not found in recycle bin", 404);
      await prisma.publishedArticle.delete({ where: { id: article.id } });
      return jsonOk({ ok: true, purged: "article", id: body.id });
    }

    const submission = await prisma.submission.findFirst({
      where: { id: body.id, deletedAt: { not: null } },
      select: { id: true },
    });
    if (!submission) {
      return jsonError("Submission not found in recycle bin", 404);
    }

    // Any leftover soft-deleted article still linked via trashedSubmissionId
    await prisma.publishedArticle.deleteMany({
      where: {
        OR: [
          { trashedSubmissionId: submission.id },
          { submissionId: submission.id },
        ],
        deletedAt: { not: null },
      },
    });

    await prisma.submission.delete({ where: { id: submission.id } });
    return jsonOk({ ok: true, purged: "submission", id: body.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[recycle-bin]", err);
    return jsonError("Recycle bin action failed", 500);
  }
}
