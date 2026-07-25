import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { progressForStatus } from "@/lib/submission-utils";

/**
 * List accepted papers waiting for full manuscript typing (before publish).
 * Pass ?id= to also include a specific submission (e.g. after unpublishing for edit).
 */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    const focusId = new URL(request.url).searchParams.get("id");

    const queue = await prisma.submission.findMany({
      where: {
        status: { in: ["ACCEPTED", "IN_PRODUCTION"] },
        publishedArticle: null,
      },
      include: {
        journal: { select: { id: true, title: true, shortTitle: true } },
        author: {
          select: { id: true, name: true, email: true, institution: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Ensure a focused id is present even if filters somehow miss it
    if (focusId && !queue.some((q) => q.id === focusId)) {
      const focused = await prisma.submission.findFirst({
        where: {
          id: focusId,
          publishedArticle: null,
          status: { in: ["ACCEPTED", "IN_PRODUCTION"] },
        },
        include: {
          journal: { select: { id: true, title: true, shortTitle: true } },
          author: {
            select: { id: true, name: true, email: true, institution: true },
          },
        },
      });
      if (focused) queue.unshift(focused);
    }

    return jsonOk({ queue });
  } catch (err) {
    console.error("[manuscripts GET]", err);
    return jsonError("Could not load manuscripts queue", 500);
  }
}

const saveSchema = z.object({
  submissionId: z.string().min(1),
  body: z.string(),
  figures: z
    .array(
      z.object({
        id: z.string(),
        url: z.string().url(),
        filename: z.string().min(1),
        caption: z.string(),
      }),
    )
    .optional(),
  /** When true, marks manuscript ready and caller should redirect to publish. */
  done: z.boolean().optional(),
});

type SavedRow = {
  id: string;
  manuscriptId: string;
  productionBody: string | null;
  productionFigures: unknown;
  manuscriptReadyAt: Date | null;
  status: string;
  progress: number;
};

/**
 * Persist production manuscript fields.
 * Uses Prisma normally; falls back to raw SQL if the client is stale
 * (e.g. server not restarted after schema generate).
 */
async function saveProductionFields(args: {
  id: string;
  body: string;
  figures: unknown;
  done: boolean;
  existingReadyAt: Date | null;
}): Promise<SavedRow> {
  const readyAt = args.done ? new Date() : args.existingReadyAt;
  const nextStatus = args.done ? ("IN_PRODUCTION" as const) : undefined;
  const progress = nextStatus ? progressForStatus(nextStatus) : undefined;

  try {
    return await prisma.submission.update({
      where: { id: args.id },
      data: {
        productionBody: args.body,
        productionFigures: args.figures as Prisma.InputJsonValue,
        manuscriptReadyAt: readyAt,
        ...(nextStatus
          ? {
              status: nextStatus,
              progress: progress!,
            }
          : {}),
      },
      select: {
        id: true,
        manuscriptId: true,
        productionBody: true,
        productionFigures: true,
        manuscriptReadyAt: true,
        status: true,
        progress: true,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/productionBody|Unknown argument/i.test(msg)) throw err;

    console.warn(
      "[manuscripts] Prisma client missing production fields — using SQL fallback. Restart Next.js after prisma generate.",
    );

    if (args.done) {
      await prisma.$executeRaw`
        UPDATE "Submission"
        SET
          "productionBody" = ${args.body},
          "productionFigures" = ${JSON.stringify(args.figures)}::jsonb,
          "manuscriptReadyAt" = ${readyAt},
          "status" = 'IN_PRODUCTION'::"SubmissionStatus",
          "progress" = ${progress ?? 85},
          "updatedAt" = NOW()
        WHERE id = ${args.id}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE "Submission"
        SET
          "productionBody" = ${args.body},
          "productionFigures" = ${JSON.stringify(args.figures)}::jsonb,
          "updatedAt" = NOW()
        WHERE id = ${args.id}
      `;
    }

    const rows = await prisma.$queryRaw<SavedRow[]>`
      SELECT
        id,
        "manuscriptId",
        "productionBody",
        "productionFigures",
        "manuscriptReadyAt",
        status::text as status,
        progress
      FROM "Submission"
      WHERE id = ${args.id}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) throw new Error("Save succeeded but row could not be reloaded");
    return row;
  }
}

/**
 * Save full manuscript body/figures. With done=true, mark ready for publish.
 */
export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    const data = saveSchema.parse(await request.json());

    const submission = await prisma.submission.findUnique({
      where: { id: data.submissionId },
      include: { publishedArticle: true },
    });

    if (!submission) return jsonError("Submission not found", 404);
    if (submission.publishedArticle) {
      return jsonError("This manuscript is already published", 400);
    }
    if (
      submission.status !== "ACCEPTED" &&
      submission.status !== "IN_PRODUCTION"
    ) {
      return jsonError(
        "Only accepted manuscripts can be prepared for publication.",
        400,
      );
    }

    // Prefer column from DB even if Prisma types omit it on a stale client
    const existingReadyAt =
      (submission as { manuscriptReadyAt?: Date | null }).manuscriptReadyAt ??
      null;

    const updated = await saveProductionFields({
      id: data.submissionId,
      body: data.body,
      figures: data.figures ?? [],
      done: Boolean(data.done),
      existingReadyAt,
    });

    return jsonOk({
      submission: updated,
      publishUrl: `/admin/publishedArticles?id=${updated.id}`,
      done: Boolean(data.done),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[manuscripts PATCH]", err);
    return jsonError(
      err instanceof Error ? err.message : "Could not save manuscript",
      500,
    );
  }
}
