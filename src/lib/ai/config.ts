/**
 * Nahda AI assistant configuration.
 * Wire real providers later via env — the admin UI and /api/admin/ai/* routes
 * already read these flags.
 */

export type AiProviderId = "openai" | "anthropic" | "google" | "azure";

export type AiConfigStatus = {
  configured: boolean;
  provider: AiProviderId | null;
  model: string | null;
  /** True when a key exists but model name is missing. */
  needsModel: boolean;
  missing: string[];
};

function firstNonEmpty(...values: Array<string | undefined>) {
  for (const v of values) {
    const t = v?.trim();
    if (t) return t;
  }
  return null;
}

export function getAiConfigStatus(): AiConfigStatus {
  const openaiKey = firstNonEmpty(process.env.OPENAI_API_KEY);
  const anthropicKey = firstNonEmpty(process.env.ANTHROPIC_API_KEY);
  const googleKey = firstNonEmpty(
    process.env.GOOGLE_AI_API_KEY,
    process.env.GEMINI_API_KEY,
  );
  const azureKey = firstNonEmpty(process.env.AZURE_OPENAI_API_KEY);
  const azureEndpoint = firstNonEmpty(process.env.AZURE_OPENAI_ENDPOINT);

  const providerPref = (
    process.env.NAHDA_AI_PROVIDER || ""
  ).trim().toLowerCase() as AiProviderId | "";

  let provider: AiProviderId | null = null;
  if (providerPref === "openai" && openaiKey) provider = "openai";
  else if (providerPref === "anthropic" && anthropicKey) provider = "anthropic";
  else if (providerPref === "google" && googleKey) provider = "google";
  else if (providerPref === "azure" && azureKey && azureEndpoint)
    provider = "azure";
  else if (openaiKey) provider = "openai";
  else if (anthropicKey) provider = "anthropic";
  else if (googleKey) provider = "google";
  else if (azureKey && azureEndpoint) provider = "azure";

  const model = firstNonEmpty(
    process.env.NAHDA_AI_MODEL,
    provider === "openai" ? process.env.OPENAI_MODEL : undefined,
    provider === "anthropic" ? process.env.ANTHROPIC_MODEL : undefined,
    provider === "google"
      ? process.env.GOOGLE_AI_MODEL || process.env.GEMINI_MODEL
      : undefined,
    provider === "azure" ? process.env.AZURE_OPENAI_DEPLOYMENT : undefined,
  );

  const missing: string[] = [];
  if (!provider) {
    missing.push(
      "OPENAI_API_KEY (or ANTHROPIC_API_KEY / GOOGLE_AI_API_KEY / AZURE_OPENAI_*)",
    );
  }
  if (provider && !model) {
    missing.push("NAHDA_AI_MODEL (or provider-specific model env)");
  }

  return {
    configured: Boolean(provider && model),
    provider,
    model,
    needsModel: Boolean(provider && !model),
    missing,
  };
}
