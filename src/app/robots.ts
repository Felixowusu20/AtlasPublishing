import type { MetadataRoute } from "next";
import { seoBaseUrl } from "@/lib/seo/scholar";

export default function robots(): MetadataRoute.Robots {
  const base = seoBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/articles", "/journals", "/doi", "/search", "/about", "/help", "/terms", "/privacy", "/authors"],
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/dashboard",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/notifications",
          "/profile",
          "/submissions",
        ],
      },
      {
        // Allow Google Scholar / Googlebot to fetch PDFs via the public download API
        userAgent: "Googlebot",
        allow: [
          "/",
          "/articles",
          "/journals",
          "/doi",
          "/api/articles/",
        ],
        disallow: ["/admin", "/dashboard", "/login", "/register", "/api/admin"],
      },
      {
        userAgent: "Googlebot-News",
        allow: ["/", "/articles", "/journals", "/doi", "/api/articles/"],
      },
    ],
    sitemap: [
      `${base}/sitemap.xml`,
      `${base}/sitemaps/articles.xml`,
      `${base}/sitemaps/journals.xml`,
      `${base}/sitemaps/issues.xml`,
    ],
  };
}
