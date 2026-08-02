// Nahda Publications — ACS-level Typst journal article template.
// Runtime fills this via `buildAtlasTypstSource()` in src/lib/typst-atlas.ts.
// Brand colors come from each journal's coverColor. Typst only (not LaTeX).

#let primary = rgb("#0B3A53")
#let link-blue = rgb("#3d6f8f")
#let soft-link = rgb("#8eb0c4")
#let soft = rgb("#f2f6f8")
#let wordmark-fill = rgb("#2a5a73")
#let cite-orange = rgb("#e08a2e")
#let oa-gold = rgb("#c4a35a")
#let ink = rgb("#0b1f33")
#let muted = rgb("#5b6b7c")
#let rule = rgb("#c5ced8")
#let serif = ("Libertinus Serif", "New Computer Modern", "Georgia", "Times New Roman")
#let sans = ("Libertinus Sans", "TeX Gyre Heros", "Helvetica", "Arial")

#set page(paper: "a4", margin: (left: 1.7cm, right: 1.7cm, top: 1.55cm, bottom: 2.15cm))
#set text(font: serif, size: 9.5pt, fill: ink)
#set par(justify: true, leading: 0.68em)
#show link: set text(fill: link-blue)

#grid(
  columns: (1fr, auto),
  align(left + horizon)[
    #text(font: serif, size: 26pt, weight: "bold", style: "italic", fill: wordmark-fill)[*JOURNAL_SHORT*]
  ],
  align(right + top)[
    #box(fill: oa-gold, radius: 3pt, inset: (x: 9pt, y: 4pt))[
      #text(font: sans, size: 8pt, weight: "bold", fill: white)[Open Access]
    ]
    #v(5pt)
    #text(font: sans, size: 7pt)[Licensed under CC-BY-4.0]
  ],
)

#v(10pt)
#grid(
  columns: (1fr, auto),
  align(bottom + left)[#text(font: sans, size: 8pt, fill: link-blue)[journals.example / *JOURNAL_SHORT*]],
  align(bottom + right)[
    #box(fill: primary, inset: (x: 11pt, y: 5pt))[
      #text(font: sans, size: 9pt, weight: "bold", fill: white)[Article]
    ]
  ],
)
#line(length: 100%, stroke: 1.6pt + primary)

#v(14pt)
#text(font: sans, size: 17.5pt, weight: "bold")[*TITLE*]

#v(10pt)
#text(size: 10.5pt)[*AUTHORS*]

#v(14pt)
#grid(
  columns: (1.45fr, 1fr),
  gutter: 14pt,
  [
    #text(font: sans, size: 9pt)[*Cite This:* #text(fill: link-blue)[_Journal_ citation]]
    #v(5pt)
    #box(width: 100%, height: 2.4pt, fill: cite-orange)
  ],
  [
    #box(width: 100%, fill: primary, inset: (x: 10pt, y: 7pt))[
      #text(font: sans, size: 9.5pt, weight: "bold", fill: white)[Read Online]
    ]
  ],
)

#v(8pt)
#line(length: 100%, stroke: 0.45pt + primary)
#text(font: sans, size: 11pt, weight: "bold", fill: soft-link)[ACCESS]
#h(10pt)|#h(10pt) Metrics & More #h(10pt)|#h(10pt) Article Recommendations

#v(12pt)
#text(font: sans, size: 8pt, weight: "bold", fill: primary, tracking: 0.12em)[ABSTRACT]
#v(5pt)
#text(size: 9pt)[*ABSTRACT*]

#v(9pt)
#text(font: sans, size: 7pt, weight: "bold", fill: primary)[KEYWORDS] #h(0.55em) *KEYWORDS*

#v(13pt)
#line(length: 100%, stroke: 0.7pt + primary)
#v(10pt)

#columns(2, gutter: 0.55cm)[
  *BODY*
]

// Footer on every page (set via page.footer in buildAtlasTypstSource):
// Left: Nahda logo + © Authors · Right: https://doi.org/… + journal citation
