import Link from "next/link";

type Props = {
  keywords: string[];
  className?: string;
};

/** Journal-style keyword row with searchable chips and comma-separated semantics. */
export function ArticleKeywords({ keywords, className = "" }: Props) {
  if (keywords.length === 0) return null;

  return (
    <div
      className={`rounded-xl border border-[var(--line)] border-l-[3px] border-l-[var(--accent)] bg-[var(--surface)]/40 px-4 py-3.5 ${className}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
        Keywords
      </p>
      <ul className="mt-2.5 flex flex-wrap gap-2" role="list">
        {keywords.map((keyword, i) => (
          <li key={`${keyword}-${i}`}>
            <Link
              href={`/search?q=${encodeURIComponent(keyword)}`}
              className="inline-flex rounded-md border border-[var(--line)] bg-white px-2.5 py-1 text-[12px] font-medium text-[var(--ink)] shadow-[0_1px_0_rgba(11,31,51,0.04)] transition hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
              title={`Search for “${keyword}”`}
            >
              {keyword}
            </Link>
          </li>
        ))}
      </ul>
      <p className="sr-only">{keywords.join(", ")}</p>
    </div>
  );
}
