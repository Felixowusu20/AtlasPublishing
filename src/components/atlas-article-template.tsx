"use client";

import type { CSSProperties, ReactNode } from "react";
import { journalArticlePalette } from "@/lib/journal-colors";

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
  receivedAt?: string;
  acceptedAt?: string;
  body?: string;
  journalSlug?: string;
  coverColor?: string;
  articleUrl?: string;
  journalUrl?: string;
};

function parseWidthFlag(raw: string): { text: string; fullWidth: boolean } {
  const fullWidth = /\|\s*full\s*$/i.test(raw);
  const text = raw.replace(/\|\s*(full|col|column)\s*$/i, "").trim();
  return { text, fullWidth };
}

function renderBodyPreview(body?: string) {
  if (!body?.trim()) return null;
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const nodes: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const trimmed = lines[i]?.trim() ?? "";

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (/^#{1,3}\s+/.test(trimmed)) {
      const level = (trimmed.match(/^#+/)?.[0].length ?? 1) as 1 | 2 | 3;
      const text = trimmed.replace(/^#{1,3}\s+/, "");
      const Tag = level === 1 ? "h2" : level === 2 ? "h3" : "h4";
      const sizes = {
        1: "col-span-full mt-5 text-[13px] font-bold uppercase tracking-[0.08em]",
        2: "mt-4 text-[14px] font-bold text-[#0b1f33]",
        3: "mt-3 text-[13px] font-semibold italic text-[#5b6b7c]",
      } as const;
      nodes.push(
        <Tag
          key={key++}
          className={sizes[level]}
          style={level === 1 ? { color: "var(--j-primary)" } : undefined}
        >
          {text}
        </Tag>,
      );
      i += 1;
      continue;
    }

    if (/^\|.+\|$/.test(trimmed) && i + 1 < lines.length) {
      const start = i;
      const rows: string[][] = [];
      while (i < lines.length && /^\|.+\|$/.test(lines[i].trim())) {
        const row = lines[i].trim();
        if (!/^\|[\s:|-]+\|$/.test(row)) {
          rows.push(
            row
              .replace(/^\|/, "")
              .replace(/\|$/, "")
              .split("|")
              .map((c) => c.trim()),
          );
        }
        i += 1;
      }
      if (rows.length === 0) {
        i = start + 1;
        continue;
      }
      const [header, ...bodyRows] = rows;
      nodes.push(
        <div key={key++} className="col-span-full my-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-[11px]">
            <thead>
              <tr className="border-y border-[#0b1f33]">
                {header.map((cell, ci) => (
                  <th
                    key={ci}
                    className="px-2 py-1.5 font-semibold text-[#0b1f33]"
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr
                  key={ri}
                  className={
                    ri === bodyRows.length - 1
                      ? "border-b border-[#0b1f33]"
                      : "border-b border-[#e8edf2]"
                  }
                >
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-1.5 text-[#0b1f33]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const img = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (img) {
      const { text: caption, fullWidth } = parseWidthFlag(img[1]);
      nodes.push(
        <figure
          key={key++}
          className={fullWidth ? "col-span-full my-4" : "my-3"}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img[2]}
            alt={caption}
            className="mx-auto h-auto w-full max-w-full object-contain"
          />
          {caption ? (
            <figcaption className="mt-1.5 text-left text-[10px] leading-snug text-[#5b6b7c]">
              {caption}
            </figcaption>
          ) : null}
        </figure>,
      );
      i += 1;
      continue;
    }

    if (trimmed === "$$") {
      const math: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== "$$") {
        math.push(lines[i]);
        i += 1;
      }
      i += 1;
      nodes.push(
        <pre
          key={key++}
          className="col-span-full my-3 overflow-x-auto bg-[#f3f6f7] px-3 py-2 text-center font-mono text-[11px] text-[#0b1f33]"
        >
          {math.join("\n")}
        </pre>,
      );
      continue;
    }

    const para: string[] = [trimmed];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,3}\s+/.test(lines[i].trim()) &&
      !/^\|.+\|$/.test(lines[i].trim()) &&
      !/^!\[[^\]]*]\([^)]+\)$/.test(lines[i].trim()) &&
      lines[i].trim() !== "$$"
    ) {
      para.push(lines[i].trim());
      i += 1;
    }
    nodes.push(
      <p
        key={key++}
        className="text-[14px] leading-[1.7] text-[#0b1f33] [text-indent:1.1em]"
      >
        {para
          .join(" ")
          .replace(/\*\*([^*]+)\*\*/g, "$1")
          .replace(/\*([^*]+)\*/g, "$1")
          .replace(/^>\s?/gm, "")}
      </p>,
    );
  }

  return nodes;
}

function formatAuthors(authors: string[], linkColor: string) {
  if (authors.length === 0) return "Author names";
  return authors.map((a, i) => {
    const isLast = i === authors.length - 1;
    const sep = isLast
      ? ""
      : i === authors.length - 2
        ? " and "
        : ", ";
    return (
      <span key={`${a}-${i}`}>
        {a}
        {isLast ? (
          <span style={{ color: linkColor, fontWeight: 700 }}>*</span>
        ) : null}
        {sep}
      </span>
    );
  });
}

/**
 * HTML preview aligned with the ACS-level Typst publication engine.
 * Colors follow the journal cover/brand palette.
 */
export function NahdaArticleTemplate({
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
  receivedAt,
  acceptedAt,
  body,
  journalSlug,
  coverColor,
  articleUrl,
  journalUrl,
}: Props) {
  const palette = journalArticlePalette(
    coverColor,
    journalSlug || journalShortTitle || "nahda",
  );
  const dateLabel =
    publishedAt ||
    new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const typeLabel =
    (articleType || "Article").replace(/\s+Article$/i, "") || "Article";

  const year = new Date().getFullYear().toString();
  const citeBits = [year, volume || null, pages || null].filter(Boolean);
  const citeLine = `${journalShortTitle || "Journal"} ${citeBits.join(", ")}`;

  const doiHref = doi
    ? doi.startsWith("http")
      ? doi
      : `https://doi.org/${doi}`
    : articleUrl || "#";
  const jUrl =
    journalUrl ||
    (journalSlug ? `/journals/${journalSlug}` : "/journals");
  const readUrl = articleUrl || doiHref;
  const licenseHref = "https://creativecommons.org/licenses/by/4.0/";
  const licenseLabel = license.replace(/\s+/g, "-");

  const journalPathLabel = (() => {
    if (!jUrl || jUrl === "/journals") {
      return journalShortTitle || journalTitle || "Journal";
    }
    if (jUrl.startsWith("/")) {
      return journalShortTitle || journalTitle || "Journal";
    }
    try {
      const u = new URL(jUrl);
      const host = u.hostname.toLowerCase();
      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.endsWith(".local")
      ) {
        return journalShortTitle || journalTitle || "Journal";
      }
      return `${u.host}${u.pathname}`.replace(/\/$/, "");
    } catch {
      return journalShortTitle || journalTitle || "Journal";
    }
  })();

  return (
    <article
      id="nahda-article-template"
      className="nahda-article mx-auto max-w-[820px] bg-white text-[#0b1f33] shadow-sm"
      style={
        {
          fontFamily: "Georgia, 'Times New Roman', serif",
          "--j-primary": palette.primary,
          "--j-link": palette.link,
          "--j-soft-link": palette.softLink,
          "--j-soft": palette.soft,
          "--j-wordmark": palette.wordmark,
          "--j-cite": palette.cite,
          "--j-oa": palette.openAccess,
        } as CSSProperties
      }
    >
      <header className="px-8 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="h-9 w-auto max-w-[100px] object-contain"
              />
            ) : null}
            <p
              className="font-[family-name:var(--font-display)] text-[1.85rem] font-bold italic leading-none sm:text-[2.1rem]"
              style={{ color: "var(--j-wordmark)" }}
            >
              {journalShortTitle || journalTitle || "Journal"}
            </p>
          </div>
          <div className="shrink-0 text-right">
            {openAccess ? (
              <span
                className="inline-block rounded px-2.5 py-1 text-[10px] font-bold text-white"
                style={{ background: "var(--j-oa)" }}
              >
                Open Access
              </span>
            ) : null}
            <p className="mt-1.5 text-[10px] text-[#0b1f33]">
              This article is licensed under{" "}
              <a
                href={licenseHref}
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline-offset-2 hover:underline"
                style={{ color: "var(--j-link)" }}
              >
                {licenseLabel}
              </a>
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <a
            href={jUrl}
            className="text-[11px] font-medium hover:underline"
            style={{ color: "var(--j-link)" }}
          >
            {journalPathLabel}
          </a>
          <span
            className="px-3 py-1.5 text-[11px] font-bold text-white"
            style={{ background: "var(--j-primary)" }}
          >
            {typeLabel.length > 22 ? "Article" : typeLabel}
          </span>
        </div>
        <div
          className="mt-1 h-[2.5px] w-full"
          style={{ background: "var(--j-primary)" }}
        />
      </header>

      <div className="px-8 pb-8 pt-5">
        <h1
          className="text-[1.45rem] font-bold leading-snug tracking-tight text-[#0b1f33] sm:text-[1.65rem]"
          style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
        >
          {title || "Article title"}
        </h1>

        <p className="mt-3.5 text-[13px] leading-relaxed text-[#0b1f33]">
          {formatAuthors(authors, palette.link)}
        </p>

        {affiliations.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-[11px] leading-relaxed text-[#5b6b7c]">
            {affiliations.map((aff, i) => (
              <li key={`${aff}-${i}`}>
                <sup className="mr-1" style={{ color: "var(--j-link)" }}>
                  {i + 1}
                </sup>
                {aff}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-[1.45fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] text-[9px] font-bold text-white"
                style={{ background: "var(--j-cite)" }}
                aria-hidden
              >
                ✓
              </span>
              <p className="text-[12px]" style={{ fontFamily: "Helvetica, Arial, sans-serif" }}>
                <span className="font-bold text-[#0b1f33]">Cite This: </span>
                <a
                  href={doiHref}
                  target="_blank"
                  rel="noreferrer"
                  className="italic hover:underline"
                  style={{ color: "var(--j-link)" }}
                >
                  {citeLine}
                </a>
              </p>
            </div>
            <div
              className="mt-2 h-[2.5px] w-full"
              style={{ background: "var(--j-cite)" }}
            />
          </div>
          <a
            href={readUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-white transition hover:opacity-90"
            style={{
              background: "var(--j-primary)",
              fontFamily: "Helvetica, Arial, sans-serif",
            }}
          >
            <span
              className="flex h-3 w-3 items-center justify-center rounded-full border-[1.5px] border-white text-[7px]"
              aria-hidden
            >
              ◎
            </span>
            Read Online
          </a>
        </div>

        <div
          className="mt-3 border-y py-2.5"
          style={{ borderColor: "var(--j-primary)" }}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            <span
              className="text-[13px] font-bold tracking-[0.06em]"
              style={{
                color: "var(--j-soft-link)",
                fontFamily: "Helvetica, Arial, sans-serif",
              }}
            >
              ACCESS
            </span>
            <span className="text-[#c5ced8]">|</span>
            <a
              href={readUrl.includes("#") ? readUrl : `${readUrl}#metrics`}
              className="text-[#0b1f33] hover:underline"
            >
              Metrics &amp; More
            </a>
            <span className="text-[#c5ced8]">|</span>
            <a
              href={readUrl.includes("#") ? readUrl : `${readUrl}#related`}
              className="text-[#0b1f33] hover:underline"
            >
              Article Recommendations
            </a>
            <span className="ml-auto text-[10px] text-[#5b6b7c]">
              {[journalShortTitle, year, volume, pages].filter(Boolean).join(", ")}
            </span>
          </div>
        </div>

        <p className="mt-3 text-[10px] text-[#5b6b7c]">
          Received {receivedAt || dateLabel}
          {" · "}Accepted {acceptedAt || dateLabel}
          {" · "}Published {dateLabel}
          {" · "}
          <a
            href={doiHref}
            className="hover:underline"
            style={{ color: "var(--j-link)" }}
          >
            DOI: {doi || "Pending"}
          </a>
          {issue ? ` · ${issue}` : ""}
          {" · "}
          <span className="text-[#5b6b7c]">{manuscriptId}</span>
        </p>

        <section className="mt-6">
          <h2
            className="text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{
              color: "var(--j-primary)",
              fontFamily: "Helvetica, Arial, sans-serif",
            }}
          >
            Abstract
          </h2>
          <p className="mt-2 text-[14px] leading-[1.7] text-justify text-[#0b1f33]">
            {abstract || "Abstract will appear here."}
          </p>
        </section>

        {keywords.length > 0 && (
          <section
            className="mt-5 border-l-[2.5px] px-3.5 py-2.5"
            style={{
              background: "var(--j-soft)",
              borderColor: "var(--j-primary)",
            }}
          >
            <span
              className="text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{
                color: "var(--j-primary)",
                fontFamily: "Helvetica, Arial, sans-serif",
              }}
            >
              Keywords
            </span>
            <span className="ml-2 text-[12px] text-[#0b1f33]">
              {keywords.join(" · ")}
            </span>
          </section>
        )}

        {body?.trim() ? (
          <section
            className="mt-7 border-t-[1.5px] pt-5"
            style={{ borderColor: "var(--j-primary)" }}
          >
            <div className="columns-1 gap-x-5 sm:columns-2 [column-fill:_balance]">
              {renderBodyPreview(body)}
            </div>
          </section>
        ) : null}

        <section
          className="mt-8 px-4 py-3 text-[11px] leading-relaxed text-[#5b6b7c]"
          style={{ background: "var(--j-soft)" }}
        >
          <p>
            © {year} Nahda Publications · {journalTitle}. Licensed under{" "}
            <a
              href={licenseHref}
              className="hover:underline"
              style={{ color: "var(--j-link)" }}
            >
              {license}
            </a>
            .
          </p>
        </section>
      </div>
    </article>
  );
}
