import { z } from "zod";
import { getAiConfigStatus } from "@/lib/ai/config";
import { buildPlaceholderReviewReport } from "@/lib/ai/review-report";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const bodySchema = z.object({
  submissionId: z.string().min(1),
  fileName: z.string().max(260).optional(),
  editorPrompt: z.string().max(4000).optional(),
});

function emailsFromAuthorsJson(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const email = (row as { email?: unknown }).email;
    if (typeof email === "string" && email.includes("@")) {
      out.push(email.trim());
    }
  }
  return out;
}

/** Run the full AI desk checklist against a submitted paper (placeholder until models are wired). */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    const body = bodySchema.parse(await request.json());
    const submission = await prisma.submission.findFirst({
      where: { id: body.submissionId, deletedAt: null },
      include: {
        journal: { select: { title: true, shortTitle: true } },
        author: { select: { name: true, email: true } },
      },
    });
    if (!submission) return jsonError("Submission not found", 404);

    const config = getAiConfigStatus();
    const report = buildPlaceholderReviewReport({
      manuscriptId: submission.manuscriptId,
      title: submission.title,
      journalTitle: submission.journal.title,
      authorName: submission.author.name,
      authorEmail: submission.author.email,
      coAuthorEmails: emailsFromAuthorsJson(submission.authorsJson),
      fileName: body.fileName ?? null,
      providerConfigured: config.configured,
      provider: config.provider,
      model: config.model,
    });

    // editorPrompt reserved for live model context later
    void body.editorPrompt;

    return jsonOk({
      report,
      steps: report.sections.map((s) => ({
        id: s.toolId,
        title: s.title,
        stageLabel: s.stageLabel,
      })),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[admin ai review]", err);
    return jsonError("Could not run AI review", 500);
  }
}
