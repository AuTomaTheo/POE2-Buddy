export const EXPLANATION_SCHEMA_VERSION = 1 as const;
export const EXPLAINER_INTERFACE_VERSION = 1 as const;

export const EXPLANATION_LIMITS = {
  maxFacts: 48,
  maxTextLength: 240,
  maxWarnings: 12,
  maxCandidates: 5,
} as const;

export const DETERMINISTIC_PROVIDER_ID = "deterministic-fallback" as const;
export const DETERMINISTIC_PROVIDER_KIND = "local-template" as const;
