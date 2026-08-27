import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { nahdaReceiptNumber } from "@/lib/apc-checkout";
import { formatCustomerUsd } from "@/lib/payment-currency";
import { parseAuthorsJson } from "@/lib/author-contacts";

function startOfDay(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function GET(request: Request) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const from = startOfDay(url.searchParams.get("from") ?? "");
  const to = endOfDay(url.searchParams.get("to") ?? "");

  const paidAt =
    from || to
      ? {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        }
      : undefined;

  const payments = await prisma.payment.findMany({
    where: {
      status: "PAID",
      ...(paidAt ? { paidAt } : {}),
    },
    include: {
      submission: {
        select: {
          id: true,
          manuscriptId: true,
          title: true,
          authorsJson: true,
          author: { select: { name: true, email: true } },
          journal: { select: { title: true, shortTitle: true } },
        },
      },
    },
    orderBy: { paidAt: "desc" },
  });

  const receipts = payments
    .map((payment) => {
      const paidAtDate = payment.paidAt ?? payment.createdAt;
      const listed = parseAuthorsJson(payment.submission.authorsJson);
      const names = listed.map((a) => a.name);
      const emails = listed.map((a) => a.email);
      if (
        payment.submission.author.name &&
        !names.some(
          (n) =>
            n.toLowerCase() === payment.submission.author.name.toLowerCase(),
        )
      ) {
        names.unshift(payment.submission.author.name);
      }
      if (
        payment.submission.author.email &&
        !emails.some(
          (e) => e === payment.submission.author.email.toLowerCase(),
        )
      ) {
        emails.unshift(payment.submission.author.email);
      }
      if (
        payment.customerEmail &&
        !emails.some((e) => e === payment.customerEmail?.toLowerCase())
      ) {
        emails.push(payment.customerEmail);
      }

      const receiptNumber = nahdaReceiptNumber(
        payment.submission.manuscriptId,
        paidAtDate,
      );

      return {
        id: payment.id,
        receiptNumber,
        paidAt: paidAtDate.toISOString(),
        amountCents: payment.amountCents,
        amountLabel: formatCustomerUsd(payment.amountCents),
        paystackReference: payment.paystackReference,
        customerEmail: payment.customerEmail,
        manuscriptId: payment.submission.manuscriptId,
        title: payment.submission.title,
        journalTitle: payment.submission.journal.title,
        journalShortTitle: payment.submission.journal.shortTitle,
        authorNames: names,
        emails,
        downloadPath: `/api/admin/receipts/${payment.id}?download=1`,
      };
    })
    .filter((row) => {
      if (!q) return true;
      const haystack = [
        row.receiptNumber,
        row.paystackReference,
        row.customerEmail,
        row.manuscriptId,
        row.title,
        ...row.authorNames,
        ...row.emails,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

  const totalCents = receipts.reduce((sum, row) => sum + row.amountCents, 0);

  return jsonOk({
    receipts,
    totals: {
      count: receipts.length,
      amountCents: totalCents,
      amountLabel: formatCustomerUsd(totalCents),
    },
  });
}
