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
      "See Fees & waivers. APC is paid after acceptance, before production.",
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
            <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-medium text-[var(--ink)] sm:px-5 sm:py-4 sm:text-base">
              {q}
            </summary>
            <p className="border-t border-[var(--line)] px-4 py-3.5 text-sm text-[var(--muted)] sm:px-5 sm:py-4">
              {a}
            </p>
          </details>
        ))}
      </div>

      <div id="contact" className="mt-10 card p-6">
        <h2 className="font-semibold text-[var(--ink)]">Contact support</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Email{" "}
          <span className="break-all font-medium text-[var(--ink)]">
            nahdapublications@gmail.com
          </span>{" "}
          (demo). Typical response within 1 to 2 business days.
        </p>
      </div>
    </div>
  );
}
