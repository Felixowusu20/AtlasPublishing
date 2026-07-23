export default function HelpPage() {
  const faqs = [
    [
      "How do I submit a manuscript?",
      "Sign in, open For Authors → Submit a manuscript, then complete the 6-step wizard.",
    ],
    [
      "Can I track my paper after submission?",
      "Yes. Use Author dashboard or open the manuscript from My manuscripts to see editorial progress.",
    ],
    [
      "What file formats are accepted?",
      "Word, PDF, LaTeX ZIP, images, Excel/CSV supplements. Uploads are mocked until Cloudinary is connected.",
    ],
    [
      "How do APCs and waivers work?",
      "See Fees & waivers. Payment providers (Stripe/Paystack) will be mocked until billing is wired.",
    ],
    [
      "Is this connected to a real database?",
      "Not yet. Auth and demo data run in the browser. PostgreSQL + Prisma come next.",
    ],
  ];

  return (
    <div className="page-wrap">
      <h1 className="page-title">Help centre</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Quick answers for authors and readers.
      </p>

      <div className="mt-8 space-y-3">
        {faqs.map(([q, a]) => (
          <details key={q} className="card group open:shadow-md">
            <summary className="cursor-pointer list-none px-5 py-4 font-medium text-[var(--ink)]">
              {q}
            </summary>
            <p className="border-t border-[var(--line)] px-5 py-4 text-sm text-[var(--muted)]">
              {a}
            </p>
          </details>
        ))}
      </div>

      <div id="contact" className="mt-10 card p-6">
        <h2 className="font-semibold text-[var(--ink)]">Contact support</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Email{" "}
          <span className="font-medium text-[var(--ink)]">
            support@atlas.pub
          </span>{" "}
          (demo). Typical response within 1 to 2 business days.
        </p>
      </div>
    </div>
  );
}
