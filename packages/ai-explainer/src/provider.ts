import type { ExplanationDocument, ExplanationInput } from "./schema.js";

export type ExplainerProviderKind = "local-template" | "remote-llm";

export type ExplainerCapability = {
  providerId: string;
  providerKind: ExplainerProviderKind;
  networkRequired: boolean;
  configured: boolean;
};

export type ExplainerProvider = {
  id: string;
  capability: ExplainerCapability;
  explain(input: unknown): Promise<ExplanationDocument>;
};

export type ExplainerMode = "disabled" | "deterministic";

export function readExplainerMode(
  env: Record<string, string | undefined>,
): ExplainerMode {
  const value = env.EXPLAINER_MODE?.trim() ?? "";
  if (value === "" || value === "deterministic") return "deterministic";
  return "disabled";
}

export type { ExplanationDocument, ExplanationInput };
