import Link from "next/link";
import { journals } from "@/data/mock";

export default function FeesPage() {
  return (
    <div className="page-wrap">
      <h1 className="page-title">Fees & waivers</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Article processing charges (APC) by journal. Payments are mocked for
        now (Stripe / Paystack later).
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface)] text-xs uppercase tracking-wider text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Journal</th>
              <th className="px-4 py-3 font-semibold">Access</th>
              <th className="px-4 py-3 font-semibold">APC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {journals.map((j) => (
              <tr key={j.id}>
                <td className="px-4 py-3">
                  <Link
                    href={`/journals/${j.slug}`}
                    className="font-medium text-[var(--accent)] hover:underline"
                  >
                    {j.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">
                  {j.openAccess ? "Open Access" : "Subscription"}
                </td>
                <td className="px-4 py-3 font-medium">{j.apc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 card p-5 text-sm text-[var(--muted)]">
        <p className="font-semibold text-[var(--ink)]">Waivers</p>
        <p className="mt-2">
          Full or partial waivers may be available for corresponding authors from
          low-income economies, or via institutional sponsorship. Request a
          waiver during submission (demo placeholder).
        </p>
      </div>
    </div>
  );
}
