import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { formatApcAmount } from "@/lib/apc";
import { progressForStatus } from "@/lib/submission-utils";

/** Admin: waive APC and move the paper to IN_PRODUCTION. */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    const body = z
      .object({
        submissionId: z.string().min(1),
        reason: z.string().optional(),
      })
      .parse(await request.json());

    const submission = await prisma.submission.findUnique({
      where: { id: body.submissionId },
      include: { payment: true, author: true, journal: true },
    });
    if (!submission) return jsonError("Submission not found", 404);

    if (
      submission.status !== "ACCEPTED" &&
      submission.status !== "IN_PRODUCTION"
    ) {
      return jsonError("Only accepted manuscripts can have APC waived", 400);
    }

    if (
      submission.apcPaymentStatus === "PAID" ||
      submission.apcPaymentStatus === "WAIVED" ||
      submission.apcPaymentStatus === "NOT_REQUIRED"
    ) {
      if (submission.status === "ACCEPTED") {
        const moved = await prisma.submission.update({
          where: { id: submission.id },
          data: {
            status: "IN_PRODUCTION",
            progress: progressForStatus("IN_PRODUCTION"),
            actionRequired: null,
          },
          include: {
            journal: true,
            author: {
              select: { id: true, name: true, email: true, institution: true },
            },
            payment: true,
          },
        });
        return jsonOk({ submission: moved, alreadyCleared: true });
      }
      return jsonOk({ submission, alreadyCleared: true });
    }

    const amountCents = submission.payment?.amountCents ?? 0;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.payment.upsert({
        where: { submissionId: submission.id },
        create: {
          submissionId: submission.id,
          amountCents,
          currency: "usd",
          status: "WAIVED",
          waivedAt: new Date(),
          waivedById: admin.sub,
        },
        update: {
          status: "WAIVED",
          waivedAt: new Date(),
          waivedById: admin.sub,
        },
      });

      const sub = await tx.submission.update({
        where: { id: submission.id },
        data: {
          apcPaymentStatus: "WAIVED",
          apcPaidAt: new Date(),
          status: "IN_PRODUCTION",
          progress: progressForStatus("IN_PRODUCTION"),
          actionRequired: null,
        },
        include: {
          journal: true,
          author: {
            select: { id: true, name: true, email: true, institution: true },
          },
          payment: true,
        },
      });

      await tx.notification.create({
        data: {
          userId: submission.authorId,
          submissionId: submission.id,
          title: "APC waived",
          body:
            body.reason?.slice(0, 280) ||
            `The article processing charge for “${submission.title}” has been waived. Your manuscript is now in production.`,
        },
      });

      return sub;
    });

    return jsonOk({
      submission: updated,
      amountLabel: formatApcAmount(amountCents),
      waived: true,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[payments/waive]", err);
    return jsonError("Could not waive APC", 500);
  }
}
