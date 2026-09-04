import { z } from "zod";
import { getAiConfigStatus } from "@/lib/ai/config";
import { getAiTool } from "@/lib/ai/tools";
import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

const bodySchema = z.object({
  toolId: z.string().min(1),
  /** Optional manuscript / submission context once live models are wired. */
  submissionId: z.string().optional(),
  manuscriptId: z.string().optional(),
  notes: z.string().max(4000).optional(),
});

/**
 * Placeholder runner for editorial AI tools.
 * Returns structured sample findings until NAHDA_AI_* / provider keys are set,
 * then this route will call the configured model.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  try {
    const body = bodySchema.parse(await request.json());
    const tool = getAiTool(body.toolId);
    if (!tool) return jsonError("Unknown AI tool", 404);

    const config = getAiConfigStatus();

    if (!config.configured) {
      return jsonOk({
        status: "not_configured" as const,
        tool: {
          id: tool.id,
          title: tool.title,
          stage: tool.stage,
          stageLabel: tool.stageLabel,
        },
        message:
          "AI provider keys are not configured yet. Add them to your environment, then re-run this check.",
        missing: config.missing,
        previewFindings: tool.sampleFindings,
        context: {
          submissionId: body.submissionId ?? null,
          manuscriptId: body.manuscriptId ?? null,
          notes: body.notes?.trim() || null,
        },
      });
    }

    // Provider hooks land here later (OpenAI / Anthropic / Gemini / Azure).
    return jsonOk({
      status: "pending_provider" as const,
      tool: {
        id: tool.id,
        title: tool.title,
        stage: tool.stage,
        stageLabel: tool.stageLabel,
      },
      message: `Provider “${config.provider}” / model “${config.model}” is configured, but the live model adapter is not wired yet. Showing editorial checklist placeholders.`,
      provider: config.provider,
      model: config.model,
      previewFindings: tool.sampleFindings,
      checks: tool.checks,
      context: {
        submissionId: body.submissionId ?? null,
        manuscriptId: body.manuscriptId ?? null,
        notes: body.notes?.trim() || null,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Invalid input");
    }
    console.error("[admin ai run]", err);
    return jsonError("Could not run AI tool", 500);
  }
}
