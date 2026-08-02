import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatApcAmount, parseApcAmountCents } from "@/lib/apc";

export const dynamic = "force-dynamic";

export default async function FeesPage() {
  const journals = await prisma.journal.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="page-wrap">
      <h1 className="page-title">Fees & waivers</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Article processing charges by journal. Payment is collected after
        acceptance.
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="bg-[var(--surface)] text-xs uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Journal</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">
                  Access
                </th>
                <th className="px-4 py-3 font-semibold">APC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {journals.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-[var(--muted)]"
                  >
                    No active journals yet.
                  </td>
                </tr>
              )}
              {journals.map((j) => {
                const cents = parseApcAmountCents(j.apc, {
                  openAccess: j.openAccess,
                });
                return (
                  <tr key={j.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/journals/${j.slug}`}
                        className="font-medium text-[var(--accent)] hover:underline"
                      >
                        {j.title}
                      </Link>
                      <span className="mt-0.5 block text-xs text-[var(--muted)] sm:hidden">
                        {j.openAccess ? "Open Access" : "Subscription"}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-[var(--muted)] sm:table-cell">
                      {j.openAccess ? "Open Access" : "Subscription"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      {cents > 0
                        ? formatApcAmount(cents)
                        : j.apc?.trim() || "No APC"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 card p-5 text-sm text-[var(--muted)]">
        <p className="font-semibold text-[var(--ink)]">Waivers</p>
        <p className="mt-2">
          Waiver requests can be sent to the editorial office. Approved waivers
          are applied after acceptance.
        </p>
      </div>
    </div>
  );
}
