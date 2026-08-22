/**
 * Build a standalone print HTML document from the live Nahda article
 * template so Chrome's print engine can produce the same PDF as Print preview.
 */

function collectCss(origin: string): string {
  const chunks: string[] = [];
  const sheets = [
    ...Array.from(document.styleSheets),
    ...Array.from(document.adoptedStyleSheets ?? []),
  ];
  for (const sheet of sheets) {
    try {
      chunks.push(
        Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join("\n"),
      );
    } catch {
      const href = "href" in sheet ? String(sheet.href || "") : "";
      if (href) {
        chunks.push(`@import url("${href}");`);
      }
    }
  }
  return absolutizeCss(chunks.join("\n"), origin);
}

function absolutizeCss(css: string, origin: string): string {
  return css.replace(/url\((['"]?)(\/[^)'"]+)\1\)/g, `url($1${origin}$2$1)`);
}

function absolutizeHtml(root: HTMLElement, origin: string) {
  root.querySelectorAll("[src]").forEach((node) => {
    const src = node.getAttribute("src");
    if (src?.startsWith("/")) node.setAttribute("src", `${origin}${src}`);
  });
  root.querySelectorAll("[href]").forEach((node) => {
    const href = node.getAttribute("href");
    if (href?.startsWith("/")) node.setAttribute("href", `${origin}${href}`);
  });
}

const PRINT_ENGINE_CSS = `
@page {
  size: A4;
  margin: 12mm 14mm 18mm;
  @bottom-right {
    content: counter(page);
    font-family: Helvetica, Arial, sans-serif;
    font-size: 8pt;
    color: #5b6b7c;
  }
}

html, body {
  margin: 0 !important;
  padding: 0 !important;
  background: #fff !important;
  height: auto !important;
  min-height: 0 !important;
  overflow: visible !important;
}

.nahda-article {
  box-shadow: none !important;
  outline: none !important;
  border: none !important;
  border-radius: 0 !important;
  max-width: none !important;
  overflow: visible !important;
  background: #fff !important;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.nahda-article header,
.nahda-article-inner {
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.nahda-print-frame > tfoot {
  display: table-footer-group !important;
}

.nahda-running-footer {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  overflow: visible !important;
}

.nahda-pdf-source,
.nahda-web-only {
  display: none !important;
}
`;

/** Snapshot the on-screen journal template into a print-ready HTML document. */
export function buildNahdaPrintDocument(article: HTMLElement): string {
  const origin = window.location.origin;
  const clone = article.cloneNode(true) as HTMLElement;
  clone.classList.remove("nahda-pdf-print");
  clone.style.boxShadow = "none";
  clone.style.borderRadius = "0";
  clone.style.maxWidth = "none";
  clone.style.overflow = "visible";
  clone.style.width = "100%";
  absolutizeHtml(clone, origin);

  const css = collectCss(origin);
  const htmlClass = document.documentElement.className;
  const htmlStyle = document.documentElement.getAttribute("style") || "";

  return `<!DOCTYPE html>
<html lang="en" class="${htmlClass}" style="${htmlStyle}">
<head>
  <meta charset="utf-8" />
  <base href="${origin}/" />
  <title>Nahda article</title>
  <style>${css}</style>
  <style>${PRINT_ENGINE_CSS}</style>
</head>
<body style="margin:0;background:#fff;">
${clone.outerHTML}
</body>
</html>`;
}
