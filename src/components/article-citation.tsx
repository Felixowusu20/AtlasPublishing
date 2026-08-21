import Link from "next/link";
import { atlasDoiPath, normalizeDoi } from "@/lib/doi";
import {
  buildApaCitation,
  type ApaCitationInput,
} from "@/lib/apa-citation";

type Props = ApaCitationInput & {
  journalSlug?: string;
  /** Compact sidebar variant vs full footer */
  variant?: "card" | "banner";
  className?: string;
};

/** Plain-text APA 7 citation for copy / share actions. */
export function buildCitationText(opts: ApaCitationInput) {
  return buildApaCitation(opts).text;
}

function ApaCitationText({
  citation,
  isBanner,
  journalSlug,
}: {
  citation: ReturnType<typeof buildApaCitation>;
  isBanner: boolean;
  journalSlug?: string;
}) {
  const ink = isBanner ? "text-white" : "text-[var(--ink)]";
  const journalClass = "italic text-[var(--brand-orange)]";
  const hasLocator = Boolean(
    citation.volume || citation.issue || citation.pages,
  );
  const doiHref = citation.doiUrl
    ? atlasDoiPath(
        normalizeDoi(citation.doiUrl.replace(/^https?:\/\/doi\.org\//i, "")),
      )
    : null;

  return (
    <p className={`text-[15px] leading-[1.75] sm:text-base ${ink}`}>
      <span className="font-medium">{citation.authors}</span>
      {` (${citation.year}). ${citation.title}${/[.?!]$/.test(citation.title) ? "" : "."} `}
      {journalSlug ? (
        <Link
          href={`/journals/${journalSlug}`}
          className={`${journalClass} hover:underline`}
        >
          {citation.journal}
        </Link>
      ) : (
        <span className={journalClass}>{citation.journal}</span>
      )}
      {hasLocator ? ", " : "."}
      {citation.volume ? <em>{citation.volume}</em> : null}
      {citation.issue ? <span>({citation.issue})</span> : null}
      {citation.pages ? (
        <span>
          {citation.volume || citation.issue ? ", " : null}
          {citation.pages}
        </span>
      ) : null}
      {hasLocator ? "." : null}
      {citation.doiUrl && doiHref ? (
        <>
          {" "}
          <a
            href={doiHref}
            className={`break-all underline-offset-2 hover:underline ${
              isBanner ? "text-emerald-200" : "text-[var(--accent)]"
            }`}
          >
            {citation.doiUrl}
          </a>
        </>
      ) : null}
    </p>
  );
}

/**
 * How-to-cite block shown as a single APA 7th-edition paragraph.
 */
export function ArticleCitation({
  authors,
  title,
  journalTitle,
  journalSlug,
  publishedAt,
  volume,
  issue,
  pages,
  doi,
  variant = "card",
  className = "",
}: Props) {
  const citation = buildApaCitation({
    authors,
    title,
    journalTitle,
    publishedAt,
    volume,
    issue,
    pages,
    doi,
  });
  const isBanner = variant === "banner";

  return (
    <figure
      className={`overflow-hidden rounded-2xl ${
        isBanner
          ? "bg-[var(--ink)] text-white shadow-lg ring-1 ring-black/10"
          : "bg-white ring-1 ring-[var(--line)]"
      } ${className}`}
    >
      <div
        className={`flex items-center justify-between gap-2 border-b px-4 py-3 sm:px-5 ${
          isBanner
            ? "border-white/10 bg-[var(--accent)]/25"
            : "border-[var(--line)] bg-[linear-gradient(90deg,var(--accent-soft),white_70%)]"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              isBanner ? "bg-[var(--brand-orange)]" : "bg-[var(--accent)]"
            }`}
          />
          <figcaption
            className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
              isBanner ? "text-white/75" : "text-[var(--accent)]"
            }`}
          >
            Cite this article
          </figcaption>
        </div>
        <span
          className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
            isBanner ? "text-white/50" : "text-[var(--muted)]"
          }`}
        >
          APA 7th
        </span>
      </div>

      <blockquote className="px-4 py-5 sm:px-5 sm:py-6">
        <ApaCitationText
          citation={citation}
          isBanner={isBanner}
          journalSlug={journalSlug}
        />
      </blockquote>
    </figure>
  );
}
