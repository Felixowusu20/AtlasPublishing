/**
 * Parse a WhatsApp channel-style scholarship / news paste into announcement fields.
 * Matches posts like Chevening: title, body, numbered benefits, deadline, apply URL.
 */

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;

export type ParsedWhatsAppAnnouncement = {
  title: string;
  summary: string;
  href: string | null;
};

function cleanUrl(raw: string): string {
  return raw.replace(/[),.;!?]+$/g, "").trim();
}

function extractUrls(text: string): string[] {
  const matches = text.match(URL_RE) ?? [];
  return [...new Set(matches.map(cleanUrl).filter(Boolean))];
}

function stripWhatsAppMarkup(value: string): string {
  return value
    .replace(/[*_~`]/g, "")
    .replace(/\u200b/g, "")
    .trim();
}

function looksLikeTitle(line: string): boolean {
  const t = line.trim();
  if (t.length < 8 || t.length > 180) return false;
  if (/^https?:\/\//i.test(t)) return false;
  if (/^(degree|deadline|supported by)\b/i.test(t)) return false;
  if (/^\d+[\).]\s/.test(t)) return false;
  if (/^(apply\s*\|)/i.test(t)) return false;
  return true;
}

/** Facts, lists, and section headers — not the post's summary paragraph. */
function isDetailLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (/^https?:\/\//i.test(t)) return true;
  if (/^\d+[\).]\s/.test(t)) return true;
  if (/^[-•]\s/.test(t)) return true;
  if (/^(degree|deadline|supported by)\b/i.test(t)) return true;
  if (/^what (the|this) (program|scholarship|award)/i.test(t)) return true;
  if (/^apply\s*\|/i.test(t)) return true;
  if (/^[a-z0-9.-]+\.(org|com|edu|gov)(\/|\s|$)/i.test(t)) return true;
  return false;
}

/**
 * Narrative summary: the paragraph(s) right after the title,
 * before benefits lists, degree, or deadline.
 */
function extractSummary(lines: string[], title: string): string {
  const start = lines.findIndex((line) => line === title);
  const rest = start >= 0 ? lines.slice(start + 1) : lines;
  const prose: string[] = [];

  for (const line of rest) {
    if (isDetailLine(line)) {
      if (prose.length > 0) break;
      continue;
    }
    prose.push(line);
    // One or two short paragraphs is the post summary, not the full brief.
    if (prose.join(" ").length > 420) break;
  }

  let summary = prose.join(" ").replace(/\s+/g, " ").trim();
  if (!summary) {
    summary = rest.find((line) => !isDetailLine(line)) ?? title;
  }
  if (summary.length > 500) {
    summary = `${summary.slice(0, 497).trimEnd()}…`;
  }
  return summary;
}

/**
 * Turn pasted channel text into title / summary / link.
 * Summary is the post's intro paragraph (not the benefit list).
 */
export function parseWhatsAppAnnouncementText(
  raw: string,
): ParsedWhatsAppAnnouncement {
  const text = stripWhatsAppMarkup(raw.replace(/\r\n/g, "\n")).trim();
  if (!text) {
    throw new Error("Paste is empty");
  }

  const urls = extractUrls(text);
  // Prefer apply / scholarship destinations over whatsapp.com
  const href =
    urls.find((u) => !/whatsapp\.com/i.test(u)) ?? urls[0] ?? null;

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^https?:\/\//i.test(l));

  let title = lines.find(looksLikeTitle) ?? lines[0] ?? "Announcement";
  // Drop preview chrome sometimes copied with the post
  if (/^(apply\s*\|)/i.test(title) && lines[1] && looksLikeTitle(lines[1])) {
    title = lines[1];
  }

  const summary = extractSummary(lines, title);

  if (title.length < 2) {
    throw new Error("Could not detect a title in the paste");
  }

  return { title, summary, href };
}

/**
 * Fetch Open Graph image from an apply / news URL (e.g. Chevening preview art).
 */
export async function fetchOgImage(
  pageUrl: string,
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(pageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NahdaPublicationsBot/1.0; +https://nahda)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();
    const og =
      html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      ) ||
      html.match(
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
      );
    const src = og?.[1]?.trim();
    if (!src) return null;
    if (src.startsWith("//")) return `https:${src}`;
    if (src.startsWith("/")) {
      const base = new URL(pageUrl);
      return `${base.origin}${src}`;
    }
    return src;
  } catch {
    return null;
  }
}
