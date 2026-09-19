/**
 * Preview image for listing / homepage cards.
 * Prefers real manuscript figures — never journal logos/icons.
 */

const IMG_SRC_RE = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;

function isJournalChrome(url: string): boolean {
  return (
    /journal-logos/i.test(url) ||
    /\/brand\//i.test(url) ||
    /logo-nahda/i.test(url)
  );
}

/** Import pipeline often leaves disposable assets before the real figures. */
function isImportArtifact(url: string): boolean {
  return /\/import-|import-mt/i.test(url);
}

function usable(src: string | null | undefined): string | null {
  const url = src?.trim();
  if (!url) return null;
  if (url.startsWith("data:")) return null;
  if (isJournalChrome(url)) return null;
  return url;
}

function scoreArticleImage(url: string): number {
  if (!usable(url)) return -1;
  let score = 1;
  if (/article-figures/i.test(url)) score += 2;
  if (!isImportArtifact(url)) score += 4;
  if (/\.(png|jpe?g|webp)(\?|$)/i.test(url)) score += 1;
  return score;
}

function bestFromList(urls: string[]): string | null {
  let best: string | null = null;
  let bestScore = -1;
  for (const raw of urls) {
    const url = usable(raw);
    if (!url) continue;
    const score = scoreArticleImage(url);
    if (score > bestScore) {
      best = url;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

function figureUrls(figures: unknown): string[] {
  if (!Array.isArray(figures)) return [];
  const out: string[] = [];
  for (const item of figures) {
    if (!item || typeof item !== "object") continue;
    const url = (item as { url?: string }).url;
    if (typeof url === "string" && url.trim()) out.push(url.trim());
  }
  return out;
}

function bodyImageUrls(html: string | null | undefined): string[] {
  if (!html) return [];
  const out: string[] = [];
  for (const match of html.matchAll(IMG_SRC_RE)) {
    if (match[1]) out.push(match[1]);
  }
  return out;
}

/**
 * One-off preview overrides for articles that shipped PDF-only (no production
 * figures). Everything else resolves from manuscript body / figures.
 */
const PREVIEW_OVERRIDES_BY_SLUG: Record<string, string> = {
  "uacrf-a-unified-adaptive-framework-for-resilient-ai-cloud-systems-supporting-cri":
    "/article-previews/uacrf-framework.png",
};

/**
 * Pick a content image from the article itself.
 * Order: override (rare), best body <img>, best production figure, then a true
 * cover (never the journal icon / logo).
 */
export function resolveArticlePreviewImage(args: {
  slug?: string | null;
  productionFigures?: unknown;
  productionBody?: string | null;
  coverImageUrl?: string | null;
  journalCoverImageUrl?: string | null;
}): string | null {
  const fromBody = bestFromList(bodyImageUrls(args.productionBody));
  if (fromBody) return fromBody;

  const fromFigures = bestFromList(figureUrls(args.productionFigures));
  if (fromFigures) return fromFigures;

  const override = args.slug ? PREVIEW_OVERRIDES_BY_SLUG[args.slug] : null;
  if (override) return override;

  const cover = usable(args.coverImageUrl);
  if (
    cover &&
    cover !== args.journalCoverImageUrl?.trim() &&
    !isJournalChrome(cover)
  ) {
    return cover;
  }

  return null;
}

/** Avoid "Vol. Volume 1.0" / "Issue Issue 1.0" doubles. */
export function formatVolumeIssue(volume?: string | null, issue?: string | null) {
  const parts: string[] = [];
  if (volume && volume !== "—") {
    parts.push(/^vol(?:ume)?\.?\b/i.test(volume) ? volume : `Vol. ${volume}`);
  }
  if (issue && issue !== "—") {
    parts.push(/^issue\b/i.test(issue) ? issue : `Issue ${issue}`);
  }
  return parts.join(" · ");
}
