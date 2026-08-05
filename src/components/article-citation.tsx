import Link from "next/link";
import { atlasDoiPath, normalizeDoi } from "@/lib/doi";

type Props = {
  authors: string[];
  title: string;
  journalTitle: string;
  journalSlug?: string;
  publishedAt: string;
  doi: string;
  /** Compact sidebar variant vs full footer */
  variant?: "card" | "banner";
  className?: string;
};

/** Plain-text citation for copy / share actions. */
export function buildCitationText(opts: {
  authors: string[];
  title: string;
  journalTitle: string;
  publishedAt: string;
  doi: string;
}) {
  const authorLabel =
    opts.authors.length === 0
      ? "Author"
      : opts.authors.length === 1
        ? opts.authors[0]
        : opts.authors.length === 2
          ? `${opts.authors[0]} & ${opts.authors[1]}`
          : `${opts.authors[0]} et al.`;
  const doiPart =
    opts.doi && opts.doi !== "Pending" ? ` DOI: ${normalizeDoi(opts.doi)}` : "";
  return `${authorLabel}. ${opts.title}. ${opts.journalTitle}. ${opts.publishedAt}.${doiPart}`;
}

/**
 * How-to-cite block with spaced parts and Nahda brand accents.
 */
export function ArticleCitation({
  authors,
  title,
  journalTitle,
  journalSlug,
  publishedAt,
  doi,
  variant = "card",
  className = "",
}: Props) {
  const authorList =
    authors.length === 0
      ? ["Author"]
      : authors.length <= 3
        ? authors
        : [...authors.slice(0, 2), `et al.`];

  const doiNorm = doi && doi !== "Pending" ? normalizeDoi(doi) : null;
  const doiHref = doiNorm ? atlasDoiPath(doiNorm) : null;
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
        className={`flex items-center gap-2 border-b px-4 py-3 sm:px-5 ${
          isBanner
            ? "border-white/10 bg-[var(--accent)]/25"
            : "border-[var(--line)] bg-[linear-gradient(90deg,var(--accent-soft),white_70%)]"
        }`}
      >
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
          How to cite
        </figcaption>
      </div>

      <div className="space-y-4 px-4 py-5 sm:px-5 sm:py-6">
        {/* Authors */}
        <p
          className={`flex flex-wrap items-baseline gap-x-1 gap-y-1 text-[14px] leading-relaxed sm:text-[15px] ${
            isBanner ? "text-white" : "text-[var(--ink)]"
          }`}
        >
          {authorList.map((name, i) => {
            const isEtAl = name === "et al.";
            const isLast = i === authorList.length - 1;
            const sep =
              isLast || isEtAl
                ? ""
                : i === authorList.length - 2
                  ? authorList[authorList.length - 1] === "et al."
                    ? " "
                    : " & "
                  : ", ";
            return (
              <span key={`${name}-${i}`}>
                <span
                  className={
                    isEtAl
                      ? isBanner
                        ? "italic text-white/65"
                        : "italic text-[var(--muted)]"
                      : isBanner
                        ? "font-semibold text-emerald-200"
                        : "font-semibold text-[var(--accent)]"
                  }
                >
                  {name}
                </span>
                {sep ? (
                  <span className={isBanner ? "text-white/40" : "text-[var(--muted)]"}>
                    {sep}
                  </span>
                ) : null}
              </span>
            );
          })}
        </p>

        {/* Title */}
        <p
          className={`font-[family-name:var(--font-display)] text-[1.05rem] font-semibold leading-snug tracking-tight sm:text-[1.15rem] ${
            isBanner ? "text-white" : "text-[var(--ink)]"
          }`}
        >
          {title}
        </p>

        {/* Journal · date */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
          {journalSlug ? (
            <Link
              href={`/journals/${journalSlug}`}
              className={`font-semibold transition ${
                isBanner
                  ? "text-[var(--brand-orange)] hover:text-[#e8835a]"
                  : "text-[var(--brand-orange)] hover:underline"
              }`}
            >
              {journalTitle}
            </Link>
          ) : (
            <span
              className={`font-semibold ${
                isBanner ? "text-[var(--brand-orange)]" : "text-[var(--brand-orange)]"
              }`}
            >
              {journalTitle}
            </span>
          )}
          <span
            className={`select-none ${isBanner ? "text-white/35" : "text-[var(--line)]"}`}
            aria-hidden
          >
            ·
          </span>
          <time
            className={
              isBanner ? "tabular-nums text-white/70" : "tabular-nums text-[var(--muted)]"
            }
          >
            {publishedAt}
          </time>
        </div>

        {/* DOI */}
        {doiNorm ? (
          <div
            className={`flex flex-wrap items-center gap-2 rounded-xl px-3.5 py-3 ${
              isBanner
                ? "bg-white/8 ring-1 ring-white/15"
                : "bg-[var(--accent-soft)]/70 ring-1 ring-[var(--accent)]/15"
            }`}
          >
            <span
              className={`text-[10px] font-bold uppercase tracking-[0.16em] ${
                isBanner ? "text-[var(--brand-orange)]" : "text-[var(--accent)]"
              }`}
            >
              DOI
            </span>
            {doiHref ? (
              <a
                href={doiHref}
                className={`min-w-0 break-all text-[13px] font-semibold underline-offset-2 hover:underline ${
                  isBanner ? "text-white" : "text-[var(--ink)]"
                }`}
              >
                {doiNorm}
              </a>
            ) : (
              <span
                className={`min-w-0 break-all text-[13px] font-semibold ${
                  isBanner ? "text-white" : "text-[var(--ink)]"
                }`}
              >
                {doiNorm}
              </span>
            )}
          </div>
        ) : null}
      </div>
    </figure>
  );
}
