// Atlas Academic Publishing — Typst article template (ACS-style masthead).
// Runtime fills this via `buildAtlasTypstSource()` in src/lib/typst-atlas.ts.

#set page(
  paper: "a4",
  margin: (x: 2.0cm, y: 2.2cm),
  header: context {
    if counter(page).get().first() > 1 {
      set text(size: 8pt, fill: rgb("#5b6b7c"))
      grid(
        columns: (1fr, auto),
        [Atlas Academic Publishing · *JOURNAL_SHORT*],
        [*MANUSCRIPT_ID*],
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
      [© *YEAR* Atlas Academic Publishing · *LICENSE*],
      counter(page).display("1"),
    )
  },
)

#set text(font: "Libertinus Serif", size: 10.5pt, fill: rgb("#0b1f33"))
#set par(justify: true, leading: 0.75em)
#set heading(numbering: "1.")

// First-page masthead
#grid(
  columns: (auto, 1fr, auto),
  gutter: 10pt,
  align(horizon)[
    #box(
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
    )
  ],
  align(horizon)[
    #text(size: 12pt, weight: "bold", fill: rgb("#5b6b7c"), tracking: 0.08em)[ATLAS ]
    #text(size: 12pt, weight: "bold", fill: rgb("#0b1f33"), tracking: 0.06em)[*JOURNAL_SHORT*]
    #v(2pt)
    #text(size: 8pt, fill: rgb("#5b6b7c"))[*JOURNAL_TITLE*]
  ],
  align(right + horizon)[
    #text(size: 8pt, weight: "bold")[*MANUSCRIPT_ID*] \
    #text(size: 7.5pt, fill: rgb("#5b6b7c"))[*PUBLISHED*]
  ],
)

#v(8pt)
#grid(
  columns: (1fr, auto),
  gutter: 4pt,
  align(horizon)[#box(width: 100%, height: 2.8pt, fill: rgb("#0f6b6a"))],
  align(horizon)[
    #box(fill: rgb("#0f6b6a"), inset: (x: 7pt, y: 3.5pt))[
      #text(size: 7.5pt, weight: "bold", fill: white, tracking: 0.08em)[Article]
    ]
  ],
)

#v(14pt)
#text(size: 16pt, weight: "bold")[*TITLE*]

#v(10pt)
#text(size: 8.5pt, fill: rgb("#5b6b7c"))[*AUTHORS*]

#v(4pt)
#text(size: 11.5pt)[*AFFILIATIONS*]

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
      #text(size: 8pt)[#text(weight: "bold")[Cite This:] #text(fill: rgb("#0f6b6a"))[Citation]]
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

#v(12pt)
#block(
  width: 100%,
  inset: 10pt,
  fill: rgb("#f5f7fa"),
  radius: 4pt,
  [
    #text(size: 9pt, weight: "bold", fill: rgb("#0f6b6a"))[Abstract]
    #v(4pt)
    #text(size: 9.5pt)[*ABSTRACT*]
  ],
)

#v(8pt)
#text(size: 9pt)[*Keywords:* #text(fill: rgb("#5b6b7c"))[*KEYWORDS*]]

#v(14pt)
*BODY*
