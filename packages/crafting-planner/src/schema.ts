import { z } from "zod";
import { CANDIDATE_ORDERING } from "./version.js";

export const affixKindSchema = z.enum(["prefix", "suffix", "other"]);

export const planInputSchema = z
  .object({
    base: z.union([
      z.object({ id: z.string().min(1) }).strict(),
      z
        .object({
          name: z.string().min(1),
          itemClass: z.string().min(1),
        })
        .strict(),
    ]),
    itemLevel: z.number().int().min(1),
    targets: z
      .array(
        z.union([
          z
            .object({
              kind: z.literal("stat"),
              statId: z.string().min(1),
              minimumValue: z.number().optional(),
            })
            .strict(),
          z
            .object({
              kind: z.literal("modifier"),
              modifierId: z.string().min(1),
            })
            .strict(),
        ]),
      )
      .min(1),
    options: z
      .object({
        affixKinds: z
          .array(z.enum(["prefix", "suffix"]))
          .min(1)
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const plannerErrorSchema = z
  .object({
    ok: z.literal(false),
    code: z.enum([
      "planner-not-ready",
      "snapshot-unavailable",
      "snapshot-incompatible",
      "unsupported-item-class",
      "base-not-found",
      "base-ambiguous",
      "invalid-item-level",
      "target-not-found",
      "target-ambiguous",
      "unsupported-target",
    ]),
    message: z.string(),
    itemClass: z.string().optional(),
    baseId: z.string().optional(),
    baseName: z.string().optional(),
    compatibilityPolicyVersion: z.number().optional(),
    setup: z.string().optional(),
  })
  .strict();

const evidenceSchema = z
  .object({
    code: z.enum([
      "item-level-satisfied",
      "item-level-failed",
      "spawn-tag-matched",
      "weight-zero",
      "no-matching-tag",
      "spawn-weight-unavailable",
      "domain-unresolved",
      "translation-fallback",
      "special-generation",
      "essence-only",
      "minimum-range-always",
      "minimum-range-possible",
    ]),
    detail: z.string(),
  })
  .strict();

export const candidateSchema = z
  .object({
    modifierId: z.string(),
    name: z.string().nullable(),
    targetIds: z.array(z.string()).min(1),
    affixKind: affixKindSchema,
    generationType: z.string(),
    requiredItemLevel: z.number().nullable(),
    requiredItemLevelPassed: z.boolean(),
    eligibility: z.enum(["eligible", "ineligible", "unresolved"]),
    eligibilityLabel: z.string(),
    reasons: z.array(z.string()),
    evidence: z.array(evidenceSchema),
    stats: z.array(
      z
        .object({
          id: z.string(),
          min: z.number(),
          max: z.number(),
        })
        .strict(),
    ),
    presentation: z.string(),
    presentationStatus: z.enum(["resolved", "fallback"]),
    spawnWeight: z.number().nullable(),
    spawnWeightLabel: z.literal("Source spawn weight"),
    essenceOnly: z.boolean(),
    warnings: z.array(z.string()),
  })
  .strict();

export const planResultSchema = z
  .object({
    ok: z.literal(true),
    status: z.enum(["ready", "partial"]),
    plannerVersion: z.literal(1),
    base: z
      .object({
        id: z.string(),
        name: z.string(),
        itemClass: z.string(),
      })
      .strict(),
    itemLevel: z.number().int().min(1),
    combinationFeasibility: z.enum(["not-requested", "unresolved"]),
    warnings: z.array(z.string()),
    targets: z.array(
      z
        .object({
          id: z.string(),
          kind: z.enum(["stat", "modifier"]),
          label: z.string(),
          minimumValue: z.number().optional(),
          resolution: z.enum([
            "resolved-with-eligible-candidates",
            "resolved-no-eligible-candidates",
            "not-found",
          ]),
          message: z.string().optional(),
          coverage: z
            .object({
              eligible: z.number().int().nonnegative(),
              ineligible: z.number().int().nonnegative(),
              unresolved: z.number().int().nonnegative(),
            })
            .strict(),
        })
        .strict(),
    ),
    candidates: z.array(candidateSchema),
    ordering: z.literal(CANDIDATE_ORDERING),
    provenance: z
      .object({
        snapshotChecksum: z.string(),
        schemaVersion: z.number(),
        sourceCommit: z.string(),
        compatibilityPolicyVersion: z.number(),
        plannerVersion: z.literal(1),
        supportedItemClasses: z.array(z.string()),
      })
      .strict(),
  })
  .strict();
