import type { CSSProperties, ReactNode } from "react";
import {
  ORCID_GREEN,
  ORCID_GREEN_DARK,
  orcidUrl,
  parseAuthorOrcid,
} from "@/lib/orcid";

/** Official ORCID iD mark — green circle with white iD. */
export function OrcidIdIcon({
  className = "h-[13px] w-[13px]",
}: {
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path
        fill={ORCID_GREEN}
        d="M256 128c0 70.7-57.3 128-128 128S0 198.7 0 128 57.3 0 128 0s128 57.3 128 128z"
      />
      <path
        fill="#FFF"
        d="M86.3 186.2H70.9V79.1h15.4v107.1zM108.9 79.1h41.6c39.6 0 57 28.3 57 53.6 0 27.5-21.5 53.6-56.8 53.6h-41.8V79.1zm15.4 93.3h24.5c34.9 0 42.9-26.5 42.9-39.7 0-21.5-13.7-39.7-43.7-39.7h-23.7v79.4z"
      />
      <circle fill="#FFF" cx="78.6" cy="56.8" r="10.1" />
    </svg>
  );
}

type AuthorLineProps = {
  authors: string[];
  /** Affiliation superscripts, indexed with the author list. */
  affiliations?: string[];
  correspondingLast?: boolean;
  correspondingColor?: string;
  className?: string;
  nameStyle?: CSSProperties;
};

function joinSep(index: number, total: number): string {
  if (index === 0) return "";
  // Two authors: "Alice and Bob" (never "&")
  if (total === 2) return " and ";
  // Three or more: comma-separated ("Alice, Bob, Carol")
  return ", ";
}

function AuthorChip({
  raw,
  index,
  total,
  correspondingLast,
  correspondingColor,
  nameStyle,
}: {
  raw: string;
  index: number;
  total: number;
  correspondingLast: boolean;
  correspondingColor?: string;
  nameStyle?: CSSProperties;
}) {
  const { name, orcid } = parseAuthorOrcid(raw);
  const label = name || "Author";
  const isLast = index === total - 1;
  // Match affiliation numbering: 1st author → ¹, 2nd → ², …
  const affN = total >= 2 ? index + 1 : null;

  const nameNode = (
    <span
      className="font-bold tracking-tight"
      style={{
        fontFamily: "Helvetica, Arial, sans-serif",
        ...nameStyle,
      }}
    >
      {label}
    </span>
  );

  const badge = orcid ? (
    <OrcidIdIcon className="relative top-px ml-[2px] inline-block h-[12px] w-[12px] shrink-0 sm:h-[13px] sm:w-[13px]" />
  ) : null;

  const linked: ReactNode = orcid ? (
    <a
      href={orcidUrl(orcid)}
      target="_blank"
      rel="noopener noreferrer"
      title={`ORCID ${orcid}`}
      aria-label={`${label}, ORCID ${orcid}`}
      className="group/orcid inline-flex items-center no-underline"
      style={{ color: ORCID_GREEN_DARK }}
    >
      <span className="text-[#0b1f33] transition-colors group-hover/orcid:text-[#638C1C]">
        {nameNode}
      </span>
      {badge}
    </a>
  ) : (
    <span className="inline-flex items-center text-[#0b1f33]">{nameNode}</span>
  );

  return (
    <span>
      {joinSep(index, total)}
      {linked}
      {affN != null ? (
        <sup
          className="ml-[1px] inline-block align-super text-[0.65em] font-semibold leading-none"
          style={{ color: "var(--j-link, var(--accent))" }}
        >
          {affN}
        </sup>
      ) : null}
      {correspondingLast && isLast ? (
        <span
          className="ml-[1px] align-super text-[0.75em] font-bold leading-none"
          style={{ color: correspondingColor || "var(--j-link, #3d6f8f)" }}
        >
          *
        </span>
      ) : null}
    </span>
  );
}

/**
 * Journal-style author line: bold names, ORCID iD mark tight to the name,
 * linked in ORCID green rather than default blue.
 */
export function AuthorOrcidLine({
  authors,
  correspondingLast = true,
  correspondingColor,
  className,
  nameStyle,
}: AuthorLineProps) {
  if (authors.length === 0) {
    return <span className={className}>Author names</span>;
  }

  return (
    <span className={className}>
      {authors.map((raw, i) => (
        <AuthorChip
          key={`${raw}-${i}`}
          raw={raw}
          index={i}
          total={authors.length}
          correspondingLast={correspondingLast}
          correspondingColor={correspondingColor}
          nameStyle={nameStyle}
        />
      ))}
    </span>
  );
}
