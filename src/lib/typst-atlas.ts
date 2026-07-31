import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { journalArticlePalette } from "@/lib/journal-colors";

export type AtlasTypstFigure = {
  url: string;
  filename: string;
  caption?: string;
};

export type AtlasTypstInput = {
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
  body?: string;
  figures?: AtlasTypstFigure[];
  /** Publisher / journal logo URL (Cloudinary). Embedded on first page. */
  logoUrl?: string;
  receivedAt?: string;
  acceptedAt?: string;
  publishedAt?: string;
  /** Journal slug for public URLs and color hashing. */
  journalSlug?: string;
  /** Journal cover / brand color (hex). */
  coverColor?: string;
  /** Public article path slug once known. */
  articleSlug?: string;
  /** Site origin, e.g. https://nahdapublications.com */
  siteBaseUrl?: string;
};

/** Escape Typst special characters in plain text. */
export function escapeTypst(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/#/g, "\\#")
    .replace(/\$/g, "\\$")
    .replace(/@/g, "\\@")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/</g, "\\<")
    .replace(/>/g, "\\>")
    .replace(/\*/g, "\\*")
    .replace(/_/g, "\\_")
    .replace(/`/g, "\\`")
    .replace(/~/g, "\\~");
}

function formatDate(value?: string) {
  if (!value) {
    return new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function safeFigureName(filename: string, index: number): string {
  const base = filename
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 80);
  if (base && /\.(png|jpe?g|gif|webp|svg)$/i.test(base)) return base;
  const ext = (filename.split(".").pop() || "png").toLowerCase();
  return `figure-${index + 1}.${ext}`;
}

function urlHashName(url: string, index: number): string {
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 10);
  const extMatch = url.match(/\.(png|jpe?g|gif|webp|svg)(?:\?|$)/i);
  const ext = extMatch?.[1]?.toLowerCase() || "png";
  return `img-${index + 1}-${hash}.${ext === "jpeg" ? "jpg" : ext}`;
}

function normalizeMath(expr: string): string {
  // Typst needs parentheses for superscripts on multi-letter identifiers: (mc)^2
  return expr
    .trim()
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)")
    .replace(/\\times/g, "times")
    .replace(/\\cdot/g, "dot")
    .replace(/\\pm/g, "plus.minus")
    .replace(/\\sum/g, "sum")
    .replace(/\\int/g, "integral")
    .replace(/\\alpha/g, "alpha")
    .replace(/\\beta/g, "beta")
    .replace(/\\gamma/g, "gamma")
    .replace(/\\theta/g, "theta")
    .replace(/\\pi/g, "pi")
    .replace(/\\infty/g, "infinity")
    .replace(/([A-Za-z]{2,})\^(\{[^}]+\}|[A-Za-z0-9]+)/g, "($1)^$2")
    .replace(/\^\{([^}]+)\}/g, "^($1)");
}

function displayMathTypst(expr: string): string {
  return `#align(center)[$ ${normalizeMath(expr)} $]`;
}

function inlineMathTypst(expr: string): string {
  return `$${normalizeMath(expr)}$`;
}

/** Inline markdown → Typst (bold, italic, code, inline math, links). */
function inlineToTypst(text: string): string {
  const slots: string[] = [];
  const hold = (typst: string) => {
    slots.push(typst);
    return `§SLOT${slots.length - 1}§`;
  };

  let s = text;

  // Protect inline math $...$ (pass through as Typst math)
  s = s.replace(/\$([^$\n]+)\$/g, (_, expr: string) =>
    hold(inlineMathTypst(expr)),
  );

  // Code spans
  s = s.replace(/`([^`]+)`/g, (_, code: string) =>
    hold(`#raw(${JSON.stringify(code)})`),
  );

  // Images at inline position (rare)
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, caption: string, url: string) =>
    hold(`[Figure: ${escapeTypst(caption)} — ${escapeTypst(url)}]`),
  );

  // Links [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, url: string) =>
    hold(`#link(${JSON.stringify(url)})[${escapeTypst(label)}]`),
  );

  // Bold then italic
  s = s.replace(/\*\*([^*]+)\*\*/g, (_, t: string) =>
    hold(`*${escapeTypst(t)}*`),
  );
  s = s.replace(/\*([^*]+)\*/g, (_, t: string) => hold(`_${escapeTypst(t)}_`));

  // Strikethrough ~~text~~
  s = s.replace(/~~([^~]+)~~/g, (_, t: string) =>
    hold(`#strike[${escapeTypst(t)}]`),
  );

  // Underline ++text++ or <u>text</u>
  s = s.replace(/\+\+([^+]+)\+\+/g, (_, t: string) =>
    hold(`#underline[${escapeTypst(t)}]`),
  );
  s = s.replace(/<u>([^<]+)<\/u>/gi, (_, t: string) =>
    hold(`#underline[${escapeTypst(t)}]`),
  );

  // Superscript ^text^ and subscript ~text~
  s = s.replace(/\^([^^\s][^^]*)\^/g, (_, t: string) =>
    hold(`#super[${escapeTypst(t)}]`),
  );
  s = s.replace(/~([^~\s][^~]*)~/g, (_, t: string) =>
    hold(`#sub[${escapeTypst(t)}]`),
  );

  // Escape remaining plain text, then restore protected Typst fragments
  s = escapeTypst(s);
  s = s.replace(/§SLOT(\d+)§/g, (_, i: string) => slots[Number(i)] ?? "");

  return s;
}

type FigureMap = Map<string, string>; // url → local path relative to workspace

function parseWidthFlag(raw: string): { text: string; fullWidth: boolean } {
  const fullWidth = /\|\s*full\s*$/i.test(raw);
  const text = raw.replace(/\|\s*(full|col|column)\s*$/i, "").trim();
  return { text, fullWidth };
}

/**
 * Booktabs-style table: top/mid/bottom rules, no vertical lines.
 * Append `|full` to a preceding **Table.** caption to span both columns.
 */
function convertPipeTable(
  lines: string[],
  start: number,
  fullWidth = false,
): { typst: string; nextIndex: number } | null {
  const headerLine = lines[start];
  if (!/^\|.+\|$/.test(headerLine.trim())) return null;
  const sep = lines[start + 1]?.trim() ?? "";
  if (!/^\|[\s:|-]+\|$/.test(sep)) return null;

  const parseRow = (line: string) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());

  const headers = parseRow(headerLine);
  const rows: string[][] = [];
  let i = start + 2;
  while (i < lines.length && /^\|.+\|$/.test(lines[i].trim())) {
    rows.push(parseRow(lines[i]));
    i += 1;
  }

  const cols = headers.length;
  const headerCells = headers.map((h) => `[*${escapeTypst(h)}*]`);
  const bodyCells = rows.flatMap((row) =>
    Array.from({ length: cols }, (_, c) => `[${inlineToTypst(row[c] ?? "")}]`),
  );

  const tableInner = [
    `table(`,
    `  columns: ${cols},`,
    `  inset: (x: 5pt, y: 4.5pt),`,
    `  align: left,`,
    `  stroke: none,`,
    `  table.hline(stroke: 0.75pt + rgb("#0b1f33")),`,
    `  ${headerCells.join(", ")},`,
    `  table.hline(stroke: 0.45pt + rgb("#5b6b7c")),`,
    `  ${bodyCells.join(",\n  ")},`,
    `  table.hline(stroke: 0.75pt + rgb("#0b1f33")),`,
    `)`,
  ].join("\n");

  const fig = [
    `#figure(`,
    `  ${tableInner},`,
    `  kind: table,`,
    `  caption: [Table],`,
    `)`,
  ].join("\n");

  const typst = fullWidth
    ? [
        `#place(`,
        `  auto,`,
        `  float: true,`,
        `  scope: "parent",`,
        `  clearance: 1.1em,`,
        `  [${fig}],`,
        `)`,
      ].join("\n")
    : fig;

  return { typst, nextIndex: i };
}

/** Column-width figure (default) or parent-scoped full-width across both columns. */
function figureTypst(
  localPath: string,
  caption: string,
  fullWidth = false,
): string {
  const cleanCaption = caption.replace(/\|\s*(full|col|column)\s*$/i, "").trim();
  const fig = [
    `#figure(`,
    `  image(${JSON.stringify(localPath)}, width: 100%),`,
    `  caption: [${escapeTypst(cleanCaption || "Figure")}],`,
    `)`,
  ].join("\n");

  if (!fullWidth) return fig;

  return [
    `#place(`,
    `  auto,`,
    `  float: true,`,
    `  scope: "parent",`,
    `  clearance: 1.1em,`,
    `  [${fig}],`,
    `)`,
  ].join("\n");
}

function isReferencesHeading(title: string): boolean {
  return /^(references|bibliography|literature cited)$/i.test(title.trim());
}

/**
 * Convert Markdown-ish manuscript body into Typst markup.
 * `figureMap` maps remote image URLs to workspace-relative paths.
 */
export function bodyToTypst(body?: string, figureMap: FigureMap = new Map()): string {
  const raw = (body ?? "").trim();
  if (!raw) {
    return [
      "= Introduction",
      "",
      "Full manuscript text will appear in this section. Editors can paste structured content below before generating the PDF.",
      "",
      "= Methods",
      "",
      "_Add methods content here._",
      "",
      "= Results",
      "",
      "_Add results content here._",
      "",
      "= Discussion",
      "",
      "_Add discussion content here._",
      "",
      "= Conclusion",
      "",
      "_Add conclusion content here._",
      "",
      "#heading(level: 1, numbering: none)[References]",
      "",
      "#par(hanging-indent: 1.35em, first-line-indent: 0pt)[_References will be listed here._]",
    ].join("\n");
  }

  const lines = raw.split("\n");
  const out: string[] = [];
  let i = 0;
  let inList: "ul" | "ol" | null = null;
  let inReferences = false;

  const closeList = () => {
    inList = null;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Fenced typst passthrough
    if (trimmed.startsWith("```typst")) {
      closeList();
      i += 1;
      const block: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        block.push(lines[i]);
        i += 1;
      }
      i += 1; // closing fence
      out.push(block.join("\n"));
      out.push("");
      continue;
    }

    // Display math $$
    if (trimmed === "$$") {
      closeList();
      i += 1;
      const math: string[] = [];
      while (i < lines.length && lines[i].trim() !== "$$") {
        math.push(lines[i]);
        i += 1;
      }
      i += 1;
      out.push(displayMathTypst(math.join(" ")));
      out.push("");
      continue;
    }

    if (trimmed === ":::pagebreak") {
      closeList();
      out.push("#pagebreak()");
      out.push("");
      i += 1;
      continue;
    }

    if (trimmed === "---" || trimmed === "***") {
      closeList();
      out.push("#line(length: 100%, stroke: 0.4pt + rgb(\"#c5ced8\"))");
      out.push("");
      i += 1;
      continue;
    }

    // Pipe table
    if (/^\|.+\|$/.test(trimmed) && i + 1 < lines.length) {
      // Optional caption from previous **Table.** line (may include |full)
      let caption = "Table";
      let tableFull = false;
      if (out.length > 0) {
        const prev = out[out.length - 1];
        const m = prev.match(
          /^\*?Table(?:\s*\d+)?\.?\*?\s*(.*)$/i,
        );
        if (m) {
          const parsed = parseWidthFlag(m[1].replace(/^\*\*|\*\*$/g, "").trim());
          caption = parsed.text || "Table";
          tableFull = parsed.fullWidth;
          out.pop();
          if (out[out.length - 1] === "") out.pop();
        }
      }

      const table = convertPipeTable(lines, i, tableFull);
      if (table) {
        closeList();
        out.push(
          table.typst.replace(
            "caption: [Table]",
            `caption: [${escapeTypst(caption)}]`,
          ),
        );
        out.push("");
        i = table.nextIndex;
        continue;
      }
    }

    // Image alone on a line (|full = span both columns; default = one column)
    const img = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (img) {
      closeList();
      const { text: caption, fullWidth } = parseWidthFlag(img[1]);
      const url = img[2];
      const local = figureMap.get(url);
      if (local) {
        out.push(figureTypst(local, caption, fullWidth));
      } else {
        out.push(
          `_Figure unavailable (upload required): ${escapeTypst(caption)}_`,
        );
      }
      out.push("");
      i += 1;
      continue;
    }

    // Headings
    const h3 = trimmed.match(/^###\s+(.+)$/);
    if (h3) {
      closeList();
      out.push(`=== ${escapeTypst(h3[1])}`);
      out.push("");
      i += 1;
      continue;
    }
    const h2 = trimmed.match(/^##\s+(.+)$/);
    if (h2) {
      closeList();
      if (isReferencesHeading(h2[1])) {
        inReferences = true;
        out.push(`#heading(level: 1, numbering: none)[${escapeTypst(h2[1])}]`);
      } else {
        inReferences = false;
        out.push(`== ${escapeTypst(h2[1])}`);
      }
      out.push("");
      i += 1;
      continue;
    }
    const h1 = trimmed.match(/^#\s+(.+)$/);
    if (h1) {
      closeList();
      if (isReferencesHeading(h1[1])) {
        inReferences = true;
        out.push(`#heading(level: 1, numbering: none)[${escapeTypst(h1[1])}]`);
      } else {
        inReferences = false;
        out.push(`= ${escapeTypst(h1[1])}`);
      }
      out.push("");
      i += 1;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      closeList();
      out.push(`#quote[${inlineToTypst(trimmed.slice(2))}]`);
      out.push("");
      i += 1;
      continue;
    }

    // Lists
    const ul = trimmed.match(/^[-*]\s+(.+)$/);
    if (ul) {
      if (inReferences) {
        closeList();
        out.push(
          `#par(hanging-indent: 1.35em, first-line-indent: 0pt)[${inlineToTypst(ul[1])}]`,
        );
        i += 1;
        continue;
      }
      if (inList !== "ul") {
        closeList();
        inList = "ul";
      }
      out.push(`- ${inlineToTypst(ul[1])}`);
      i += 1;
      continue;
    }
    const ol = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ol) {
      if (inReferences) {
        closeList();
        out.push(
          `#par(hanging-indent: 1.35em, first-line-indent: 0pt)[${ol[0].match(/^\d+/)?.[0] ?? ""}. ${inlineToTypst(ol[1])}]`,
        );
        i += 1;
        continue;
      }
      if (inList !== "ol") {
        closeList();
        inList = "ol";
      }
      out.push(`+ ${inlineToTypst(ol[1])}`);
      i += 1;
      continue;
    }

    if (!trimmed) {
      closeList();
      out.push("");
      i += 1;
      continue;
    }

    closeList();
    if (inReferences) {
      out.push(
        `#par(hanging-indent: 1.35em, first-line-indent: 0pt)[${inlineToTypst(line)}]`,
      );
    } else {
      out.push(inlineToTypst(line));
    }
    i += 1;
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

/** ACS-style author line: "A and B*" with link-colored corresponding asterisk. */
function formatAuthorsAcsTypst(authors: string[], linkColor: string): string {
  if (authors.length === 0) {
    return "#text(font: serif, size: 10.5pt, fill: ink)[Author]";
  }
  // Strip trailing * from names — we add the corresponding-author mark ourselves
  const cleaned = authors.map((name) => name.replace(/\*+\s*$/g, "").trim()).filter(Boolean);
  const names = (cleaned.length ? cleaned : ["Author"]).map((name) =>
    escapeTypst(name),
  );
  let line: string;
  if (names.length === 1) line = names[0];
  else if (names.length === 2) line = `${names[0]} and ${names[1]}`;
  else line = `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
  // Asterisk must sit outside the author text bracket (Typst treats * as emphasis).
  return `#text(font: serif, size: 10.5pt, fill: ink)[${line}]#text(fill: rgb("${linkColor}"), weight: "bold")[\\*]`;
}

function formatAffiliationsTypst(affiliations: string[]): string {
  if (affiliations.length === 0) return "";
  return affiliations
    .map((a, i) => `#super[${i + 1}]${escapeTypst(a)}`)
    .join(" \\\n");
}

function siteOrigin(input: AtlasTypstInput): string {
  const raw = (input.siteBaseUrl || process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (raw) return raw.replace(/\/$/, "");
  // Prefer env in production; avoid baking localhost into PDFs.
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }
  return "";
}

/** Public site origin for printed URLs — never emit localhost on the PDF. */
function publicSiteOrigin(input: AtlasTypstInput): string | null {
  const origin = siteOrigin(input);
  try {
    const host = new URL(origin).hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".local") ||
      host === "0.0.0.0"
    ) {
      return null;
    }
  } catch {
    return null;
  }
  return origin;
}

function displayHostPath(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

/**
 * Build a complete Typst document from Nahda article metadata.
 * ACS Biochemistry–level first page: journal wordmark, OA badge, type bar,
 * Cite This / Read Online hyperlinks, ACCESS strip — colored by journal brand.
 * Typst is the sole publication engine (no LaTeX).
 */
export function buildAtlasTypstSource(
  input: AtlasTypstInput,
  figureMap: FigureMap = new Map(),
  logoPath?: string | null,
): string {
  const palette = journalArticlePalette(
    input.coverColor,
    input.journalSlug || input.journalShortTitle || "nahda",
  );
  const publicOrigin = publicSiteOrigin(input);
  const journalSlug =
    (input.journalSlug || input.journalShortTitle || "journal")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-|-$/g, "") || "journal";
  const journalUrl = publicOrigin
    ? `${publicOrigin}/journals/${journalSlug}`
    : null;
  const journalUrlHref = journalUrl ? JSON.stringify(journalUrl) : null;
  const journalUrlLabel = journalUrl
    ? escapeTypst(displayHostPath(journalUrl))
    : "";

  const doiRaw = (input.doi || "").trim();
  const doiAbsolute = !doiRaw
    ? null
    : doiRaw.startsWith("http")
      ? doiRaw
      : `https://doi.org/${doiRaw}`;

  const articleUrl = input.articleSlug
    ? publicOrigin
      ? `${publicOrigin}/articles/${input.articleSlug}`
      : doiAbsolute
    : doiAbsolute || journalUrl;
  const articleHref = articleUrl ? JSON.stringify(articleUrl) : null;

  const authorsLine = formatAuthorsAcsTypst(input.authors, palette.link);
  const affiliations = formatAffiliationsTypst(input.affiliations);
  const keywords = input.keywords.map(escapeTypst).join(" · ") || "—";
  const year = new Date().getFullYear().toString();
  const typeLabel = escapeTypst(
    (input.articleType || "Article").replace(/\s+Article$/i, "").slice(0, 22) ||
      "Article",
  );
  const isOpenAccess = input.openAccess !== false;
  const licenseRaw = (input.license || "CC BY 4.0").trim();
  const licenseLabel = escapeTypst(licenseRaw.replace(/\s+/g, "-"));
  const licenseHref = JSON.stringify(
    "https://creativecommons.org/licenses/by/4.0/",
  );

  const doiHref = JSON.stringify(
    doiAbsolute || articleUrl || "https://doi.org/",
  );
  const doiText = escapeTypst(doiRaw || "Pending");

  const citeJournal = escapeTypst(input.journalShortTitle || input.journalTitle);
  const citeParts = [
    year,
    input.volume ? escapeTypst(input.volume) : null,
    input.pages ? escapeTypst(input.pages) : null,
  ].filter(Boolean);
  const citeMeta =
    citeParts.length > 0
      ? citeParts.join(", ").replace(/^(\d{4}), /, "$1, ")
      : year;
  // ACS: *Biochemistry* 2026, 65, 2191–2201 — avoid _italic_ if name has underscores
  const citeDisplay = `#emph[${citeJournal}] ${citeMeta}`;

  const manuscriptLink = articleHref
    ? `#link(${articleHref})[${escapeTypst(input.manuscriptId)}]`
    : `[${escapeTypst(input.manuscriptId)}]`;
  const journalMastheadLink = journalUrlHref
    ? `#text(font: sans, size: 8pt, fill: link-blue)[#link(${journalUrlHref})[${journalUrlLabel}]]`
    : `#text(font: sans, size: 8pt, fill: link-blue)[${escapeTypst(input.journalShortTitle || input.journalTitle)}]`;
  const footerRight = journalUrlHref
    ? `#link(${journalUrlHref})[${journalUrlLabel}]`
    : `[${escapeTypst(input.manuscriptId)}]`;
  const readOnline = articleHref
    ? `#link(${articleHref})[#text(fill: white)[Read Online]]`
    : `#link(${doiHref})[#text(fill: white)[Read Online]]`;
  const metricsLink = articleHref
    ? `#link(${articleHref})[#text(fill: ink)[Metrics & More]]`
    : `[#text(fill: ink)[Metrics & More]]`;
  const recommendLink = articleHref
    ? `#link(${articleHref})[#text(fill: ink)[Article Recommendations]]`
    : `[#text(fill: ink)[Article Recommendations]]`;

  const wordmark = escapeTypst(input.journalShortTitle || input.journalTitle);
  const pubDate = escapeTypst(formatDate(input.publishedAt));

  const logoBlock = logoPath
    ? `#image("${logoPath}", height: 0.95cm)`
    : null;

  const abstractText = escapeTypst(
    input.abstract || "Abstract will appear here.",
  );

  const body = bodyToTypst(input.body, figureMap);

  return `
// Nahda Publications — ACS-level Typst journal article
// Primary publication engine: Typst (not LaTeX)
// Brand colors from journal coverColor

#let primary = rgb("${palette.primary}")
#let link-blue = rgb("${palette.link}")
#let soft-link = rgb("${palette.softLink}")
#let soft = rgb("${palette.soft}")
#let wordmark-fill = rgb("${palette.wordmark}")
#let cite-orange = rgb("${palette.cite}")
#let oa-gold = rgb("${palette.openAccess}")
#let ink = rgb("${palette.ink}")
#let muted = rgb("${palette.muted}")
#let rule = rgb("${palette.rule}")
#let serif = ("Libertinus Serif", "New Computer Modern", "Georgia", "Times New Roman")
#let sans = ("Libertinus Sans", "TeX Gyre Heros", "Helvetica", "Arial")

#set page(
  paper: "a4",
  margin: (left: 1.7cm, right: 1.7cm, top: 1.55cm, bottom: 1.65cm),
  header: context {
    let n = counter(page).get().first()
    if n > 1 {
      set text(font: sans, size: 7.5pt, fill: muted)
      grid(
        columns: (1fr, auto),
        gutter: 8pt,
        align(left + horizon)[
          #text(weight: "semibold", fill: primary)[${escapeTypst(input.journalShortTitle)}]
          #h(0.35em)·#h(0.35em)
          ${manuscriptLink}
        ],
        align(right + horizon)[
          #link(${doiHref})[DOI]
        ],
      )
      v(3pt)
      line(length: 100%, stroke: 0.7pt + primary)
    }
  },
  footer: context {
    set text(font: sans, size: 7.5pt, fill: muted)
    line(length: 100%, stroke: 0.35pt + rule)
    v(5pt)
    grid(
      columns: (1fr, auto, 1fr),
      align(left + horizon)[
        #link(${licenseHref})[${escapeTypst(licenseRaw)}]
      ],
      align(center + horizon)[
        #text(fill: primary, weight: "semibold")[#counter(page).display()]
      ],
      align(right + horizon)[${footerRight}],
    )
  },
)

#set text(font: serif, size: 10.5pt, fill: ink)
#set par(justify: true, leading: 0.78em, spacing: 0.62em)
#set heading(numbering: "1.1")
#set list(indent: 0.9em, marker: ([•], [–], [·]))
#set enum(indent: 0.9em)
#show link: set text(fill: link-blue)
#show figure: set block(breakable: false, spacing: 1.1em)
#show figure.caption: it => {
  set text(font: sans, size: 9pt, fill: muted)
  set align(left)
  block(inset: (top: 3pt), it)
}
#show quote: set block(
  stroke: (left: 2pt + primary),
  inset: (left: 10pt, y: 4pt),
  fill: soft,
)

#show heading.where(level: 1): it => {
  set text(font: sans, size: 11pt, weight: "bold", fill: primary, tracking: 0.02em)
  set par(first-line-indent: 0pt, spacing: 0pt)
  block(breakable: false, above: 1.35em, below: 0.6em)[
    #if it.numbering != none [
      #counter(heading).display(it.numbering)#text[.]#h(0.4em)
    ]
    #upper(it.body)
  ]
}

#show heading.where(level: 2): it => {
  set text(font: sans, size: 10.25pt, weight: "bold", fill: ink)
  set par(first-line-indent: 0pt, spacing: 0pt)
  block(breakable: false, above: 1.1em, below: 0.45em)[
    #if it.numbering != none [
      #counter(heading).display(it.numbering)#h(0.35em)
    ]
    #it.body
  ]
}

#show heading.where(level: 3): it => {
  set text(font: sans, size: 10pt, weight: "semibold", fill: muted, style: "italic")
  set par(first-line-indent: 0pt, spacing: 0pt)
  block(breakable: false, above: 0.95em, below: 0.35em)[
    #if it.numbering != none [
      #counter(heading).display(it.numbering)#h(0.3em)
    ]
    #it.body
  ]
}

// —— ACS-style first page ——
#grid(
  columns: (1fr, auto),
  gutter: 12pt,
  align(left + horizon)[
    ${
      logoBlock
        ? `#box(baseline: 40%)[${logoBlock}]#h(8pt)`
        : ""
    }
    #text(
      font: serif,
      size: 26pt,
      weight: "bold",
      style: "italic",
      fill: wordmark-fill,
    )[${wordmark}]
  ],
  align(right + top)[
    ${
      isOpenAccess
        ? `#box(fill: oa-gold, radius: 3pt, inset: (x: 9pt, y: 4pt))[
      #text(font: sans, size: 8pt, weight: "bold", fill: white)[Open Access]
    ]
    #v(5pt)`
        : ""
    }
    #text(font: sans, size: 7pt, fill: ink)[
      This article is licensed under #link(${licenseHref})[${licenseLabel}]
    ]
  ],
)

#v(10pt)
#grid(
  columns: (1fr, auto),
  gutter: 8pt,
  align(bottom + left)[
    ${journalMastheadLink}
  ],
  align(bottom + right)[
    #box(fill: primary, inset: (x: 11pt, y: 5pt))[
      #text(font: sans, size: 9pt, weight: "bold", fill: white)[${typeLabel}]
    ]
  ],
)
#v(2pt)
#line(length: 100%, stroke: 1.6pt + primary)

#v(14pt)
#text(font: sans, size: 17.5pt, weight: "bold", fill: ink, tracking: -0.015em)[${escapeTypst(input.title)}]

#v(10pt)
${authorsLine}

${
  affiliations
    ? `#v(5pt)
#text(size: 8pt, fill: muted)[
  ${affiliations}
]`
    : ""
}

#v(14pt)
#grid(
  columns: (1.45fr, 1fr),
  gutter: 14pt,
  [
    #grid(
      columns: (auto, 1fr),
      column-gutter: 7pt,
      align(horizon)[
        #box(
          width: 13pt,
          height: 13pt,
          fill: cite-orange,
          radius: 1.5pt,
          align(center + horizon)[
            #text(font: sans, size: 8pt, weight: "bold", fill: white)[✓]
          ],
        )
      ],
      align(horizon)[
        #set text(font: sans, size: 9pt)
        #text(weight: "bold", fill: ink)[Cite This:]
        #h(0.3em)
        #link(${doiHref})[${citeDisplay}]
      ],
    )
    #v(5pt)
    #box(width: 100%, height: 2.4pt, fill: cite-orange)
  ],
  [
    #box(
      width: 100%,
      fill: primary,
      inset: (x: 10pt, y: 7pt),
    )[
      #set text(font: sans, size: 9.5pt, weight: "bold", fill: white)
      #grid(
        columns: (auto, 1fr),
        column-gutter: 7pt,
        align(horizon)[
          #box(
            width: 12pt,
            height: 12pt,
            stroke: 1.2pt + white,
            radius: 50%,
            align(center + horizon)[
              #text(size: 6.5pt, fill: white)[◎]
            ],
          )
        ],
        align(horizon)[${readOnline}],
      )
    ]
  ],
)

#v(8pt)
#line(length: 100%, stroke: 0.45pt + primary)

#v(6pt)
#set text(font: sans, size: 8pt)
#grid(
  columns: (auto, 1fr, auto),
  column-gutter: 12pt,
  align(horizon)[
    #text(size: 11pt, weight: "bold", fill: soft-link, tracking: 0.08em)[ACCESS]
    #h(10pt)
    #text(fill: rule)[|]
    #h(10pt)
    ${metricsLink}
    #h(10pt)
    #text(fill: rule)[|]
    #h(10pt)
    ${recommendLink}
  ],
  [],
  align(right + horizon)[
    #text(size: 7pt, fill: muted)[${volIssueLine(input, year)}]
  ],
)

#v(4pt)
#line(length: 100%, stroke: 0.35pt + rule)

#v(8pt)
#text(font: sans, size: 7.25pt, fill: muted)[
  Received ${escapeTypst(formatDate(input.receivedAt))}
  · Accepted ${escapeTypst(formatDate(input.acceptedAt))}
  · Published ${pubDate}
  · #link(${doiHref})[DOI: ${doiText}]
]

#v(12pt)
#block(width: 100%)[
  #text(font: sans, size: 8pt, weight: "bold", fill: primary, tracking: 0.12em)[ABSTRACT]
  #v(5pt)
  #set text(font: serif, size: 10.25pt, fill: ink)
  #par(
    justify: true,
    leading: 0.78em,
    first-line-indent: 0pt,
    spacing: 0.62em,
  )[
    ${abstractText}
  ]
]

#v(9pt)
#block(
  width: 100%,
  inset: (left: 9pt, rest: 7pt),
  stroke: (left: 2.2pt + primary),
  fill: soft,
)[
  #text(font: sans, size: 7.5pt, weight: "bold", fill: primary, tracking: 0.1em)[KEYWORDS]
  #h(0.55em)
  #text(font: sans, size: 9pt, fill: ink)[${keywords}]
]

#v(13pt)
#line(length: 100%, stroke: 0.7pt + primary)
#v(10pt)

#set text(font: serif, size: 10.5pt, fill: ink)
#set par(justify: true, leading: 0.78em, first-line-indent: 1.1em, spacing: 0.62em)
#show heading: set par(first-line-indent: 0pt)

#columns(2, gutter: 0.55cm)[
${body}
]
`.trim();
}

function volIssueLine(input: AtlasTypstInput, year: string): string {
  const bits = [
    escapeTypst(input.journalShortTitle || ""),
    year,
    input.volume ? escapeTypst(input.volume) : null,
    input.pages ? escapeTypst(input.pages) : null,
  ].filter(Boolean);
  return bits.join(", ");
}

async function downloadBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Could not download figure (${res.status}): ${url}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

function collectBodyImageUrls(body?: string): string[] {
  if (!body) return [];
  const urls: string[] = [];
  const re = /!\[[^\]]*]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    urls.push(m[1]);
  }
  return [...new Set(urls)];
}

/**
 * Compile Typst source to a PDF buffer using the native Node compiler.
 * Figures are downloaded into a temp workspace so Typst can embed them.
 */
export async function compileAtlasTypstPdf(
  input: AtlasTypstInput,
): Promise<Buffer> {
  const { NodeCompiler } = await import(
    "@myriaddreamin/typst-ts-node-compiler"
  );

  const workspace = await mkdtemp(join(tmpdir(), "atlas-typst-"));
  const figuresDir = join(workspace, "figures");
  await mkdir(figuresDir, { recursive: true });

  const figureMap: FigureMap = new Map();
  let logoPath: string | null = null;

  try {
    const declared = input.figures ?? [];
    const bodyUrls = collectBodyImageUrls(input.body);

    // Prefer declared figures (stable filenames), then any leftover body URLs
    let index = 0;
    for (const fig of declared) {
      const name = safeFigureName(fig.filename, index);
      const bytes = await downloadBytes(fig.url);
      await writeFile(join(figuresDir, name), bytes);
      figureMap.set(fig.url, `figures/${name}`);
      index += 1;
    }

    for (const url of bodyUrls) {
      if (figureMap.has(url)) continue;
      const name = urlHashName(url, index);
      try {
        const bytes = await downloadBytes(url);
        await writeFile(join(figuresDir, name), bytes);
        figureMap.set(url, `figures/${name}`);
        index += 1;
      } catch (err) {
        console.warn("[typst] skip figure", url, err);
      }
    }

    if (input.logoUrl) {
      try {
        const name = urlHashName(input.logoUrl, 9000).replace(/^img-/, "logo-");
        const bytes = await downloadBytes(input.logoUrl);
        await writeFile(join(figuresDir, name), bytes);
        logoPath = `figures/${name}`;
      } catch (err) {
        console.warn("[typst] skip logo", input.logoUrl, err);
      }
    }

    const source = buildAtlasTypstSource(input, figureMap, logoPath);
    const mainPath = join(workspace, "main.typ");
    await writeFile(mainPath, source, "utf8");

    const compiler = NodeCompiler.create({ workspace });
    const compiled = compiler.compile({ mainFilePath: mainPath });

    if (!compiled.result) {
      let detail = "";
      try {
        const error = compiled.takeError() ?? compiled.takeDiagnostics();
        const diagnostics = error ? compiler.fetchDiagnostics(error) : [];
        if (diagnostics.length) detail = JSON.stringify(diagnostics);
      } catch {
        detail = "";
      }
      console.error("[typst] compile failed", detail || "(no diagnostics)");
      throw new Error(
        detail
          ? `Typst could not compile the Nahda article PDF: ${detail.slice(0, 500)}`
          : "Typst could not compile the Nahda article PDF",
      );
    }

    const pdf = compiler.pdf(compiled.result);
    if (!pdf || !(pdf instanceof Uint8Array || Buffer.isBuffer(pdf))) {
      throw new Error("Typst PDF export returned an empty buffer");
    }
    return Buffer.from(pdf);
  } finally {
    await rm(workspace, { recursive: true, force: true }).catch(() => undefined);
  }
}
