import { prisma } from "@/lib/db";
import { jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { formatCustomerUsd } from "@/lib/payment-currency";
import { toAdminPayment } from "@/lib/payment-dto";

/**
 * Admin inbox: PayPal APC transfers authors reported (awaiting confirmation).
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const rows = await prisma.payment.findMany({
    where: { status: "REPORTED" },
    orderBy: [{ reportedAt: "desc" }, { updatedAt: "desc" }],
    include: {
      submission: {
        select: {
          id: true,
          manuscriptId: true,
          title: true,
          status: true,
          apcPaymentStatus: true,
          actionRequired: true,
          author: { select: { id: true, name: true, email: true } },
          journal: {
            select: { id: true, title: true, shortTitle: true, slug: true },
          },
        },
      },
    },
  });

  const items = rows.map((payment) => ({
    paymentId: payment.id,
    reportedAt: payment.reportedAt?.toISOString() ?? payment.updatedAt.toISOString(),
    amountCents: payment.amountCents,
    amountLabel: formatCustomerUsd(payment.amountCents),
    paypalReference: payment.paystackReference,
    payment: toAdminPayment(payment),
    submission: payment.submission,
  }));

  return jsonOk({
    count: items.length,
    items,
  });
}
