export default function AboutPage() {
  return (
    <div className="page-wrap">
      <h1 className="page-title">About Nahda</h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
        Nahda Publications is a multi-journal platform for manuscript
        submission, peer review, and scholarly publishing. We support authors
        from first submission through DOI assignment and open publication.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ["Journals", "Multiple titles under one publishing house"],
          ["Workflow", "Submission → review → decision → production"],
          ["Access", "Open access and subscription models"],
        ].map(([t, d]) => (
          <div key={t} className="card p-5">
            <h2 className="font-semibold">{t}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{d}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-sm text-[var(--muted)]">
        Questions? Contact{" "}
        <a
          href="mailto:nahdapublications@gmail.com"
          className="font-semibold text-[var(--accent)] hover:underline"
        >
          nahdapublications@gmail.com
        </a>
        .
      </p>
    </div>
  );
}
