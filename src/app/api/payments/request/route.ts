import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { needsApcPayment } from "@/lib/apc";
import { formatCustomerUsd, CUSTOMER_CURRENCY } from "@/lib/payment-currency";
import { toCustomerPayment } from "@/lib/payment-dto";
import { verifyApcPayToken } from "@/lib/payment-link";

/**
 * Public (token) payment request — USD only, for the Nahda pay page.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const parsed = await verifyApcPayToken(token);
  if (!parsed) return jsonError("This payment link is invalid or has expired.", 401);

  const submission = await prisma.submission.findUnique({
    where: { id: parsed.submissionId },
    include: {
      journal: true,
      payment: true,
      author: { select: { name: true } },
    },
  });
  if (!submission || submission.deletedAt) {
    return jsonError("Payment request not found", 404);
  }

  const customer = toCustomerPayment(submission.payment);
  const amountLabel =
    customer?.amountLabel ??
    (submission.payment
      ? formatCustomerUsd(submission.payment.amountCents)
      : null);

  return jsonOk({
    submissionId: submission.id,
    manuscriptId: submission.manuscriptId,
    title: submission.title,
    journalTitle: submission.journal.title,
    amount: customer?.amount ?? null,
    amountCents: submission.payment?.amountCents ?? null,
    amountLabel,
    currency: CUSTOMER_CURRENCY,
    status: submission.apcPaymentStatus,
    alreadyCleared: !needsApcPayment(submission.apcPaymentStatus),
  });
}
