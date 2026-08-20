export type ImportedFigure = {
  id: string;
  url: string;
  filename: string;
  caption: string;
};

const BODY_HEADING =
  /^(?:(?:\d+|[IVXLC]+)[.)]?\s*)?(introduction|background|literature review|related work|methods?|materials and methods|methodology|results?|findings|discussion|challenges?|limitations?|implications?|recommendations?|future work|outlook|conclusion|acknowledg(?:e)?ments?|references|bibliography)\.?\s*$/i;

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "div",
  "span",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "mark",
  "code",
  "h1",
  "h2",
  "h3",
  "h4",
  "section",
  "blockquote",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
  "caption",
  "a",
  "img",
  "figure",
  "figcaption",
  "sup",
  "sub",
  "hr",
  "colgroup",
  "col",
]);

const ALLOWED_STYLES = new Set([
  "color",
  "background-color",
  "background",
  "font-weight",
  "font-style",
  "font-size",
  "font-family",
  "text-align",
  "text-decoration",
  "text-decoration-line",
  "text-indent",
  "vertical-align",
]);

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function escapeAttr(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(value: string) {
  return escapeAttr(value).replace(/'/g, "&#39;");
}

export function htmlToPlainText(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

function sanitizeStyle(raw: string): string {
  return raw
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.indexOf(":");
      if (idx < 1) return "";
      const prop = part.slice(0, idx).trim().toLowerCase();
      const val = part.slice(idx + 1).trim();
      if (!ALLOWED_STYLES.has(prop)) return "";
      if (/expression|javascript:|url\s*\(/i.test(val)) return "";
      return `${prop}: ${val}`;
    })
    .filter(Boolean)
    .join("; ");
}

function sanitizeAttrs(tag: string, raw: string): string {
  const out: string[] = [];
  const re = /([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    const key = match[1].toLowerCase();
    const val = match[3] ?? match[4] ?? match[5] ?? "";
    if (key.startsWith("on") || key === "srcdoc" || key.startsWith("xmlns")) {
      continue;
    }
    if (key === "href" && tag === "a") {
      if (/^(https?:|mailto:|#)/i.test(val)) {
        out.push(`href="${escapeAttr(val)}"`);
      }
      continue;
    }
    if (key === "src" && tag === "img") {
      if (/^(https?:|\/)/i.test(val) && !/^javascript:/i.test(val)) {
        out.push(`src="${escapeAttr(val)}"`);
      }
      continue;
    }
    if (key === "style") {
      const style = sanitizeStyle(val);
      if (style) out.push(`style="${escapeAttr(style)}"`);
      continue;
    }
    if (
      ["alt", "title", "colspan", "rowspan", "width", "height", "class"].includes(
        key,
      )
    ) {
      out.push(`${key}="${escapeAttr(val)}"`);
    }
    if (key === "data-custom-color") {
      out.push(`data-custom-color="${escapeAttr(val || "true")}"`);
    }
  }
  if (tag === "a") {
    out.push('target="_blank"', 'rel="noopener noreferrer"');
  }
  return out.length ? ` ${out.join(" ")}` : "";
}

/** Keep journal-safe HTML: headings, lists, tables, images, bold, colors. */
export function sanitizeManuscriptHtml(html: string): string {
  let s = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(
      /<(script|style|iframe|object|embed|link|meta|form|textarea|button|svg)[\s\S]*?<\/\1>/gi,
      "",
    )
    .replace(
      /<(script|style|iframe|object|embed|link|meta|form|input|button)[^>]*>/gi,
      "",
    );

  s = s.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (full, tag: string, attrs: string) => {
    const name = tag.toLowerCase();
    const closing = full.startsWith("</");
    if (!ALLOWED_TAGS.has(name)) return "";
    if (closing) return `</${name}>`;
    if (name === "br" || name === "hr" || name === "img" || name === "col") {
      return `<${name}${sanitizeAttrs(name, attrs)}>`;
    }
    return `<${name}${sanitizeAttrs(name, attrs)}>`;
  });

  s = s.replace(/<div class="nahda-table-wrap">([\s\S]*?)<\/div>/gi, "$1");
  s = s.replace(
    /<table\b[\s\S]*?<\/table>/gi,
    (table) => `<div class="nahda-table-wrap">${table}</div>`,
  );
  s = bindTableCaptions(s);

  return s.replace(/\n{3,}/g, "\n\n").trim();
}

function isTableCaptionText(html: string): boolean {
  return /^table(?:\s+\d+)?(?:[.:]|\s|$)/i.test(htmlToPlainText(html));
}

/** Keep table + caption together at full article width, caption above the grid. */
function bindTableCaptions(html: string): string {
  let s = html.replace(
    /<figure\b([^>]*)>([\s\S]*?)<\/figure>/gi,
    (full, attrs: string, inner: string) => {
      if (!/<table\b/i.test(inner) && !/nahda-table-wrap/i.test(inner)) {
        return full;
      }
      const caption = inner.match(/<figcaption\b[^>]*>[\s\S]*?<\/figcaption>/i)?.[0] ?? "";
      const rest = caption ? inner.replace(caption, "") : inner;
      const ordered = `${caption}${rest}`;
      if (/\btable-full\b/.test(`${attrs} ${inner}`)) {
        return `<figure${attrs}>${ordered}</figure>`;
      }
      if (/\bclass\s*=/i.test(attrs)) {
        const next = attrs.replace(
          /class=(["'])([^"']*)\1/i,
          (_m, q: string, cls: string) => `class=${q}${cls} table-full${q}`,
        );
        return `<figure${next}>${ordered}</figure>`;
      }
      return `<figure class="table-full"${attrs}>${ordered}</figure>`;
    },
  );

  s = s.replace(
    /(<p\b[^>]*>[\s\S]*?<\/p>)\s*(<div class="nahda-table-wrap">[\s\S]*?<\/div>)/gi,
    (full, paragraph: string, wrap: string) => {
      if (!isTableCaptionText(paragraph)) return full;
      const inner = paragraph
        .replace(/^<p\b[^>]*>/i, "")
        .replace(/<\/p>\s*$/i, "");
      return `<figure class="table-full"><figcaption>${inner}</figcaption>${wrap}</figure>`;
    },
  );

  s = s.replace(
    /(<div class="nahda-table-wrap">[\s\S]*?<\/div>)\s*(<p\b[^>]*>[\s\S]*?<\/p>)/gi,
    (full, wrap: string, paragraph: string) => {
      if (!isTableCaptionText(paragraph)) return full;
      const inner = paragraph
        .replace(/^<p\b[^>]*>/i, "")
        .replace(/<\/p>\s*$/i, "");
      return `<figure class="table-full"><figcaption>${inner}</figcaption>${wrap}</figure>`;
    },
  );

  s = s.replace(
    /<figure class="table-full"><figcaption>([\s\S]*?)<\/figcaption><\/figure>\s*(<div class="nahda-table-wrap">[\s\S]*?<\/div>|<table\b[\s\S]*?<\/table>)/gi,
    (_full, cap: string, table: string) =>
      `<figure class="table-full"><figcaption>${cap}</figcaption>${table}</figure>`,
  );

  return s;
}

function sectionHeadingLevel(text: string): "h1" | "h2" | "h3" | null {
  if (!text || text.length > 90 || text.split(/\s+/).length > 15) return null;
  if (BODY_HEADING.test(text)) return "h1";
  const numbered = text.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?\.?\s+\S/);
  if (!numbered) return null;
  if (numbered[3]) return "h3";
  if (numbered[2]) return "h2";
  return "h1";
}

function promoteSectionHeadings(html: string): string {
  return html.replace(
    /<(p|h[1-4])\b([^>]*)>([\s\S]*?)<\/\1>/gi,
    (full, tag: string, attrs: string, inner: string) => {
      const level = sectionHeadingLevel(htmlToPlainText(inner));
      if (!level) return full;
      if (tag.toLowerCase() === level) return full;
      return `<${level}${attrs}>${inner}</${level}>`;
    },
  );
}

/** Body copy imported as Heading 1/2 (common in Word) must not stay a heading. */
function demoteOversizedHeadings(html: string): string {
  return html.replace(
    /<(h[1-4])\b([^>]*)>([\s\S]*?)<\/\1>/gi,
    (full, tag: string, attrs: string, inner: string) => {
      const text = htmlToPlainText(inner);
      if (!text) return "";
      if (sectionHeadingLevel(text)) return full;
      return `<p${attrs}>${inner}</p>`;
    },
  );
}

function stripColorFromStyle(style: string): string {
  return style
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const idx = part.indexOf(":");
      if (idx < 1) return true;
      const prop = part.slice(0, idx).trim().toLowerCase();
      return prop !== "color";
    })
    .join("; ");
}

function rewriteStripTextColor(attrs: string): string {
  return attrs.replace(/style=(["'])([^"']*)\1/gi, (_m, q: string, style: string) => {
    const cleaned = stripColorFromStyle(style);
    return cleaned ? `style=${q}${cleaned}${q}` : "";
  });
}

/**
 * Imported Word/Docs theme colors (and leftover journal-colored headings)
 * should not paint the body. Keep color only when the editor marked it.
 */
function stripUncustomizedTextColors(html: string): string {
  return html.replace(
    /<([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?>/g,
    (full, tag: string, attrs = "") => {
      if (/^(a|mark)$/i.test(tag)) return full;
      if (/\bdata-custom-color\b/i.test(attrs)) return full;
      if (!/style=/i.test(attrs)) return full;
      return `<${tag}${rewriteStripTextColor(attrs)}>`;
    },
  );
}

function rewriteStyleAttr(attrs: string): string {
  return attrs.replace(/style=(["'])([^"']*)\1/gi, (_m, q: string, style: string) => {
    const cleaned = stripColorFromStyle(style);
    return cleaned ? `style=${q}${cleaned}${q}` : "";
  });
}

/**
 * Headings stay ink unless the editor applied a color.
 */
function normalizeHeadingColors(html: string): string {
  return html.replace(
    /<(h[1-4])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi,
    (_full, tag: string, attrs = "", inner: string) => {
      const custom =
        /\bdata-custom-color\b/i.test(attrs) ||
        /\bnahda-custom-color\b/.test(attrs);
      if (custom) {
        const nextAttrs = /\bdata-custom-color\b/i.test(attrs)
          ? attrs
          : `${attrs} data-custom-color="true"`;
        return `<${tag}${nextAttrs}>${inner}</${tag}>`;
      }
      const nextInner = rewriteStyleAttr(inner);
      const nextAttrs = rewriteStyleAttr(attrs);
      return `<${tag}${nextAttrs}>${nextInner}</${tag}>`;
    },
  );
}

function stripChatgptTracking(url: string): string {
  return url
    .replace(/([?&])utm_source=chatgpt\.com(&|$)/gi, (_m, sep: string, end: string) =>
      sep === "?" && end === "&" ? "?" : end === "&" ? sep : "",
    )
    .replace(/[?&]$/, "");
}

function isJunkBlockText(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/^#{1,6}$/.test(t)) return true;
  if (/^[\s#*_]+$/.test(t)) return true;
  if (/^figure$/i.test(t)) return true;
  return false;
}

function looksLikeWorkflow(text: string): boolean {
  const arrows = (text.match(/→|->/g) ?? []).length;
  if (arrows < 2) return false;
  if (text.length > 420) return false;
  return (
    /LLM\s*(→|->)/i.test(text) ||
    /Scientist\s*(→|->)/i.test(text) ||
    /Prompt\s*(→|->)/i.test(text) ||
    /Literature\s*(→|->)/i.test(text) ||
    /Initial evidence\s*(→|->)/i.test(text) ||
    /Scientific question\s*(→|->)/i.test(text)
  );
}

function looksLikeFigureCaption(text: string): RegExpMatchArray | null {
  return text.match(/^fig(?:ure)?\.?\s*(\d+)\s*[:.—–-]\s*(.+)$/i);
}

function looksLikeTableCaption(text: string): RegExpMatchArray | null {
  return text.match(/^table(?:\s+(\d+))?\.?\s*[:.—–-]\s*(.+)$/i);
}

/** Drop markdown leftovers, ChatGPT links, empty hashes, and placeholder figures. */
function cleanManuscriptArtifacts(html: string): string {
  let s = html;

  s = s.replace(/\[\]\(https?:\/\/[^)]+\)/gi, "");
  s = s.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (full, attrs: string, inner: string) => {
    const href = attrs.match(/href=(["'])([^"']*)\1/i)?.[2] ?? "";
    const text = htmlToPlainText(inner);
    if (/utm_source=chatgpt\.com/i.test(href) && !text) return "";
    if (!text && /^https?:/i.test(href) && /aclanthology|arxiv\.org/i.test(href)) {
      return "";
    }
    if (/utm_source=chatgpt\.com/i.test(href)) {
      const clean = stripChatgptTracking(href);
      return `<a href="${escapeAttr(clean)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
    }
    return full;
  });

  s = s.replace(
    /<(p|h[1-4]|div|span|strong|em|b|i)\b[^>]*>\s*#{1,6}\s*/gi,
    (full) => full.replace(/#{1,6}\s*/, ""),
  );

  s = s.replace(/<(p|h[1-4])\b([^>]*)>([\s\S]*?)<\/\1>/gi, (full, tag: string, attrs: string, inner: string) => {
    const text = htmlToPlainText(inner);
    if (isJunkBlockText(text)) return "";
    const fig = looksLikeFigureCaption(text);
    if (fig) {
      return `<figure class="figure-full"><figcaption>Figure ${fig[1]}. ${escapeHtml(fig[2].trim())}</figcaption></figure>`;
    }
    const table = looksLikeTableCaption(text);
    if (table) {
      const n = table[1] ? ` ${table[1]}` : "";
      return `<figure class="table-full"><figcaption>Table${n}. ${escapeHtml(table[2].trim())}</figcaption></figure>`;
    }
    if (looksLikeWorkflow(text)) {
      return `<div class="nahda-workflow">${escapeHtml(text)}</div>`;
    }
    const stripped = inner.replace(/^\s*#{1,6}\s+/, "").replace(/^\s*\*{1,2}\s*|\s*\*{1,2}\s*$/g, "");
    if (stripped !== inner) return `<${tag}${attrs}>${stripped}</${tag}>`;
    return full;
  });

  s = s.replace(/<(h[1-4])\b[^>]*>\s*<\/\1>/gi, "");
  s = s.replace(/<p\b[^>]*>\s*<\/p>/gi, "");
  s = s.replace(
    /<figure class="table-full"><figcaption>([\s\S]*?)<\/figcaption><\/figure>\s*(<div class="nahda-table-wrap">[\s\S]*?<\/div>|<table\b[\s\S]*?<\/table>)/gi,
    (_full, cap: string, table: string) =>
      `<figure class="table-full"><figcaption>${cap}</figcaption>${table}</figure>`,
  );
  s = s.replace(/(<\/(?:p|h[1-4]|figure|div)>)\s*(<(?:p|h[1-4]|figure|div)\b)/gi, "$1\n$2");
  return s.trim();
}

function finishManuscriptHtml(html: string): string {
  return beautifyReferences(
    wrapReferencesSection(
      stripUncustomizedTextColors(
        normalizeHeadingColors(
          demoteOversizedHeadings(promoteSectionHeadings(cleanManuscriptArtifacts(html))),
        ),
      ),
    ),
  );
}

const REFERENCES_HEADING =
  /^(?:(?:\d+|[IVXLC]+)[.)]?\s*)?(references|bibliography)\.?\s*$/i;

/** Keep References in the same two-column flow as the rest of the body. */
function wrapReferencesSection(html: string): string {
  const unwrapped = html.replace(
    /<section\b[^>]*class="[^"]*\bnahda-references\b[^"]*"[^>]*>([\s\S]*?)<\/section>/gi,
    "$1",
  );
  const re = /<(h[1-4]|p)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(unwrapped))) {
    if (!REFERENCES_HEADING.test(htmlToPlainText(match[3]))) continue;
    return `${unwrapped.slice(0, match.index)}<section class="nahda-references">${unwrapped.slice(match.index)}</section>`;
  }
  return unwrapped;
}

function beautifyReferences(html: string): string {
  return html.replace(
    /<section class="nahda-references">([\s\S]*?)<\/section>/gi,
    (_full, inner: string) => {
      const headingMatch = inner.match(/^(\s*<(h[1-4])\b[^>]*>[\s\S]*?<\/\2>)/i);
      const heading = headingMatch?.[1] ?? "";
      let rest = heading ? inner.slice(heading.length) : inner;
      rest = rest.replace(/<div\b[^>]*>|<\/div>/gi, "");
      rest = rest.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_p, body: string) => {
        const chunks = String(body)
          .split(/<br\s*\/?>/i)
          .map((part) => part.trim())
          .filter(Boolean);
        if (chunks.length > 1) {
          return chunks
            .map((chunk) => `<p class="nahda-ref">${chunk}</p>`)
            .join("");
        }
        return `<p class="nahda-ref">${body}</p>`;
      });
      return `<section class="nahda-references">${heading}${rest}</section>`;
    },
  );
}

/**
 * Keep Introduction → References. Title, authors, abstract, and keywords
 * stay on the Nahda journal template, not in the imported body.
 */
export function sliceHtmlFromIntroduction(html: string): {
  body: string;
  trimmedFrontMatter: boolean;
} {
  const re = /<(h[1-3]|p)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const text = htmlToPlainText(match[3]);
    if (!BODY_HEADING.test(text)) continue;
    if (match.index <= 0) {
      return {
        body: finishManuscriptHtml(html.trim()),
        trimmedFrontMatter: false,
      };
    }
    return {
      body: finishManuscriptHtml(html.slice(match.index).trim()),
      trimmedFrontMatter: true,
    };
  }
  return {
    body: finishManuscriptHtml(html.trim()),
    trimmedFrontMatter: false,
  };
}

function inlineMarkdownToHtml(text: string): string {
  let s = escapeHtml(text);
  s = s.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_, caption: string, url: string) => {
      const clean = caption.replace(/\|\s*(full|col|column)\s*$/i, "").trim();
      const full = /\|\s*full\s*$/i.test(caption);
      return `<figure class="${full ? "figure-full" : ""}"><img src="${escapeAttr(url)}" alt="${escapeAttr(clean)}" /><figcaption>${escapeHtml(clean)}</figcaption></figure>`;
    },
  );
  s = s.replace(/\[\]\(([^)]+)\)/g, "");
  s = s.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, label: string, url: string) =>
      `<a href="${stripChatgptTracking(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`,
  );
  s = s.replace(/\{\{size:(\d{1,2})\}\}([\s\S]*?)\{\{\/size\}\}/g, '<span style="font-size:$1pt">$2</span>');
  s = s.replace(
    /\{\{font:([^}]+)\}\}([\s\S]*?)\{\{\/font\}\}/g,
    '<span style="font-family:$1">$2</span>',
  );
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/\+\+([^+]+)\+\+/g, "<u>$1</u>");
  s = s.replace(/~~([^~]+)~~/g, "<s>$1</s>");
  s = s.replace(/==([^=]+)==/g, "<mark>$1</mark>");
  s = s.replace(/\^([^^]+)\^/g, "<sup>$1</sup>");
  s = s.replace(/~([^~]+)~/g, "<sub>$1</sub>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  return s;
}

/** Convert older markdown-ish production drafts into editable HTML. */
export function legacyMarkdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i]?.trim() ?? "";
    if (!trimmed) {
      i += 1;
      continue;
    }

    const alignOpen = trimmed.match(/^:::(left|center|right|justify)$/i);
    if (alignOpen) {
      const align = alignOpen[1].toLowerCase();
      i += 1;
      const block: string[] = [];
      while (i < lines.length && lines[i].trim() !== ":::") {
        block.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      out.push(
        `<p style="text-align:${align}">${inlineMarkdownToHtml(block.join(" ").trim() || " ")}</p>`,
      );
      continue;
    }

    if (/^#{1,6}$/.test(trimmed) || /^[\s#*_]+$/.test(trimmed) || /^figure$/i.test(trimmed)) {
      i += 1;
      continue;
    }

    if (/^#{1,3}\s+/.test(trimmed)) {
      const level = trimmed.match(/^#+/)?.[0].length ?? 1;
      const tag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
      out.push(
        `<${tag}>${inlineMarkdownToHtml(trimmed.replace(/^#{1,3}\s+/, ""))}</${tag}>`,
      );
      i += 1;
      continue;
    }

    if (/^\|.+\|$/.test(trimmed) && i + 1 < lines.length) {
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
      if (rows.length) {
        const [header, ...body] = rows;
        out.push(
          `<table><thead><tr>${header.map((c) => `<th>${inlineMarkdownToHtml(c)}</th>`).join("")}</tr></thead><tbody>${body
            .map(
              (row) =>
                `<tr>${row.map((c) => `<td>${inlineMarkdownToHtml(c)}</td>`).join("")}</tr>`,
            )
            .join("")}</tbody></table>`,
        );
        continue;
      }
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i += 1;
      }
      out.push(
        `<ul>${items.map((item) => `<li>${inlineMarkdownToHtml(item)}</li>`).join("")}</ul>`,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      out.push(
        `<ol>${items.map((item) => `<li>${inlineMarkdownToHtml(item)}</li>`).join("")}</ol>`,
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
      !/^:::(left|center|right|justify)$/i.test(lines[i].trim())
    ) {
      para.push(lines[i].trim());
      i += 1;
    }
    out.push(`<p>${inlineMarkdownToHtml(para.join(" "))}</p>`);
  }

  return out.join("");
}

export function ensureManuscriptHtml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const html = looksLikeHtml(trimmed)
    ? sanitizeManuscriptHtml(trimmed)
    : sanitizeManuscriptHtml(legacyMarkdownToHtml(trimmed));
  return finishManuscriptHtml(html);
}

const FULL_WIDTH_BLOCK =
  /<figure\b[^>]*class="[^"]*\bfigure-full\b[^"]*"[^>]*>[\s\S]*?<img\b[\s\S]*?<\/figure>|<figure\b[^>]*class="[^"]*\btable-full\b[^"]*"[^>]*>[\s\S]*?(?:<table\b|<div class="nahda-table-wrap")[\s\S]*?<\/figure>|<figure\b[^>]*>[\s\S]*?<table\b[\s\S]*?<\/figure>|<div\b[^>]*class="[^"]*\b(?:nahda-table-wrap|nahda-workflow)\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi;

/**
 * Full-width tables/figures break CSS columns for everything after them.
 * Split so each text region is its own two-column block. Pull the heading
 * immediately before a table/figure into that block so it is not left
 * stranded in an empty column.
 */
export function splitArticleBodyHtml(
  html: string,
): { kind: "flow" | "full"; html: string }[] {
  const parts: { kind: "flow" | "full"; html: string }[] = [];
  let last = 0;
  const re = new RegExp(FULL_WIDTH_BLOCK.source, "gi");
  const trailingHeading = /(?:<(h[1-4])\b[^>]*>[\s\S]*?<\/\1>\s*)+$/i;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    let flow = html.slice(last, match.index);
    let fullHtml = match[0];
    const headed = flow.match(trailingHeading);
    if (headed && headed.index != null) {
      flow = flow.slice(0, headed.index);
      fullHtml = `${headed[0]}${fullHtml}`;
    }
    const trimmedFlow = flow.trim();
    if (trimmedFlow) parts.push({ kind: "flow", html: trimmedFlow });
    parts.push({ kind: "full", html: fullHtml });
    last = match.index + match[0].length;
  }
  const rest = html.slice(last).trim();
  if (rest) parts.push({ kind: "flow", html: rest });
  if (!parts.length && html.trim()) parts.push({ kind: "flow", html: html.trim() });
  return parts;
}

export function extractGoogleDocId(url: string): string | null {
  const trimmed = url.trim();
  const m =
    trimmed.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/^([a-zA-Z0-9_-]{20,})$/);
  return m?.[1] ?? null;
}

export function googleDocExportUrl(docId: string) {
  return `https://docs.google.com/document/d/${docId}/export?format=docx`;
}

export type ImportedManuscript = {
  body: string;
  figures: ImportedFigure[];
  trimmedFrontMatter: boolean;
  warnings: string[];
};
