import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { markApcPaid } from "@/lib/apc-checkout";
import { toAdminPayment } from "@/lib/payment-dto";

/**
 * Admin: confirm a PayPal APC payment received for Nahda Publications.
 * Marks PAID, moves to IN_PRODUCTION, emails the submitting author a receipt.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    const body = z
      .object({
        submissionId: z.string().min(1),
        paypalReference: z.string().optional(),
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
      return jsonError(
        "Only accepted manuscripts can have APC payment confirmed",
        400,
      );
    }

    const updated = await markApcPaid({
      submissionId: body.submissionId,
      reference:
        body.paypalReference?.trim() ||
        submission.payment?.paystackReference ||
        null,
      customerEmail: submission.author.email,
    });

    if (!updated) return jsonError("Could not confirm payment", 500);

    return jsonOk({
      submission: {
        ...updated,
        payment: toAdminPayment(updated.payment),
      },
      receiptSentTo: updated.author.email,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[admin/payments/confirm]", err);
    return jsonError("Could not confirm PayPal payment", 500);
  }
}
