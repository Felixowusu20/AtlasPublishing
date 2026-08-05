import { prisma } from "@/lib/db";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { formatApcAmount } from "@/lib/apc";

type RangePreset = "daily" | "weekly" | "monthly" | "annual" | "custom";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function resolveRange(
  preset: RangePreset,
  fromParam: string | null,
  toParam: string | null,
): { from: Date; to: Date; label: string; preset: RangePreset } {
  const now = new Date();
  const to = endOfDay(now);

  if (preset === "custom" && fromParam && toParam) {
    const from = startOfDay(new Date(fromParam));
    const customTo = endOfDay(new Date(toParam));
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(customTo.getTime())) {
      return {
        from,
        to: customTo,
        preset,
        label: `${from.toLocaleDateString()} – ${customTo.toLocaleDateString()}`,
      };
    }
  }

  if (preset === "daily") {
    const from = startOfDay(now);
    return { from, to, preset: "daily", label: "Today" };
  }
  if (preset === "weekly") {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    return { from, to, preset: "weekly", label: "Last 7 days" };
  }
  if (preset === "annual") {
    const from = startOfDay(new Date(now.getFullYear(), 0, 1));
    return { from, to, preset: "annual", label: String(now.getFullYear()) };
  }
  // monthly (default)
  const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  return {
    from,
    to,
    preset: "monthly",
    label: now.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
  };
}

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
    ) as RangePreset;

    const { from, to, label, preset: activePreset } = resolveRange(
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
    const byJournal = [...byJournalMap.values()]
      .sort((a, b) => b.amountCents - a.amountCents)
      .map((j) => ({
        ...j,
        amountLabel: formatApcAmount(j.amountCents, "usd"),
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
        amountLabel: formatApcAmount(totalCents, "usd"),
        payments: paid.length,
        pending: pendingCount,
        waived: waivedCount,
      },
      byJournal,
    });
  } catch (err) {
    console.error("[admin payment analytics]", err);
    return jsonError("Could not load payment analytics", 500);
  }
}
