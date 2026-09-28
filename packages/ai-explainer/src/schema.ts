import { z } from "zod";
import { EXPLANATION_LIMITS, EXPLANATION_SCHEMA_VERSION } from "./version.js";

const textLimit = EXPLANATION_LIMITS.maxTextLength;

export const explanationFactCategorySchema = z.enum([
  "passive",
  "character-context",
  "calculator",
  "gear",
  "upgrade",
  "craft-target",
  "warning",
  "provenance",
]);

export const explanationSourceKindSchema = z.enum([
  "engine",
  "user-label",
  "provenance",
]);

export const explanationReadinessSchema = z.enum([
  "ready",
  "partial",
  "blocked",
  "unresolved",
]);

export const explanationSectionIdSchema = z.enum([
  "summary",
  "passive-path",
  "build-context",
  "measured-impact",
  "upgrade-comparison",
  "craft-target",
  "limitations",
  "provenance",
]);

const factIdSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9.-]{0,79}$/, "Fact id is not a stable token.");

export const explanationFactSchema = z
  .object({
    id: factIdSchema,
    category: explanationFactCategorySchema,
    label: z.string().min(1).max(textLimit),
    value: z.union([z.string().max(textLimit), z.number().finite()]).optional(),
    unit: z.string().max(16).optional(),
    text: z.string().max(textLimit, "Fact text is too long.").optional(),
    direction: z
      .enum(["positive", "negative", "neutral", "unknown"])
      .optional(),
    sourceKind: explanationSourceKindSchema,
    provenanceRef: z.string().max(80).optional(),
  })
  .strict()
  .refine(
    (fact) => fact.value !== undefined || (fact.text?.length ?? 0) > 0,
    "A fact needs a value or text.",
  );

export const explanationInputSchema = z
  .object({
    schemaVersion: z.literal(EXPLANATION_SCHEMA_VERSION),
    source: z.enum([
      "passive-analysis",
      "upgrade-comparison",
      "craft-target",
      "mixed",
    ]),
    objective: z.string().max(textLimit).optional(),
    readiness: explanationReadinessSchema,
    facts: z
      .array(explanationFactSchema)
      .max(EXPLANATION_LIMITS.maxFacts, "Too many facts."),
    warnings: z
      .array(z.string().max(textLimit, "A warning is too long."))
      .max(EXPLANATION_LIMITS.maxWarnings, "Too many warnings."),
    provenance: z
      .object({
        labels: z.array(z.string().max(textLimit)).max(8),
      })
      .strict(),
  })
  .strict()
  .superRefine((input, context) => {
    const ids = new Set<string>();
    const candidates = new Set<string>();
    for (const fact of input.facts) {
      if (ids.has(fact.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate fact id.",
        });
      }
      ids.add(fact.id);
      const passive = /^passive\.path\.(\d+)\./.exec(fact.id);
      if (passive?.[1]) candidates.add(`passive:${passive[1]}`);
      const upgrade = /^upgrade\.candidate\.([^.]+)/.exec(fact.id);
      if (upgrade?.[1]) candidates.add(`upgrade:${upgrade[1]}`);
    }
    if (candidates.size > EXPLANATION_LIMITS.maxCandidates) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Too many candidates.",
      });
    }
  });

export const explanationProviderSchema = z
  .object({
    providerId: z.string().min(1),
    providerKind: z.enum(["local-template", "remote-llm"]),
    networkRequired: z.boolean(),
    configured: z.boolean(),
    interfaceVersion: z.literal(1),
  })
  .strict();

export const explanationSectionSchema = z
  .object({
    id: explanationSectionIdSchema,
    heading: z.string().min(1),
    paragraphs: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const explanationDocumentSchema = z
  .object({
    schemaVersion: z.literal(EXPLANATION_SCHEMA_VERSION),
    provider: explanationProviderSchema,
    sections: z.array(explanationSectionSchema),
    warnings: z.array(z.string()),
    usedFactIds: z.array(factIdSchema),
  })
  .strict();

export class ExplanationInputError extends Error {
  readonly code = "explanation-input-invalid" as const;

  constructor(message: string) {
    super(message);
    this.name = "ExplanationInputError";
  }
}

export type ExplanationFact = z.infer<typeof explanationFactSchema>;
export type ExplanationInput = z.infer<typeof explanationInputSchema>;
export type ExplanationDocument = z.infer<typeof explanationDocumentSchema>;
export type ExplanationSectionId = z.infer<typeof explanationSectionIdSchema>;

export function parseExplanationInput(value: unknown): ExplanationInput {
  const parsed = explanationInputSchema.safeParse(value);
  if (!parsed.success) {
    throw new ExplanationInputError(
      parsed.error.issues[0]?.message ?? "Invalid explanation input.",
    );
  }
  return parsed.data;
}
