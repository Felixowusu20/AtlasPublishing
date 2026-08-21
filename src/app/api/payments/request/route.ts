import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { formatCustomerUsd, CUSTOMER_CURRENCY } from "@/lib/payment-currency";
import { livePendingApcCents, toCustomerPayment } from "@/lib/payment-dto";
import { resolveApcPayLink } from "@/lib/payment-link";

/**
 * Public (token) payment request — USD only, for the Nahda pay page.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const parsed = await resolveApcPayLink(token);
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

  const liveCents = livePendingApcCents(
    submission.journal,
    submission.payment,
    submission.apcPaymentStatus,
  );
  const customer = toCustomerPayment(submission.payment, liveCents);
  const amountCents = liveCents ?? submission.payment?.amountCents ?? null;
  const amountLabel =
    customer?.amountLabel ??
    (amountCents != null ? formatCustomerUsd(amountCents) : null);

  return jsonOk({
    submissionId: submission.id,
    manuscriptId: submission.manuscriptId,
    title: submission.title,
    journalTitle: submission.journal.title,
    amount: customer?.amount ?? null,
    amountCents,
    amountLabel,
    currency: CUSTOMER_CURRENCY,
    status: submission.apcPaymentStatus,
    alreadyCleared:
      submission.apcPaymentStatus === "PAID" ||
      submission.apcPaymentStatus === "WAIVED" ||
      ((submission.apcPaymentStatus === "NOT_REQUIRED" ||
        !submission.apcPaymentStatus) &&
        (amountCents == null || amountCents <= 0)),
  });
}
