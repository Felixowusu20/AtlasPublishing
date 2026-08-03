export default function HelpPage() {
  const faqs = [
    [
      "How do I submit a manuscript?",
      "Sign in, open For Authors → Submit a manuscript, then complete the submission wizard for your chosen journal.",
    ],
    [
      "Can I track my paper after submission?",
      "Yes. Use your author dashboard or open the manuscript from My manuscripts to see editorial progress and messages.",
    ],
    [
      "What file formats are accepted?",
      "Word (DOCX), PDF, LaTeX ZIP packages, images, and Excel/CSV supplements. Files are uploaded securely for editorial handling.",
    ],
    [
      "How do APCs and waivers work?",
      "See Fees & waivers. Article processing charges are paid after acceptance and before production. Waiver requests can be sent to the editorial office.",
    ],
    [
      "How are articles published and cited?",
      "Accepted articles receive a Nahda DOI, appear on the journal site, and include citation metadata for discovery services and Google Scholar.",
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
          <a
            href="mailto:nahdapublications@gmail.com"
            className="break-all font-medium text-[var(--accent)] hover:underline"
          >
            nahdapublications@gmail.com
          </a>
          . Typical response within 1 to 2 business days.
        </p>
      </div>
    </div>
  );
}
