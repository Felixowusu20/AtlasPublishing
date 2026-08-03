# Nahda Publications — Google Scholar & SEO Readiness Report

**Date:** 2026-08-03  
**Scope:** Scholar metadata, JSON-LD, sitemaps, robots, journal/issue discovery, public PDFs, DOI-ready architecture  
**Constraint honored:** Prior work (cookie consent, mobile layout, hero CMS edit, email await, hydration fixes) left intact

---

## Files created

| File | Purpose |
|---|---|
| `src/lib/seo/scholar.ts` | `citation_*` / OG / canonical / absolute URL helpers |
| `src/lib/seo/jsonld.ts` | `ScholarlyArticle` + `Periodical` JSON-LD builders |
| `src/lib/seo/article-seo.ts` | Load/validate Scholar fields; issue key helpers |
| `src/components/json-ld.tsx` | Server-rendered `<script type="application/ld+json">` |
| `src/app/sitemap.ts` | Combined sitemap (static + journals + articles + issues) |
| `src/app/robots.ts` | Crawl rules + sitemap pointers |
| `src/app/sitemaps/[type]/route.ts` | `/sitemaps/articles.xml`, `journals.xml`, `issues.xml` |
| `src/app/journals/[slug]/issues/[issueKey]/page.tsx` | Dedicated issue TOC pages |

## Files modified

| File | Changes |
|---|---|
| `src/app/layout.tsx` | `metadataBase`, OG/Twitter defaults, robots meta (cookie banner untouched) |
| `src/app/articles/[slug]/page.tsx` | SSR `generateMetadata` + citation tags + JSON-LD; affiliations; PDF CTA |
| `src/app/journals/[slug]/page.tsx` | SSR metadata + Periodical JSON-LD; DB-derived archives; guidelines tab |
| `src/app/doi/[...path]/page.tsx` | SSR Scholar metadata + JSON-LD; canonical → article |
| `src/app/api/articles/[slug]/download/route.ts` | Public PDF; inline for Scholar/Googlebot; `deletedAt` filter |
| `src/app/api/admin/publish-queue/route.ts` | Scholar validation + `revalidatePath` on publish |
| `src/lib/doi.ts` | Richer DOI lookup fields (affiliations, keywords, ISSN) |

---

## What was implemented (mapped to requirements)

1. **Google Scholar `citation_*` tags** — emitted via Next.js `generateMetadata` → `other` (SSR head): title, author(s), journal, date, volume, issue, first/last page, PDF URL, DOI, abstract HTML URL, ISSN.
2. **SEO URLs** — `/articles/[slug]` (unchanged, now fully meta-tagged).
3. **SSR metadata** — article, journal, DOI, issue pages use App Router `generateMetadata`.
4. **Journal pages** — name, ISSN/eISSN, aims & scope, editorial board (EIC + mock board fallback), published issues (DB-derived), author guidelines tab.
5. **Public PDFs** — `/api/articles/[slug]/download` remains unauthenticated; crawlers get `inline` disposition.
6. **Schema.org ScholarlyArticle JSON-LD** — server-rendered on article + DOI pages; Periodical on journals.
7. **XML sitemaps** — `/sitemap.xml` + `/sitemaps/articles.xml|journals.xml|issues.xml`.
8. **robots.txt** — `/robots.txt` via `src/app/robots.ts`; allows public content; allows Googlebot PDF paths; blocks admin/auth.
9. **GSC / Scholar discovery** — canonicals, OG, sitemaps, robots, public abstracts + PDFs.
10. **Article page content** — title, authors, affiliations, abstract, keywords, DOI, dates, PDF button; references via PDF (no separate HTML references field yet).
11. **Canonical + Open Graph** — per article/journal + site defaults.
12. **DOI-ready architecture** — house DOIs + `/doi/...` landings with Scholar tags; Crossref deposit still future work; doi.org can later resolve to these URLs.
13. **Automated metadata on publish** — `validateScholarReadiness` + path revalidation after publish (tags generated automatically by `generateMetadata` for every live article).
14. **SSR not client-only** — metadata + JSON-LD are server components / `generateMetadata`.
15. **Indexing blockers addressed** — missing head tags, sitemap/robots, issue URLs, crawler-friendly PDF disposition.

---

## Remaining issues

| Issue | Impact | Severity |
|---|---|---|
| DOIs are **house-hosted** (`10.58000/...`), not deposited to Crossref | doi.org will not resolve until membership + deposit | High for Crossref/OpenAlex |
| No HTML **references** field in Prisma (refs live in PDF) | Scholar prefers refs in HTML when possible | Medium |
| Editorial board still partly from **mock** data | Incomplete board for some journals | Medium |
| No dedicated `Issue` Prisma model | Issues derived from volume/issue strings | Low–Medium |
| ISSN missing on some journals | Weakens Scholar/DOAJ signals | Medium (data) |
| Cloudinary ACL can still 502 PDF fetches | Blocks `citation_pdf_url` | Ops |
| Full-text HTML body not stored for DB articles | Abstract + PDF model (common; OK if PDF open) | Low for Scholar |

---

## Scores

### Google Scholar readiness: **78 / 100**
- Strong: unique article URLs, SSR `citation_*`, free PDF, abstract HTML, ISSN tags when present, sitemap, robots  
- Gaps: Crossref DOI resolution, HTML references, complete ISSN coverage

### SEO readiness (Google Search / GSC): **85 / 100**
- Strong: metadataBase, canonical, OG/Twitter, JSON-LD, sitemaps, robots, issue pages  
- Gaps: richer editorial content, Search Console property verification (manual), performance monitoring

---

## Recommended next steps

### Crossref / DOI
1. Obtain Crossref membership and a registered prefix (replace `10.58000` in `src/lib/doi.ts`).
2. Implement deposit XML/REST (`src/lib/crossref.ts`) on publish; set resource URL to `https://yoursite/articles/{slug}` (or `/doi/{doi}`).
3. Keep local `/doi/...` as mirror landing with same metadata.

### ISSN management
1. Ensure every active journal has print and/or eISSN in Admin → Journals.
2. Register eISSNs with the ISSN International Centre; list them on journal about pages (already displayed).

### DOAJ application
1. Confirm OA license (CC BY) on all articles, APC transparency, peer-review policy pages.
2. Provide article XML/metadata endpoint or ensure sitemap + OAI later.
3. Apply at https://doaj.org with sample articles that have complete Scholar tags + PDFs.

### Google Search Console / Scholar
1. Verify `nahdapublications.org` in GSC; submit `https://nahdapublications.org/sitemap.xml`.
2. Confirm `NEXT_PUBLIC_APP_URL` is set to the production origin.
3. Spot-check View Source on an article for `citation_title`, `citation_author`, `citation_pdf_url`, and JSON-LD.
4. Use Scholar’s inclusion guidelines; ensure PDFs are not blocked by robots or login.

### Product / data
1. Persist editorial boards in Prisma (replace mock).
2. Optional: store `references` text/HTML on `PublishedArticle` for on-page bibliography.
3. Optional: formal `Issue` model if you need cover images, issue DOIs, or embargoes.
