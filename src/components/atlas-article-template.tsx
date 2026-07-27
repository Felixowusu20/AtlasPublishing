"use client";

type Props = {
  journalTitle: string;
  journalShortTitle: string;
  manuscriptId: string;
  title: string;
  authors: string[];
  affiliations: string[];
  abstract: string;
  keywords: string[];
  articleType: string;
  doi?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  license?: string;
  openAccess?: boolean;
  logoUrl?: string | null;
  publishedAt?: string;
  body?: string;
};

function renderBodyPreview(body?: string) {
  if (!body?.trim()) return null;
  const blocks = body.trim().split(/\n{2,}/);
  return blocks.map((block, i) => {
    const lines = block.split("\n");
    const first = lines[0]?.trim() ?? "";

    if (/^#{1,3}\s+/.test(first)) {
      const level = (first.match(/^#+/)?.[0].length ?? 1) as 1 | 2 | 3;
      const text = first.replace(/^#{1,3}\s+/, "");
      const Tag = level === 1 ? "h2" : level === 2 ? "h3" : "h4";
      const sizes = {
        1: "mt-6 text-base font-semibold text-[#0b1f33]",
        2: "mt-5 text-sm font-semibold text-[#0b1f33]",
        3: "mt-4 text-[13px] font-semibold text-[#0b1f33]",
      } as const;
      return (
        <Tag key={i} className={sizes[level]}>
          {text}
        </Tag>
      );
    }

    if (/^\|.+\|$/.test(first) && lines.length >= 2) {
      const rows = lines
        .filter((l) => /^\|/.test(l.trim()) && !/^\|[\s:|-]+\|$/.test(l.trim()))
        .map((l) =>
          l
            .trim()
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map((c) => c.trim()),
        );
      if (rows.length === 0) return null;
      const [header, ...bodyRows] = rows;
      return (
        <div key={i} className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-[11px]">
            <thead>
              <tr className="border-b border-[#d7dee7] bg-[#f5f7fa]">
                {header.map((cell, ci) => (
                  <th key={ci} className="px-2 py-1.5 font-semibold text-[#0b1f33]">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri} className="border-b border-[#e8edf2]">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-1.5 text-[#0b1f33]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    const img = first.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (img && lines.length === 1) {
      const caption = img[1].replace(/\|\s*full\s*$/i, "").trim();
      return (
        <figure key={i} className="mt-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img[2]}
            alt={caption}
            className="mx-auto h-auto w-full max-w-full rounded border border-[#d7dee7] object-contain"
          />
          {caption ? (
            <figcaption className="mt-2 text-center text-[11px] text-[#5b6b7c]">
              {caption}
            </figcaption>
          ) : null}
        </figure>
      );
    }

    if (first === "$$" || block.startsWith("$$")) {
      const math = block.replace(/^\$\$\n?/, "").replace(/\n?\$\$$/, "");
      return (
        <pre
          key={i}
          className="mt-4 overflow-x-auto rounded bg-[#f5f7fa] px-3 py-2 text-center font-mono text-[12px] text-[#0b1f33]"
        >
          {math}
        </pre>
      );
    }

    return (
      <p
        key={i}
        className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-[#0b1f33]"
      >
        {block
          .replace(/\*\*([^*]+)\*\*/g, "$1")
          .replace(/\*([^*]+)\*/g, "$1")
          .replace(/^>\s?/gm, "")}
      </p>
    );
  });
}

function AtlasMark() {
  return (
    <div
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
      style={{
        background:
          "conic-gradient(from 210deg, #0f6b6a, #1a8f8c, #0b1f33, #0f6b6a)",
      }}
      aria-hidden
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[15px] font-bold tracking-tight text-[#0f6b6a]">
        A
      </div>
    </div>
  );
}

/**
 * Branded Atlas HTML article template — ACS-style masthead for admin preview.
 */
export function AtlasArticleTemplate({
  journalTitle,
  journalShortTitle,
  manuscriptId,
  title,
  authors,
  affiliations,
  abstract,
  keywords,
  articleType,
  doi,
  volume,
  issue,
  pages,
  license = "CC BY 4.0",
  openAccess = true,
  logoUrl,
  publishedAt,
  body,
}: Props) {
  const dateLabel =
    publishedAt ||
    new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const citeLine = `${authors[0] ? `${authors[0]}${authors.length > 1 ? " et al." : ""}` : "Author"}. ${title || "Article"}. ${journalShortTitle || "Atlas"} ${volume ? `${volume}` : ""}${issue ? ` (${issue})` : ""}. ${dateLabel}.`;

  const typeLabel = (articleType || "Article").replace(/\s+Article$/i, "") || "Article";

  return (
    <article
      id="atlas-article-template"
      className="atlas-article mx-auto max-w-[760px] bg-white text-[#0b1f33] shadow-sm"
    >
      {/* ACS-style journal masthead */}
      <header className="px-8 pt-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Atlas Academic Publishing"
                className="h-11 w-auto max-w-[120px] object-contain"
              />
            ) : (
              <AtlasMark />
            )}
            <div className="min-w-0 pt-0.5">
              <p className="text-[15px] font-bold uppercase tracking-[0.12em] text-[#5b6b7c]">
                Atlas{" "}
                <span className="text-[#0b1f33]">
                  {journalShortTitle || "Journal"}
                </span>
              </p>
              <p className="mt-0.5 truncate text-[11px] text-[#5b6b7c]">
                {journalTitle || "Journal"}
              </p>
            </div>
          </div>
          <div className="hidden shrink-0 text-right text-[10px] leading-relaxed text-[#5b6b7c] sm:block">
            <p className="font-semibold text-[#0b1f33]">{manuscriptId}</p>
            <p>{dateLabel}</p>
          </div>
        </div>

        {/* Accent rule + article badge (ACS-like) */}
        <div className="relative mt-5">
          <div className="h-[3px] w-full bg-[#0f6b6a]" />
          <span className="absolute -top-[11px] right-0 rounded-sm bg-[#0f6b6a] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            {typeLabel.length > 18 ? "Article" : typeLabel}
          </span>
        </div>
      </header>

      <div className="px-8 pb-8 pt-5">
        <h1 className="font-[family-name:var(--font-display)] text-[1.55rem] font-bold leading-snug tracking-tight text-[#0b1f33] sm:text-[1.75rem]">
          {title || "Article title"}
        </h1>

        <p className="mt-4 text-[11px] leading-relaxed text-[#5b6b7c]">
          {authors.length > 0 ? authors.join(", ") : "Author names"}
        </p>

        {affiliations.length > 0 && (
          <ul className="mt-2 space-y-0.5 font-[family-name:var(--font-display)] text-[1.05rem] leading-relaxed text-[#0b1f33]">
            {affiliations.map((aff, i) => (
              <li key={`${aff}-${i}`}>
                <sup className="mr-1 text-[0.7em] text-[#0f6b6a]">{i + 1}</sup>
                {aff}
              </li>
            ))}
          </ul>
        )}

        {/* Cite / Read Online action strip */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2.5 border-b-[3px] border-amber-500 bg-[#fafbfc] px-3 py-2.5">
            <span
              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 border-amber-500 text-[9px] font-bold text-amber-600"
              aria-hidden
            >
              ✓
            </span>
            <p className="min-w-0 text-[11px] leading-snug text-[#0b1f33]">
              <span className="font-semibold">Cite This: </span>
              <span className="text-[#0f6b6a]">{citeLine}</span>
            </p>
          </div>
          <div className="flex items-center gap-2.5 border-b-[3px] border-[#0f6b6a] bg-[#fafbfc] px-3 py-2.5">
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-[#0f6b6a] text-[8px] font-bold text-[#0f6b6a]"
              aria-hidden
            >
              ◎
            </span>
            <p className="text-[12px] font-bold text-[#0f6b6a]">Read More</p>
          </div>
        </div>

        {/* Secondary metrics row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 pb-3 text-[10px] font-semibold uppercase tracking-wide text-[#5b6b7c]">
          <span className="text-[#0f6b6a]">
            {openAccess ? "Open Access" : "Access"}
          </span>
          <span className="text-[#d7dee7]">|</span>
          <span>Metrics &amp; More</span>
          <span className="text-[#d7dee7]">|</span>
          <span>
            Vol. {volume || "—"} · Issue {issue || "—"}
          </span>
          <span className="text-[#d7dee7]">|</span>
          <span>DOI: {doi || "Pending"}</span>
          {pages ? (
            <>
              <span className="text-[#d7dee7]">|</span>
              <span>pp. {pages}</span>
            </>
          ) : null}
        </div>

        <p className="mt-3 text-[11px] text-[#5b6b7c]">
          {journalTitle}
          {license ? ` · ${license}` : ""}
          {" · "}
          Published {dateLabel}
        </p>

        <section className="mt-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0f6b6a]">
            Abstract
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[#0b1f33]">
            {abstract || "Abstract will appear here."}
          </p>
        </section>

        {keywords.length > 0 && (
          <section className="mt-5 rounded border border-[#d7dee7] border-l-[3px] border-l-[#0f6b6a] bg-[#f5f7fa] px-3.5 py-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0f6b6a]">
              Keywords
            </h2>
            <p className="mt-2 text-[12px] leading-relaxed text-[#0b1f33]">
              {keywords.map((k, i) => (
                <span key={`${k}-${i}`}>
                  {i > 0 ? ", " : ""}
                  <span className="font-medium">{k}</span>
                </span>
              ))}
            </p>
          </section>
        )}

        {body?.trim() ? (
          <section className="mt-8 border-t border-[#d7dee7] pt-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0f6b6a]">
              Article body
            </h2>
            <div className="mt-1">{renderBodyPreview(body)}</div>
          </section>
        ) : null}

        <section className="mt-8 rounded-lg bg-[#f5f7fa] px-4 py-3 text-[11px] leading-relaxed text-[#5b6b7c]">
          <p>
            © {new Date().getFullYear()} Atlas Academic Publishing. This article
            is published under {license}
            {openAccess ? " as open access" : ""}. Manuscript ID: {manuscriptId}.
          </p>
        </section>
      </div>
    </article>
  );
}
