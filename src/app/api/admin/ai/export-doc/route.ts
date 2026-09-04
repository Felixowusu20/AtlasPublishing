import { z } from "zod";
import {
  reportToDocHtml,
  type AiReviewReport,
} from "@/lib/ai/review-report";
import { jsonError, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

const bodySchema = z.object({
  report: z.object({
    id: z.string(),
    createdAt: z.string(),
    manuscriptId: z.string(),
    title: z.string(),
    journalTitle: z.string(),
    authorName: z.string(),
    authorEmail: z.string(),
    coAuthorEmails: z.array(z.string()),
    fileName: z.string().nullable(),
    providerNote: z.string(),
    overallSummary: z.string(),
    recommendedStatus: z.string(),
    sections: z.array(
      z.object({
        toolId: z.string(),
        title: z.string(),
        stageLabel: z.string(),
        summary: z.string(),
        checks: z.array(z.string()),
        findings: z.array(z.string()),
        editorNote: z.string(),
      }),
    ),
    closingNote: z.string(),
  }),
});

/** Download the AI review as a Word-compatible .doc (HTML). */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    const body = bodySchema.parse(await request.json());
    const report = body.report as AiReviewReport;
    const html = reportToDocHtml(report);
    const safeId = report.manuscriptId.replace(/[^A-Za-z0-9._-]+/g, "_");
    const filename = `Nahda-AI-Review-${safeId}.doc`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[admin ai export-doc]", err);
    return jsonError("Could not export review document", 500);
  }
}
