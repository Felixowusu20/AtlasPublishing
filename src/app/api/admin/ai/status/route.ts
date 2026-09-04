import { getAiConfigStatus } from "@/lib/ai/config";
import { AI_PIPELINE, AI_TOOLS } from "@/lib/ai/tools";
import { jsonOk, unauthorized } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const config = getAiConfigStatus();
  return jsonOk({
    config,
    pipeline: AI_PIPELINE,
    tools: AI_TOOLS.map((t) => ({
      id: t.id,
      title: t.title,
      stage: t.stage,
      stageLabel: t.stageLabel,
      summary: t.summary,
      checks: t.checks,
      href: t.href,
      hrefLabel: t.hrefLabel,
    })),
    readyCount: config.configured ? AI_TOOLS.length : 0,
    toolCount: AI_TOOLS.length,
  });
}
