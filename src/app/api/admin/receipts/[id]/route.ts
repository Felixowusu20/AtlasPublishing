import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { nahdaReceiptNumber } from "@/lib/apc-checkout";
import { formatCustomerUsd } from "@/lib/payment-currency";
import { parseAuthorsJson } from "@/lib/author-contacts";
import {
  apcReceiptDownloadHtml,
  receiptDownloadFilename,
} from "@/lib/receipt-html";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const admin = await requireAdmin(["SUPER_ADMIN"]);
  if (!admin) return unauthorized();
  const { id } = await params;
  const download = new URL(request.url).searchParams.get("download") === "1";

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      submission: {
        select: {
          manuscriptId: true,
          title: true,
          authorsJson: true,
          author: { select: { name: true, email: true } },
          journal: { select: { title: true } },
        },
      },
    },
  });

  if (!payment || payment.status !== "PAID") {
    return jsonError("Receipt not found", 404);
  }

  const paidAt = payment.paidAt ?? payment.createdAt;
  const listed = parseAuthorsJson(payment.submission.authorsJson);
  const names = listed.map((a) => a.name);
  if (
    payment.submission.author.name &&
    !names.some(
      (n) => n.toLowerCase() === payment.submission.author.name.toLowerCase(),
    )
  ) {
    names.unshift(payment.submission.author.name);
  }
  const receiptNumber = nahdaReceiptNumber(
    payment.submission.manuscriptId,
    paidAt,
  );
  const html = apcReceiptDownloadHtml({
    receiptNumber,
    authorNames: names.join(", ") || payment.submission.author.name,
    title: payment.submission.title,
    manuscriptId: payment.submission.manuscriptId,
    journalTitle: payment.submission.journal.title,
    amountLabel: formatCustomerUsd(payment.amountCents),
    paidAtLabel: paidAt.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    reference: payment.paystackReference,
    customerEmail:
      payment.customerEmail || payment.submission.author.email,
  });

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${receiptDownloadFilename(receiptNumber)}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
