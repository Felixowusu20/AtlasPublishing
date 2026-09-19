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

const actionSchema = z
  .object({
    action: z.enum(["restore", "purge"]),
    type: z.enum(["article", "submission"]),
    id: z.string().min(1).optional(),
    ids: z.array(z.string().min(1)).min(1).optional(),
  })
  .refine((body) => Boolean(body.id) || (body.ids && body.ids.length > 0), {
    message: "Provide id or ids",
  });

function resolveIds(body: z.infer<typeof actionSchema>): string[] {
  if (body.ids?.length) return [...new Set(body.ids)];
  return body.id ? [body.id] : [];
}

/**
 * Restore from recycle bin, or permanently delete (purge).
 * Accepts a single `id` or an `ids` array for bulk actions.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  try {
    const body = actionSchema.parse(await request.json());
    const ids = resolveIds(body);
    if (ids.length === 0) return jsonError("Provide id or ids");

    if (body.action === "restore") {
      const restored: string[] = [];
      await prisma.$transaction(async (tx) => {
        for (const id of ids) {
          if (body.type === "article") {
            const item = await restorePublishedArticle(tx, id);
            if (item) restored.push(id);
          } else {
            const item = await restoreSubmission(tx, id);
            if (item) restored.push(id);
          }
        }
      });
      if (restored.length === 0) {
        return jsonError(
          body.type === "article"
            ? "Article not found in recycle bin"
            : "Submission not found in recycle bin",
          404,
        );
      }
      return jsonOk({
        ok: true,
        restored: body.type,
        ids: restored,
        count: restored.length,
      });
    }

    // Permanent delete
    if (body.type === "article") {
      const found = await prisma.publishedArticle.findMany({
        where: { id: { in: ids }, deletedAt: { not: null } },
        select: { id: true },
      });
      if (found.length === 0) {
        return jsonError("Article not found in recycle bin", 404);
      }
      const purgeIds = found.map((a) => a.id);
      await prisma.publishedArticle.deleteMany({
        where: { id: { in: purgeIds } },
      });
      return jsonOk({
        ok: true,
        purged: "article",
        ids: purgeIds,
        count: purgeIds.length,
      });
    }

    const found = await prisma.submission.findMany({
      where: { id: { in: ids }, deletedAt: { not: null } },
      select: { id: true },
    });
    if (found.length === 0) {
      return jsonError("Submission not found in recycle bin", 404);
    }
    const purgeIds = found.map((s) => s.id);

    await prisma.$transaction(async (tx) => {
      await tx.publishedArticle.deleteMany({
        where: {
          OR: [
            { trashedSubmissionId: { in: purgeIds } },
            { submissionId: { in: purgeIds } },
          ],
          deletedAt: { not: null },
        },
      });
      await tx.submission.deleteMany({ where: { id: { in: purgeIds } } });
    });

    return jsonOk({
      ok: true,
      purged: "submission",
      ids: purgeIds,
      count: purgeIds.length,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[recycle-bin]", err);
    return jsonError("Recycle bin action failed", 500);
  }
}
