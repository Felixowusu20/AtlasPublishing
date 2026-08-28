"use client";

import type { CSSProperties } from "react";
import { AuthorOrcidLine } from "@/components/orcid-id";
import { journalArticlePalette } from "@/lib/journal-colors";
import { ensureManuscriptHtml } from "@/lib/import-manuscript";
import { buildApaCitation } from "@/lib/apa-citation";

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
  funding?: string | null;
  conflictOfInterest?: string | null;
  journalSlug?: string;
  coverColor?: string;
  articleUrl?: string;
  journalUrl?: string;
};

function AbstractHtml({ abstract }: { abstract: string }) {
  const html = ensureManuscriptHtml(abstract);
  if (!html) {
    return <p>Abstract will appear here.</p>;
  }
  return (
    <div
      className="nahda-abstract-html"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function ArticleBodyHtml({ body }: { body?: string }) {
  if (!body?.trim()) return null;
  const html = ensureManuscriptHtml(body);
  if (!html) return null;
  return (
    <div
      className="nahda-article-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Collapse textarea/Word line breaks so the abstract can justify as one block. */
function reflowArticleText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function RunningFooter({
  year,
  doiHref,
  doiLabel,
  journalTitle,
  journalShortTitle,
  citeBits,
}: {
  year: string;
  doiHref: string;
  doiLabel: string;
  journalTitle: string;
  journalShortTitle: string;
  citeBits: string[];
}) {
  return (
    <footer className="nahda-running-footer">
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-nahda.png" alt="Nahda Publications" />
          <p className="text-[10px] leading-snug text-[#5b6b7c]">
            © {year} The Authors. Published by Nahda Publications
          </p>
        </div>
        <div className="flex min-w-0 items-end justify-end gap-3 sm:max-w-[55%]">
          <div className="min-w-0 text-left sm:text-right">
            <a
              href={doiHref}
              target="_blank"
              rel="noreferrer"
              className="break-all text-[11px] font-medium hover:underline"
              style={{ color: "var(--j-link)" }}
            >
              {doiLabel}
            </a>
            <p className="mt-0.5 text-[10px] text-[#0b1f33]">
              <em>{journalShortTitle || journalTitle || "Journal"}</em>
              {citeBits.length > 0 ? ` ${citeBits.join(", ")}` : ` ${year}`}
            </p>
          </div>
          <span className="nahda-print-folio" aria-hidden />
        </div>
      </div>
    </footer>
  );
}

/**
 * Journal-bound article preview. Header, authors, abstract, and keywords
 * come from this journal's template; the body is imported HTML.
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
  funding,
  conflictOfInterest,
  journalSlug,
  coverColor,
  articleUrl,
  journalUrl,
}: Props) {
  const palette = journalArticlePalette(
    coverColor,
    journalSlug || journalShortTitle || "nahda",
  );
  const typeLabel =
    (articleType || "Article").replace(/\s+Article$/i, "") || "Article";

  const yearMatch = publishedAt?.match(/\b(19|20)\d{2}\b/);
  const parsedPublish = publishedAt ? new Date(publishedAt) : null;
  const year = (
    yearMatch?.[0] ||
    (parsedPublish && !Number.isNaN(parsedPublish.getTime())
      ? String(parsedPublish.getFullYear())
      : String(new Date().getFullYear()))
  );
  const citeBits = [year, volume || null, pages || null].filter(
    (b): b is string => Boolean(b),
  );
  const citeLine = `${journalShortTitle || "Journal"} ${citeBits.join(", ")}`;

  const doiHref = doi
    ? `/doi/${doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "")}`
    : "#";
  const doiLabel = doi
    ? doi.startsWith("http")
      ? doi
      : `https://doi.org/${doi}`
    : "DOI pending";
  const jUrl =
    journalUrl ||
    (journalSlug ? `/journals/${journalSlug}` : "/journals");
  const readUrl = articleUrl || "#";
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
      lang="en"
      className="nahda-article mx-auto max-w-[820px] bg-white text-[#0b1f33]"
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
      <table className="nahda-print-frame">
        <tbody>
          <tr>
            <td>
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

      <div className="nahda-article-inner px-8 pb-8 pt-5">
        <div className="nahda-article-front">
        <h1
          className="text-[1.45rem] font-bold leading-snug tracking-tight text-[#0b1f33] sm:text-[1.65rem]"
          style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
        >
          {title || "Article title"}
        </h1>

        <p className="mt-3.5 text-[13.5px] leading-relaxed text-[#0b1f33]">
          <AuthorOrcidLine
            authors={authors}
            correspondingColor={palette.link}
          />
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

        <div className="mt-5 grid gap-4 sm:grid-cols-[1.45fr_1fr] print:block print:gap-2">
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
          Received {receivedAt || "—"}
          {" · "}Accepted {acceptedAt || "—"}
          {" · "}Published {publishedAt || "—"}
          {" · "}
          <a
            href={doiHref}
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
            style={{ color: "var(--j-link)" }}
          >
            DOI: {doi || "Pending"}
          </a>
          {issue ? ` · ${issue}` : ""}
          {" · "}
          <span className="text-[#5b6b7c]">{manuscriptId}</span>
        </p>

        <section className="nahda-article-abstract">
          <h2
            className="text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{
              color: "var(--j-primary)",
              fontFamily: "Helvetica, Arial, sans-serif",
            }}
          >
            Abstract
          </h2>
          <AbstractHtml abstract={abstract} />
        </section>

        {keywords.length > 0 && (
          <section
            className="nahda-keywords"
            style={{ background: "var(--j-soft)" }}
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
              {keywords.join(", ")}
            </span>
          </section>
        )}
        </div>

        <div className="nahda-article-flow">
        {body?.trim() ? <ArticleBodyHtml body={body} /> : null}

        {funding?.trim() || conflictOfInterest?.trim() ? (
          <section className="nahda-end-matter nahda-span-all">
            {funding?.trim() ? (
              <div>
                <h2
                  className="text-[11px] font-bold uppercase tracking-[0.14em]"
                  style={{
                    color: "var(--j-primary)",
                    fontFamily: "Helvetica, Arial, sans-serif",
                  }}
                >
                  Funding
                </h2>
                <p>
                  {reflowArticleText(funding.trim())}
                </p>
              </div>
            ) : null}
            {conflictOfInterest?.trim() ? (
              <div>
                <h2
                  className="text-[11px] font-bold uppercase tracking-[0.14em]"
                  style={{
                    color: "var(--j-primary)",
                    fontFamily: "Helvetica, Arial, sans-serif",
                  }}
                >
                  Conflicts of Interest
                </h2>
                <p>
                  {reflowArticleText(conflictOfInterest.trim())}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}
        <section className="nahda-end-matter nahda-span-all">
          <div>
            <h2
              className="text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{
                color: "var(--j-primary)",
                fontFamily: "Helvetica, Arial, sans-serif",
              }}
            >
              How to Cite
            </h2>
            <p>
              {buildApaCitation({
                authors,
                title,
                journalTitle,
                publishedAt,
                volume,
                issue,
                pages,
                doi,
              }).text}
            </p>
          </div>
        </section>
        </div>
      </div>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>
      <RunningFooter
        year={year}
        doiHref={doiHref}
        doiLabel={doiLabel}
        journalTitle={journalTitle}
        journalShortTitle={journalShortTitle}
        citeBits={citeBits}
      />
            </td>
          </tr>
        </tfoot>
      </table>
    </article>
  );
}
