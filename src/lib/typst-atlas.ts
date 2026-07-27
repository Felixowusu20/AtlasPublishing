import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";

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
};

/** Escape Typst special characters in plain text. */
export function escapeTypst(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/#/g, "\\#")
    .replace(/\$/g, "\\$")
    .replace(/@/g, "\\@")
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

  // Escape remaining plain text, then restore protected Typst fragments
  s = escapeTypst(s);
  s = s.replace(/§SLOT(\d+)§/g, (_, i: string) => slots[Number(i)] ?? "");

  return s;
}

type FigureMap = Map<string, string>; // url → local path relative to workspace

function convertPipeTable(
  lines: string[],
  start: number,
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

  const typst = [
    `#figure(`,
    `  table(`,
    `    columns: ${cols},`,
    `    inset: 6pt,`,
    `    align: left,`,
    `    stroke: 0.4pt + rgb("#d7dee7"),`,
    `    ${[...headerCells, ...bodyCells].join(",\n    ")}`,
    `  ),`,
    `  caption: [Table],`,
    `)`,
  ].join("\n");

  return { typst, nextIndex: i };
}

function figureTypst(localPath: string, caption: string, fullWidth = true): string {
  const width = fullWidth ? "100%" : "85%";
  const cleanCaption = caption.replace(/\|\s*full\s*$/i, "").trim();
  return [
    `#figure(`,
    `  image(${JSON.stringify(localPath)}, width: ${width}),`,
    `  caption: [${escapeTypst(cleanCaption || "Figure")}],`,
    `)`,
  ].join("\n");
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
      "= References",
      "",
      "_References will be listed here._",
    ].join("\n");
  }

  const lines = raw.split("\n");
  const out: string[] = [];
  let i = 0;
  let inList: "ul" | "ol" | null = null;

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
      out.push("#line(length: 100%, stroke: 0.4pt + rgb(\"#d7dee7\"))");
      out.push("");
      i += 1;
      continue;
    }

    // Pipe table
    if (/^\|.+\|$/.test(trimmed) && i + 1 < lines.length) {
      const table = convertPipeTable(lines, i);
      if (table) {
        closeList();
        // Optional caption from previous **Table.** line
        let caption = "Table";
        if (out.length > 0) {
          const prev = out[out.length - 1];
          const m = prev.match(/^\*?Table\.?\*?\s*(.*)$/i) || prev.match(/^\*\*Table\.?\*\*\s*(.*)$/i);
          if (m) {
            caption = m[1].replace(/^\*\*|\*\*$/g, "").trim() || "Table";
            out.pop();
            if (out[out.length - 1] === "") out.pop();
          }
        }
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

    // Image alone on a line (optional |full for page width)
    const img = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (img) {
      closeList();
      const rawCaption = img[1];
      const fullWidth = /\|\s*full\s*$/i.test(rawCaption);
      const caption = rawCaption.replace(/\|\s*full\s*$/i, "").trim();
      const url = img[2];
      const local = figureMap.get(url);
      if (local) {
        out.push(figureTypst(local, caption, fullWidth || true));
      } else {
        out.push(`_Figure unavailable (upload required): ${escapeTypst(caption)}_`);
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
      out.push(`== ${escapeTypst(h2[1])}`);
      out.push("");
      i += 1;
      continue;
    }
    const h1 = trimmed.match(/^#\s+(.+)$/);
    if (h1) {
      closeList();
      out.push(`= ${escapeTypst(h1[1])}`);
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
    out.push(inlineToTypst(line));
    i += 1;
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

/**
 * Build a complete Typst document from Atlas article metadata.
 * First page uses an ACS-style masthead (logo, accent rule, article badge).
 */
export function buildAtlasTypstSource(
  input: AtlasTypstInput,
  figureMap: FigureMap = new Map(),
  logoPath?: string | null,
): string {
  const authors = input.authors.map(escapeTypst).join(", ") || "Author";
  const affiliations =
    input.affiliations.length > 0
      ? input.affiliations
          .map((a, i) => `~${i + 1}~ ${escapeTypst(a)}`)
          .join(" \\\n")
      : "";
  const keywords = input.keywords.map(escapeTypst).join(", ") || "—";
  const year = new Date().getFullYear().toString();
  const typeLabel = escapeTypst(
    (input.articleType || "Article").replace(/\s+Article$/i, "").slice(0, 18) ||
      "Article",
  );
  const oaLabel = input.openAccess === false ? "Access" : "Open Access";
  const citeAuthor = escapeTypst(
    input.authors[0]
      ? `${input.authors[0]}${input.authors.length > 1 ? " et al." : ""}`
      : "Author",
  );

  const logoBlock = logoPath
    ? `#image("${logoPath}", height: 1.15cm)`
    : `#box(
        width: 1.15cm,
        height: 1.15cm,
        fill: rgb("#0f6b6a"),
        radius: 50%,
        inset: 2.5pt,
        align(center + horizon)[
          #box(
            width: 100%,
            height: 100%,
            fill: white,
            radius: 50%,
            align(center + horizon)[
              #text(size: 13pt, weight: "bold", fill: rgb("#0f6b6a"))[A]
            ],
          )
        ],
      )`;

  return `
#set page(
  paper: "a4",
  margin: (x: 2.0cm, y: 2.2cm),
  header: context {
    if counter(page).get().first() > 1 {
      set text(size: 8pt, fill: rgb("#5b6b7c"))
      grid(
        columns: (1fr, auto),
        [Atlas Academic Publishing · ${escapeTypst(input.journalShortTitle)}],
        [${escapeTypst(input.manuscriptId)}],
      )
      v(2pt)
      line(length: 100%, stroke: 0.45pt + rgb("#0f6b6a"))
    }
  },
  footer: context {
    set text(size: 8pt, fill: rgb("#5b6b7c"))
    line(length: 100%, stroke: 0.3pt + rgb("#d7dee7"))
    v(4pt)
    grid(
      columns: (1fr, auto),
      [© ${year} Atlas Academic Publishing · ${escapeTypst(input.license || "CC BY 4.0")}],
      counter(page).display("1"),
    )
  },
)

#set text(font: ("Libertinus Serif", "New Computer Modern", "Georgia", "Times New Roman"), size: 10.5pt, fill: rgb("#0b1f33"))
#set par(justify: true, leading: 0.72em)
#set heading(numbering: "1.")
#set list(indent: 1em)
#set enum(indent: 1em)
#show figure: set block(breakable: false)
#show figure.caption: set text(size: 9pt, fill: rgb("#5b6b7c"))

// —— First-page masthead (ACS-style) ——
#grid(
  columns: (auto, 1fr, auto),
  gutter: 10pt,
  align(horizon)[${logoBlock}],
  align(horizon)[
    #text(size: 12pt, weight: "bold", fill: rgb("#5b6b7c"), tracking: 0.08em)[ATLAS ]
    #text(size: 12pt, weight: "bold", fill: rgb("#0b1f33"), tracking: 0.06em)[${escapeTypst((input.journalShortTitle || "JOURNAL").toUpperCase())}]
    #v(2pt)
    #text(size: 8pt, fill: rgb("#5b6b7c"))[${escapeTypst(input.journalTitle)}]
  ],
  align(right + horizon)[
    #text(size: 8pt, weight: "bold", fill: rgb("#0b1f33"))[${escapeTypst(input.manuscriptId)}] \\
    #text(size: 7.5pt, fill: rgb("#5b6b7c"))[${escapeTypst(formatDate(input.publishedAt))}]
  ],
)

#v(8pt)
#grid(
  columns: (1fr, auto),
  gutter: 4pt,
  align(horizon)[#box(width: 100%, height: 2.8pt, fill: rgb("#0f6b6a"))],
  align(horizon)[
    #box(
      fill: rgb("#0f6b6a"),
      inset: (x: 7pt, y: 3.5pt),
    )[
      #text(size: 7.5pt, weight: "bold", fill: white, tracking: 0.08em)[${typeLabel}]
    ]
  ],
)

#v(14pt)
#text(size: 16pt, weight: "bold")[${escapeTypst(input.title)}]

#v(10pt)
#text(size: 8.5pt, fill: rgb("#5b6b7c"))[${authors}]

#v(4pt)
#text(size: 11.5pt)[
  ${affiliations}
]

#v(10pt)
#grid(
  columns: (1fr, 1fr),
  gutter: 8pt,
  [
    #block(
      width: 100%,
      inset: (x: 8pt, y: 7pt),
      fill: rgb("#fafbfc"),
      stroke: (bottom: 2.5pt + rgb("#f59e0b")),
    )[
      #text(size: 8pt)[
        #text(weight: "bold")[Cite This:]
        #text(fill: rgb("#0f6b6a"))[${citeAuthor}. ${escapeTypst(input.title)}. ${escapeTypst(input.journalShortTitle)}.]
      ]
    ]
  ],
  [
    #block(
      width: 100%,
      inset: (x: 8pt, y: 7pt),
      fill: rgb("#fafbfc"),
      stroke: (bottom: 2.5pt + rgb("#0f6b6a")),
    )[
      #text(size: 9pt, weight: "bold", fill: rgb("#0f6b6a"))[Read Online]
    ]
  ],
)

#v(6pt)
#text(size: 7.5pt, weight: "bold", fill: rgb("#5b6b7c"), tracking: 0.06em)[
  #text(fill: rgb("#0f6b6a"))[${oaLabel}]
  #h(0.4em)|#h(0.4em) Metrics & More
  #h(0.4em)|#h(0.4em) Vol. ${escapeTypst(input.volume || "—")} · Issue ${escapeTypst(input.issue || "—")}
  #h(0.4em)|#h(0.4em) DOI: ${escapeTypst(input.doi || "Pending")}
]

#v(4pt)
#line(length: 100%, stroke: 0.4pt + rgb("#d7dee7"))

#v(6pt)
#text(size: 8.5pt, fill: rgb("#5b6b7c"))[
  ${escapeTypst(input.journalTitle)}
  · Received ${escapeTypst(formatDate(input.receivedAt))}
  · Accepted ${escapeTypst(formatDate(input.acceptedAt))}
  · Published ${escapeTypst(formatDate(input.publishedAt))}
]

#v(12pt)
#block(
  width: 100%,
  inset: 10pt,
  fill: rgb("#f5f7fa"),
  radius: 4pt,
  [
    #text(size: 9pt, weight: "bold", fill: rgb("#0f6b6a"))[Abstract]
    #v(4pt)
    #set text(size: 9.5pt)
    ${escapeTypst(input.abstract)}
  ],
)

#v(8pt)
#block(
  width: 100%,
  inset: (x: 10pt, y: 8pt),
  stroke: (left: 2.5pt + rgb("#0f6b6a"), rest: 0.5pt + rgb("#d7dee7")),
  fill: rgb("#f5f7fa"),
  radius: 3pt,
  [
    #text(size: 8pt, weight: "bold", fill: rgb("#0f6b6a"), tracking: 0.08em)[KEYWORDS]
    #v(4pt)
    #text(size: 9pt, fill: rgb("#0b1f33"))[${keywords}]
  ],
)

#v(14pt)

${bodyToTypst(input.body, figureMap)}
`.trim();
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
          ? `Typst could not compile the Atlas article PDF: ${detail.slice(0, 500)}`
          : "Typst could not compile the Atlas article PDF",
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
