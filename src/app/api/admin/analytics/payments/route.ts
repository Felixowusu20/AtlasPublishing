import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import {
  formatCustomerUsd,
  formatInternalGhs,
} from "@/lib/payment-currency";
import {
  resolveDateRange,
  type DateRangePreset,
} from "@/lib/date-range";

/**
 * Payment / APC analytics for admin overview.
 * Query: ?range=daily|weekly|monthly|annual|custom&from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    const url = new URL(request.url);
    const rawRange = (url.searchParams.get("range") ?? "monthly").toLowerCase();
    const preset = (
      ["daily", "weekly", "monthly", "annual", "custom"].includes(rawRange)
        ? rawRange
        : "monthly"
    ) as DateRangePreset;

    const { from, to, label, preset: activePreset } = resolveDateRange(
      preset,
      url.searchParams.get("from"),
      url.searchParams.get("to"),
    );

    const [paid, pendingCount, waivedCount] = await Promise.all([
      prisma.payment.findMany({
        where: {
          status: "PAID",
          paidAt: { gte: from, lte: to },
        },
        select: {
          id: true,
          amountCents: true,
          currency: true,
          paidAt: true,
          internalAmount: true,
          internalCurrency: true,
          exchangeRate: true,
          paystackReference: true,
          submission: {
            select: {
              manuscriptId: true,
              title: true,
              journal: {
                select: { id: true, shortTitle: true, title: true },
              },
            },
          },
        },
        orderBy: { paidAt: "desc" },
      }),
      prisma.payment.count({
        where: {
          status: "PENDING",
          createdAt: { gte: from, lte: to },
        },
      }),
      prisma.payment.count({
        where: {
          status: "WAIVED",
          OR: [
            { waivedAt: { gte: from, lte: to } },
            { updatedAt: { gte: from, lte: to } },
          ],
        },
      }),
    ]);

    const byJournalMap = new Map<
      string,
      {
        id: string;
        shortTitle: string;
        title: string;
        amountCents: number;
        count: number;
      }
    >();

    for (const p of paid) {
      const journal = p.submission.journal;
      const cur = byJournalMap.get(journal.id) ?? {
        id: journal.id,
        shortTitle: journal.shortTitle,
        title: journal.title,
        amountCents: 0,
        count: 0,
      };
      cur.amountCents += p.amountCents;
      cur.count += 1;
      byJournalMap.set(journal.id, cur);
    }

    const totalCents = paid.reduce((s, p) => s + p.amountCents, 0);
    const totalInternal = paid.reduce(
      (s, p) => s + (p.internalAmount ?? 0),
      0,
    );
    const byJournal = [...byJournalMap.values()]
      .sort((a, b) => b.amountCents - a.amountCents)
      .map((j) => ({
        ...j,
        amountLabel: formatCustomerUsd(j.amountCents),
        pct:
          totalCents > 0
            ? Math.round((j.amountCents / totalCents) * 1000) / 10
            : 0,
      }));

    return jsonOk({
      range: {
        preset: activePreset,
        label,
        from: from.toISOString(),
        to: to.toISOString(),
      },
      totals: {
        amountCents: totalCents,
        amountLabel: formatCustomerUsd(totalCents),
        internalAmount: totalInternal,
        internalAmountLabel:
          totalInternal > 0 ? formatInternalGhs(totalInternal) : null,
        payments: paid.length,
        pending: pendingCount,
        waived: waivedCount,
      },
      byJournal,
      recent: paid.slice(0, 12).map((p) => ({
        id: p.id,
        manuscriptId: p.submission.manuscriptId,
        title: p.submission.title,
        amountLabel: formatCustomerUsd(p.amountCents),
        internalAmountLabel: p.internalAmount
          ? formatInternalGhs(p.internalAmount)
          : null,
        exchangeRate: p.exchangeRate,
        paystackReference: p.paystackReference,
        paidAt: p.paidAt,
      })),
    });
  } catch (err) {
    console.error("[admin payment analytics]", err);
    return jsonError("Could not load payment analytics", 500);
  }
}
