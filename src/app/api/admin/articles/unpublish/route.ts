import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { trashPublishedArticle } from "@/lib/recycle-bin";

/**
 * Unpublish a live article so editors can revise it in Full manuscripts.
 * Soft-deletes the public record and returns the manuscripts edit URL.
 * (Separate from recycle-bin DELETE so edit is not a delete call.)
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    const { id } = z
      .object({ id: z.string().min(1) })
      .parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      return trashPublishedArticle(tx, {
        articleId: id,
        deletedById: admin.sub,
        forEdit: true,
      });
    });

    if (!result) return jsonError("Article not found", 404);

    const submissionId = result.submissionId;
    return jsonOk({
      ok: true,
      unpublished: true,
      submissionId: submissionId ?? null,
      editUrl: submissionId
        ? `/admin/manuscripts?id=${submissionId}`
        : null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[admin articles unpublish]", err);
    return jsonError(
      err instanceof Error && /timeout|terminated/i.test(err.message)
        ? "Database timed out while unpublishing. Please try again."
        : "Could not unpublish article",
      500,
    );
  }
}
