import type { MetadataRoute } from "next";
import { seoBaseUrl } from "@/lib/seo/scholar";

const PUBLIC_ALLOW = [
  "/",
  "/articles",
  "/articles/current-issues",
  "/articles/past-issues",
  "/journals",
  "/nid",
  "/doi",
  "/search",
  "/about",
  "/help",
  "/terms",
  "/privacy",
  "/authors",
] as const;

const SCHOLAR_ALLOW = [
  "/",
  "/articles",
  "/journals",
  "/nid",
  "/doi",
  "/api/articles/",
] as const;

const PRIVATE_DISALLOW = [
  "/admin",
  "/admin/",
  "/dashboard",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/notifications",
  "/profile",
  "/submissions",
] as const;

export default function robots(): MetadataRoute.Robots {
  const base = seoBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: [...PUBLIC_ALLOW],
        disallow: [...PRIVATE_DISALLOW, "/api/"],
      },
      {
        // Google Scholar / Googlebot — keep papers + PDF download API open
        userAgent: "Googlebot",
        allow: [...SCHOLAR_ALLOW],
        disallow: ["/admin", "/dashboard", "/login", "/register", "/api/admin"],
      },
      {
        userAgent: "Googlebot-News",
        allow: [...SCHOLAR_ALLOW],
      },
      {
        userAgent: "Google-Scholar",
        allow: [...SCHOLAR_ALLOW],
      },
      {
        userAgent: "SemanticScholarBot",
        allow: [...SCHOLAR_ALLOW],
      },
      {
        userAgent: "bingbot",
        allow: [...SCHOLAR_ALLOW],
      },
    ],
    sitemap: [
      `${base}/sitemap.xml`,
      `${base}/sitemaps/articles.xml`,
      `${base}/sitemaps/journals.xml`,
      `${base}/sitemaps/issues.xml`,
      `${base}/sitemaps/nids.xml`,
      `${base}/sitemaps/dois.xml`,
    ],
  };
}
