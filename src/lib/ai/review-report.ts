import { AI_TOOLS, type AiToolDef } from "@/lib/ai/tools";

export type ReviewDecisionStatus =
  | "TECHNICAL_CHECK"
  | "UNDER_REVIEW"
  | "MAJOR_REVISION"
  | "MINOR_REVISION"
  | "ACCEPTED"
  | "REJECTED";

export type ReviewSection = {
  toolId: string;
  title: string;
  stageLabel: string;
  summary: string;
  checks: string[];
  findings: string[];
  editorNote: string;
};

export type AiReviewReport = {
  id: string;
  createdAt: string;
  manuscriptId: string;
  title: string;
  journalTitle: string;
  authorName: string;
  authorEmail: string;
  coAuthorEmails: string[];
  fileName: string | null;
  providerNote: string;
  overallSummary: string;
  recommendedStatus: ReviewDecisionStatus;
  sections: ReviewSection[];
  closingNote: string;
};

export const REVIEW_STATUS_OPTIONS: {
  value: ReviewDecisionStatus;
  label: string;
  hint: string;
}[] = [
  {
    value: "TECHNICAL_CHECK",
    label: "Technical check",
    hint: "Formatting / completeness issues before peer review",
  },
  {
    value: "UNDER_REVIEW",
    label: "Under review",
    hint: "Continue peer review; share interim notes",
  },
  {
    value: "MINOR_REVISION",
    label: "Minor revision",
    hint: "Small fixes required before acceptance",
  },
  {
    value: "MAJOR_REVISION",
    label: "Major revision",
    hint: "Substantial changes required",
  },
  {
    value: "ACCEPTED",
    label: "Accepted",
    hint: "Ready for APC / production",
  },
  {
    value: "REJECTED",
    label: "Rejected",
    hint: "Not suitable for this journal",
  },
];

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function noteForTool(tool: AiToolDef): string {
  switch (tool.id) {
    case "manuscript_triage":
      return "Please confirm scope fit and complete any missing front-matter before assigning reviewers.";
    case "ethics_screen":
      return "Verify COI / funding statements and resolve any integrity flags before peer review.";
    case "reviewer_match":
      return "Invite 2–3 matched reviewers; document exclusions for conflicts.";
    case "review_synthesis":
      return "Consolidate reviewer themes into a single author-facing decision letter.";
    case "revision_checklist":
      return "Ask the author for a point-by-point response against each open item.";
    case "typeset_cleanup":
      return "Production: fix heading hierarchy and empty figure slots before PDF generation.";
    case "reference_linker":
      return "Complete DOI lookup for incomplete references prior to publish.";
    case "abstract_assist":
      return "Offer a tightened abstract / plain-language option for author approval.";
    case "figure_a11y":
      return "Add alt text and clarify captions for the HTML article view.";
    case "issue_blurb":
      return "Draft TOC blurb once the paper is accepted into an issue.";
    case "apc_waiver_notes":
      return "If a waiver is requested, attach the internal rationale to Finances.";
    default:
      return "Editor to confirm and include in the author letter as needed.";
  }
}

export function buildPlaceholderReviewReport(input: {
  manuscriptId: string;
  title: string;
  journalTitle: string;
  authorName: string;
  authorEmail: string;
  coAuthorEmails?: string[];
  fileName?: string | null;
  providerConfigured: boolean;
  provider?: string | null;
  model?: string | null;
}): AiReviewReport {
  const sections: ReviewSection[] = AI_TOOLS.map((tool) => ({
    toolId: tool.id,
    title: tool.title,
    stageLabel: tool.stageLabel,
    summary: tool.summary,
    checks: tool.checks,
    findings: tool.sampleFindings,
    editorNote: noteForTool(tool),
  }));

  const providerNote = input.providerConfigured
    ? `Provider “${input.provider}” / model “${input.model}” is configured. Live model adapter pending — showing structured editorial placeholders.`
    : "AI provider keys are not configured yet. This is a structured editorial placeholder report so the desk flow can be practiced end-to-end.";

  return {
    id: `ai-review-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    manuscriptId: input.manuscriptId,
    title: input.title,
    journalTitle: input.journalTitle,
    authorName: input.authorName,
    authorEmail: input.authorEmail,
    coAuthorEmails: (input.coAuthorEmails ?? []).filter(
      (e) => e.toLowerCase() !== input.authorEmail.toLowerCase(),
    ),
    fileName: input.fileName ?? null,
    providerNote,
    overallSummary:
      "Nahda AI desk review completed across intake, peer review, revision, production, publish, and APC checks. Editors should confirm every finding before sending to authors.",
    recommendedStatus: "MINOR_REVISION",
    sections,
    closingNote:
      "This letter was prepared with Nahda AI Assist. A human editor must approve the decision status and wording before it is sent to the corresponding author.",
  };
}

export function reportToPlainMessage(report: AiReviewReport): string {
  const lines: string[] = [
    `Nahda AI editorial review — ${report.manuscriptId}`,
    `Title: ${report.title}`,
    `Journal: ${report.journalTitle}`,
    `Author: ${report.authorName} <${report.authorEmail}>`,
    report.fileName ? `Uploaded file: ${report.fileName}` : "",
    "",
    report.overallSummary,
    "",
    `Recommended status: ${report.recommendedStatus}`,
    "",
  ];

  for (const section of report.sections) {
    lines.push(`## ${section.stageLabel}: ${section.title}`);
    lines.push(section.summary);
    lines.push("Checks:");
    for (const c of section.checks) lines.push(`- ${c}`);
    lines.push("Findings:");
    for (const f of section.findings) lines.push(`- ${f}`);
    lines.push(`Editor note: ${section.editorNote}`);
    lines.push("");
  }

  lines.push(report.closingNote);
  lines.push("");
  lines.push(report.providerNote);
  return lines.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n");
}

/** Word opens HTML saved as .doc reliably for editorial letters. */
export function reportToDocHtml(report: AiReviewReport): string {
  const sectionsHtml = report.sections
    .map((section) => {
      const checks = section.checks
        .map((c) => `<li>${escapeHtml(c)}</li>`)
        .join("");
      const findings = section.findings
        .map(
          (f) =>
            `<li style="margin:0 0 6px">${escapeHtml(f)}</li>`,
        )
        .join("");
      return `
      <div style="margin:0 0 22px;padding:0 0 16px;border-bottom:1px solid #d7dee7">
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#1e6847;font-weight:700">
          ${escapeHtml(section.stageLabel)}
        </p>
        <h2 style="margin:0 0 8px;font-size:16px;color:#0b1f33">${escapeHtml(section.title)}</h2>
        <p style="margin:0 0 10px;color:#5b6b7c;font-size:12.5px">${escapeHtml(section.summary)}</p>
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#0b1f33">Checks</p>
        <ul style="margin:0 0 10px;padding-left:18px;color:#0b1f33;font-size:12.5px">${checks}</ul>
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#0b1f33">Findings</p>
        <ul style="margin:0 0 10px;padding-left:18px;color:#0b1f33;font-size:12.5px">${findings}</ul>
        <p style="margin:0;font-size:12.5px;color:#0b1f33">
          <strong>Editor note:</strong> ${escapeHtml(section.editorNote)}
        </p>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Nahda AI Review — ${escapeHtml(report.manuscriptId)}</title>
</head>
<body style="margin:0;padding:32px;font-family:Helvetica,Arial,sans-serif;color:#0b1f33;background:#fff">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;margin:0 auto">
    <tr>
      <td style="padding:0 0 18px;border-bottom:3px solid #1e6847">
        <p style="margin:0;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#1e6847;font-weight:700">
          Nahda Publications · Editorial intelligence
        </p>
        <h1 style="margin:8px 0 0;font-size:22px">AI desk review report</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:18px 0">
        <p style="margin:0 0 6px"><strong>Manuscript ID:</strong> ${escapeHtml(report.manuscriptId)}</p>
        <p style="margin:0 0 6px"><strong>Title:</strong> ${escapeHtml(report.title)}</p>
        <p style="margin:0 0 6px"><strong>Journal:</strong> ${escapeHtml(report.journalTitle)}</p>
        <p style="margin:0 0 6px"><strong>Author:</strong> ${escapeHtml(report.authorName)} &lt;${escapeHtml(report.authorEmail)}&gt;</p>
        ${
          report.fileName
            ? `<p style="margin:0 0 6px"><strong>Uploaded file:</strong> ${escapeHtml(report.fileName)}</p>`
            : ""
        }
        <p style="margin:0 0 6px"><strong>Prepared:</strong> ${escapeHtml(new Date(report.createdAt).toUTCString())}</p>
        <p style="margin:12px 0 0;padding:10px 12px;background:#e6f2ec;border-radius:8px;font-size:12.5px">
          <strong>Recommended status:</strong> ${escapeHtml(report.recommendedStatus)}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 0 16px">
        <p style="margin:0;font-size:13px;line-height:1.55">${escapeHtml(report.overallSummary)}</p>
      </td>
    </tr>
    <tr><td>${sectionsHtml}</td></tr>
    <tr>
      <td style="padding:8px 0 0">
        <p style="margin:0 0 10px;font-size:12.5px;line-height:1.5">${escapeHtml(report.closingNote)}</p>
        <p style="margin:0;font-size:11px;color:#5b6b7c">${escapeHtml(report.providerNote)}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
