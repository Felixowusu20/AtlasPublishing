import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-wrap flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-[var(--accent)]">
        404
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-sm text-[var(--muted)]">
        That link does not exist, or the page was moved. Try one of these
        instead.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">
          Home
        </Link>
        <Link href="/journals" className="btn-secondary">
          Journals
        </Link>
        <Link href="/articles" className="btn-secondary">
          Articles
        </Link>
        <Link href="/help" className="btn-secondary">
          Help
        </Link>
      </div>
    </div>
  );
}
