import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { prepareApcPayment } from "@/lib/apc-checkout";
import {
  CUSTOMER_CURRENCY,
  formatCustomerUsd,
} from "@/lib/payment-currency";
import {
  customerCheckoutRequestSchema,
  toCustomerCheckoutResponse,
  toCustomerPayment,
} from "@/lib/payment-dto";
import { isApcAlreadyCleared } from "@/lib/payment-verify";
import { PAYPAL_ACCOUNT } from "@/lib/paypal";
import { notifyAdmins } from "@/lib/notify-admins";

/**
 * Author: prepare APC PayPal payment instructions (USD).
 */
export async function POST(request: Request) {
  const session = await requireUser(["AUTHOR"]);
  if (!session) return unauthorized();

  try {
    const body = customerCheckoutRequestSchema.parse(await request.json());

    const submission = await prisma.submission.findFirst({
      where: { id: body.submissionId, authorId: session.sub },
      include: {
        journal: true,
        author: { select: { name: true, email: true } },
        payment: true,
      },
    });

    if (!submission) return jsonError("Submission not found", 404);

    if (
      submission.apcPaymentStatus === "PAID" ||
      submission.apcPaymentStatus === "WAIVED"
    ) {
      const customer = toCustomerPayment(submission.payment);
      return jsonOk({
        alreadyCleared: true,
        status: submission.apcPaymentStatus,
        currency: CUSTOMER_CURRENCY,
        amount: customer?.amount ?? 0,
        amountLabel:
          customer?.amountLabel ??
          (submission.payment
            ? formatCustomerUsd(submission.payment.amountCents)
            : null),
        paymentId: customer?.paymentId ?? null,
      });
    }

    if (
      submission.status !== "ACCEPTED" &&
      submission.status !== "IN_PRODUCTION"
    ) {
      return jsonError(
        "APC payment is only available after your manuscript is accepted.",
        400,
      );
    }

    const prepared = await prepareApcPayment(submission);
    if (
      prepared.status === "PAID" ||
      prepared.status === "WAIVED" ||
      prepared.status === "NOT_REQUIRED" ||
      prepared.amountCents <= 0
    ) {
      const customer = toCustomerPayment(prepared.payment, prepared.amountCents);
      return jsonOk({
        alreadyCleared: true,
        status: prepared.status,
        currency: CUSTOMER_CURRENCY,
        amount: customer?.amount ?? 0,
        amountLabel: prepared.amountLabel,
        paymentId: customer?.paymentId ?? null,
      });
    }
    const payment = prepared.payment ?? {
      id: prepared.paymentId ?? "none",
      amountCents: prepared.amountCents,
      status: prepared.status,
      paystackReference: prepared.reference,
    };
    return jsonOk({
      ...toCustomerCheckoutResponse({
        payment,
        productName: submission.title,
        alreadyCleared: isApcAlreadyCleared(prepared.status),
      }),
      method: "paypal",
      paymentReference: prepared.reference,
      journalAlias: prepared.journalAlias,
      journalTitle: submission.journal.title,
      manuscriptId: submission.manuscriptId,
      paypal: PAYPAL_ACCOUNT,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[payments/checkout]", err);
    return jsonError(
      err instanceof Error ? err.message : "Could not start checkout",
      500,
    );
  }
}

/**
 * Author: notify editors that a PayPal transfer was sent (awaiting confirmation).
 */
export async function PUT(request: Request) {
  const session = await requireUser(["AUTHOR"]);
  if (!session) return unauthorized();

  try {
    const body = z
      .object({
        submissionId: z.string().min(1),
        note: z.string().max(500).optional(),
      })
      .parse(await request.json());

    const submission = await prisma.submission.findFirst({
      where: { id: body.submissionId, authorId: session.sub },
      include: {
        journal: true,
        payment: true,
        author: { select: { name: true, email: true } },
      },
    });
    if (!submission) return jsonError("Submission not found", 404);

    if (isApcAlreadyCleared(submission.apcPaymentStatus)) {
      return jsonOk({ alreadyCleared: true, status: submission.apcPaymentStatus });
    }

    if (submission.apcPaymentStatus === "REPORTED") {
      return jsonOk({ reported: true, status: "REPORTED", alreadyReported: true });
    }

    // Ensure Payment row + reference exist, then mark REPORTED for the admin inbox.
    const prepared = await prepareApcPayment(submission);
    if (isApcAlreadyCleared(prepared.status)) {
      return jsonOk({ alreadyCleared: true, status: prepared.status });
    }
    if (!prepared.paymentId) {
      return jsonError("Could not prepare APC payment", 500);
    }

    const reportedAt = new Date();
    await prisma.$transaction([
      prisma.submission.update({
        where: { id: submission.id },
        data: {
          apcPaymentStatus: "REPORTED",
          actionRequired:
            "PayPal APC payment reported — awaiting editorial confirmation.",
        },
      }),
      prisma.payment.update({
        where: { id: prepared.paymentId },
        data: {
          status: "REPORTED",
          reportedAt,
          customerEmail: submission.author.email,
        },
      }),
    ]);

    void notifyAdmins({
      submissionId: submission.id,
      title: "APC awaiting confirmation",
      body: `${submission.author.name} (${submission.author.email}) reported PayPal APC for “${submission.title}” (${submission.manuscriptId})${body.note ? `. Note: ${body.note}` : ""}. Open Admin → APC inbox to confirm and email the receipt.`,
    }).catch((err) => console.error("[notify-admins paypal]", err));

    return jsonOk({ reported: true, status: "REPORTED" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[payments/checkout PUT]", err);
    return jsonError("Could not notify editors", 500);
  }
}
