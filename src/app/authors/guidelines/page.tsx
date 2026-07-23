import Link from "next/link";

export default function AuthorGuidelinesPage() {
  return (
    <div className="page-wrap">
      <h1 className="page-title">Author guidelines</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Follow these steps to prepare and submit a manuscript to any Atlas
        journal.
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {[
          {
            t: "1. Choose a journal",
            d: "Match your subject, article type, and open-access preference. Check aims & scope on the journal page.",
          },
          {
            t: "2. Prepare files",
            d: "Main manuscript (DOCX/PDF/LaTeX ZIP), figures, tables, supplementary files, and a cover letter.",
          },
          {
            t: "3. Complete metadata",
            d: "Title, abstract, keywords, author affiliations, ORCID, funding, ethics, and conflict of interest.",
          },
          {
            t: "4. Suggest reviewers",
            d: "Provide qualified suggestions and any opposed reviewers with a brief reason.",
          },
          {
            t: "5. Submit & track",
            d: "Confirm copyright/license statements, submit, then track status from your dashboard.",
          },
          {
            t: "6. Revisions",
            d: "Upload a revised manuscript and a point-by-point response when revisions are requested.",
          },
        ].map((item) => (
          <div key={item.t} className="card p-5">
            <h2 className="font-semibold text-[var(--ink)]">{item.t}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              {item.d}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/submissions/new" className="btn-primary">
          Start submission
        </Link>
        <Link href="/authors/article-types" className="btn-secondary">
          View article types
        </Link>
      </div>
    </div>
  );
}
