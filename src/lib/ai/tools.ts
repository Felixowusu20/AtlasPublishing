/**
 * Editorial AI tools mapped to Nahda’s publishing house workflow.
 * Providers are plugged in later; tools + API contracts are stable now.
 */

export type AiPipelineStage =
  | "intake"
  | "peer_review"
  | "revision"
  | "production"
  | "publish"
  | "finance";

export type AiToolId =
  | "manuscript_triage"
  | "ethics_screen"
  | "reviewer_match"
  | "review_synthesis"
  | "revision_checklist"
  | "typeset_cleanup"
  | "reference_linker"
  | "abstract_assist"
  | "figure_a11y"
  | "issue_blurb"
  | "apc_waiver_notes";

export type AiToolDef = {
  id: AiToolId;
  title: string;
  stage: AiPipelineStage;
  stageLabel: string;
  summary: string;
  checks: string[];
  href: string;
  hrefLabel: string;
  /** Placeholder findings shown until a live model is wired. */
  sampleFindings: string[];
};

export const AI_PIPELINE: {
  id: AiPipelineStage;
  label: string;
  blurb: string;
}[] = [
  {
    id: "intake",
    label: "1 · Intake",
    blurb: "Screen new submissions before editorial assignment.",
  },
  {
    id: "peer_review",
    label: "2 · Peer review",
    blurb: "Match reviewers and draft decision notes from reports.",
  },
  {
    id: "revision",
    label: "3 · Revision",
    blurb: "Track whether author responses close reviewer comments.",
  },
  {
    id: "production",
    label: "4 · Production",
    blurb: "Clean Word imports, captions, references, and accessibility.",
  },
  {
    id: "publish",
    label: "5 · Publish",
    blurb: "Issue packaging, abstracts, and reader-facing blurbs.",
  },
  {
    id: "finance",
    label: "6 · APC",
    blurb: "Support waiver decisions with clear editorial notes.",
  },
];

export const AI_TOOLS: AiToolDef[] = [
  {
    id: "manuscript_triage",
    title: "Manuscript triage",
    stage: "intake",
    stageLabel: "Intake",
    summary:
      "Flag scope fit, missing sections, word-count outliers, and incomplete metadata at submission.",
    checks: [
      "Required sections present",
      "Abstract / keywords quality",
      "Scope vs journal aims",
      "Word-count band",
    ],
    href: "/admin/submissions",
    hrefLabel: "Open inbox",
    sampleFindings: [
      "Methods section appears thin relative to Results.",
      "Keywords overlap heavily with the title — suggest 3 distinct terms.",
      "No conflict-of-interest statement detected in the cover material.",
    ],
  },
  {
    id: "ethics_screen",
    title: "Ethics & integrity screen",
    stage: "intake",
    stageLabel: "Intake",
    summary:
      "Surface COI gaps, possible duplicate-submission signals, and text-reuse risk for human review.",
    checks: [
      "COI / funding statements",
      "Human/animal ethics cues",
      "Unusual reuse patterns",
      "Author list consistency",
    ],
    href: "/admin/submissions",
    hrefLabel: "Open inbox",
    sampleFindings: [
      "Funding acknowledgement present; COI statement missing.",
      "Title similarity to a prior Nahda submission — verify distinct manuscript ID.",
      "Figure captions reference “unpublished data” without ethics note.",
    ],
  },
  {
    id: "reviewer_match",
    title: "Reviewer matching",
    stage: "peer_review",
    stageLabel: "Peer review",
    summary:
      "Suggest reviewers from keywords, journal roster, workload, and obvious conflicts.",
    checks: [
      "Keyword / method fit",
      "Workload balance",
      "Affiliation conflicts",
      "Prior review history",
    ],
    href: "/admin/reviewers",
    hrefLabel: "Open reviewers",
    sampleFindings: [
      "3 roster matches on “cloud resilience” + systems evaluation.",
      "Exclude co-authors sharing the submitting institution.",
      "Prefer reviewers with <2 open assignments this month.",
    ],
  },
  {
    id: "review_synthesis",
    title: "Peer-review synthesis",
    stage: "peer_review",
    stageLabel: "Peer review",
    summary:
      "Merge multiple reviewer reports into a structured editor decision draft (human signs off).",
    checks: [
      "Major vs minor themes",
      "Contradictions between reviews",
      "Decision recommendation",
      "Author-facing summary",
    ],
    href: "/admin/submissions",
    hrefLabel: "Open inbox",
    sampleFindings: [
      "Both reviewers request clearer threat-model assumptions.",
      "R2 rejects novelty; R1 accepts with major revisions — flag for EiC.",
      "Draft decision: Major revision with a 4-week window.",
    ],
  },
  {
    id: "revision_checklist",
    title: "Revision checklist",
    stage: "revision",
    stageLabel: "Revision",
    summary:
      "Turn editor/reviewer comments into a point-by-point checklist against the revised manuscript.",
    checks: [
      "Comment coverage",
      "Unaddressed items",
      "Response letter gaps",
      "New issues introduced",
    ],
    href: "/admin/manuscripts",
    hrefLabel: "Open manuscripts",
    sampleFindings: [
      "Comment R1-3 (ablation study) not clearly answered in the response letter.",
      "Figure 2 updated; in-text callouts still cite the old panel labels.",
      "2 of 11 revision points still open.",
    ],
  },
  {
    id: "typeset_cleanup",
    title: "Typeset & import cleanup",
    stage: "production",
    stageLabel: "Production",
    summary:
      "Detect broken heading levels, empty figure slots, table grid issues, and Word residue after import.",
    checks: [
      "Heading hierarchy",
      "Empty figure placeholders",
      "Table structure",
      "Stray Word styles",
    ],
    href: "/admin/publishedArticles",
    hrefLabel: "Open publish queue",
    sampleFindings: [
      "Figure 1 placeholder has no image asset yet.",
      "H3 appears before any H2 in section 4.",
      "Table 2 missing a caption / table-full wrapper.",
    ],
  },
  {
    id: "reference_linker",
    title: "Reference linker",
    stage: "production",
    stageLabel: "Production",
    summary:
      "Find incomplete citations and prepare Crossref/DOI lookup candidates before publish.",
    checks: [
      "Missing DOIs",
      "Incomplete citations",
      "Year / venue gaps",
      "Duplicate bibliography entries",
    ],
    href: "/admin/publishedArticles",
    hrefLabel: "Open publish queue",
    sampleFindings: [
      "8 references lack DOIs — queue Crossref lookup.",
      "Two bibliography entries appear to be duplicates.",
      "In-text citation [17] has no matching reference list item.",
    ],
  },
  {
    id: "abstract_assist",
    title: "Abstract & plain-language assist",
    stage: "publish",
    stageLabel: "Publish",
    summary:
      "Draft structured abstract and plain-language summary options for editor approval.",
    checks: [
      "Structured abstract slots",
      "Plain-language readability",
      "Overclaiming language",
      "Keyword alignment",
    ],
    href: "/admin/publishedArticles",
    hrefLabel: "Open publish queue",
    sampleFindings: [
      "Results sentence buries the primary metric — lead with the effect size.",
      "Plain-language draft ready for author confirmation.",
      "Avoid absolute claims (“solves”) — soften to “improves under …”.",
    ],
  },
  {
    id: "figure_a11y",
    title: "Figure accessibility",
    stage: "production",
    stageLabel: "Production",
    summary:
      "Suggest alt text, caption quality fixes, and contrast/readability issues for figures.",
    checks: [
      "Missing alt text",
      "Caption clarity",
      "Panel labeling",
      "Color-only encoding",
    ],
    href: "/admin/publishedArticles",
    hrefLabel: "Open publish queue",
    sampleFindings: [
      "Figure 1 has no alt text for the online HTML view.",
      "Caption restates the title; add what the axes show.",
      "Legend relies on red/green alone — add pattern or labels.",
    ],
  },
  {
    id: "issue_blurb",
    title: "Issue TOC & blurbs",
    stage: "publish",
    stageLabel: "Publish",
    summary:
      "Draft table-of-contents blurbs and issue highlights from accepted papers.",
    checks: [
      "One-line TOC blurb",
      "Issue highlight reel",
      "Keyword clustering",
      "Guest-editor note seed",
    ],
    href: "/admin/articles",
    hrefLabel: "Open articles",
    sampleFindings: [
      "Cluster 3 papers under “adaptive cloud systems”.",
      "TOC blurb draft ready for the EiC highlight box.",
      "Suggest featuring the methods paper first in the issue order.",
    ],
  },
  {
    id: "apc_waiver_notes",
    title: "APC waiver notes",
    stage: "finance",
    stageLabel: "APC",
    summary:
      "Draft transparent waiver / discount rationale notes for finance and author correspondence.",
    checks: [
      "Eligibility cues",
      "Policy alignment",
      "Author communication draft",
      "Internal decision note",
    ],
    href: "/admin/finances",
    hrefLabel: "Open finances",
    sampleFindings: [
      "Author listed an LMIC affiliation — check waiver policy tier.",
      "Draft note: 50% APC reduction pending invoice confirmation.",
      "Remind author APC is due before production typesetting.",
    ],
  },
];

export function getAiTool(id: string): AiToolDef | undefined {
  return AI_TOOLS.find((t) => t.id === id);
}
