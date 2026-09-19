/**
 * Scholarly / indexer bots that must never be challenged on public article routes.
 * Site-wide captcha gates break Google Scholar and similar crawlers.
 */
const SCHOLAR_BOT_UA =
  /Googlebot|Google-Scholar|Googlebot-Image|Googlebot-News|bingbot|BingPreview|SemanticScholarBot|ia_archiver|archive\.org_bot|DuckDuckBot|Applebot|YandexBot|Baiduspider|facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot/i;

export function isScholarlyCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return SCHOLAR_BOT_UA.test(userAgent);
}

/** Public paths crawlers need for indexing papers (never challenge). */
export function isPublicResearchPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/articles") ||
    pathname.startsWith("/journals") ||
    pathname.startsWith("/nid") ||
    pathname.startsWith("/doi") ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/sitemaps") ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    pathname.startsWith("/api/articles/") ||
    pathname.startsWith("/api/cms/") ||
    pathname.startsWith("/api/search")
  );
}
