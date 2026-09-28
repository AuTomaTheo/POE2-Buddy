import { z } from "zod";
import {
  ADD_RANDOM_EXPLICIT_ID,
  CRAFTING_MECHANIC_SEMANTICS_VERSION,
} from "./version.js";

export const raritySchema = z.enum(["normal", "magic", "rare", "unique"]);

export const craftingItemStateSchema = z
  .object({
    baseId: z.string().min(1),
    itemLevel: z.number().int().min(1),
    rarity: raritySchema,
    explicitModifierIds: z.array(z.string().min(1)),
  })
  .strict();

export const mechanicErrorSchema = z
  .object({
    ok: z.literal(false),
    code: z.enum([
      "mechanic-not-ready",
      "unsupported-item-state",
      "unsupported-rarity",
      "item-level-missing",
      "base-unresolved",
      "modifier-identity-unresolved",
      "no-open-affix-slot",
      "conflict-model-unavailable",
      "weight-model-unavailable",
    ]),
    message: z.string(),
  })
  .strict();

export const exclusionReasonCodeSchema = z.enum([
  "wrong-generation-type",
  "essence-only-unresolved",
  "source-pool-ineligible",
  "source-pool-unresolved",
  "zero-weight",
  "existing-mod-conflict",
  "slot-unavailable",
  "group-conflict-unresolved",
  "generation-weight-unresolved",
]);

const listedModifierSchema = z
  .object({
    modifierId: z.string(),
    code: exclusionReasonCodeSchema,
    reason: z.string(),
  })
  .strict();

export const mechanicInspectionSchema = z
  .object({
    ok: z.literal(true),
    mechanicId: z.literal(ADD_RANDOM_EXPLICIT_ID),
    semanticsVersion: z.literal(CRAFTING_MECHANIC_SEMANTICS_VERSION),
    stateTransitionStatus: z.literal("ready"),
    poolStatus: z.literal("partial"),
    candidatePoolStatus: z.literal("partial"),
    conflictStatus: z.literal("not-required"),
    conflictRuleStatus: z.literal("blocked"),
    slotRuleStatus: z.literal("unproven"),
    weightStatus: z.literal("unknown"),
    spawnWeightStatus: z.literal("unproven"),
    generationWeightStatus: z.literal("unknown"),
    selectionRuleStatus: z.literal("unproven"),
    probabilityStatus: z.literal("blocked"),
    transition: z
      .object({
        rarityAfter: z.literal("magic"),
        explicitCountBefore: z.literal(0),
        explicitCountAfter: z.literal(1),
        removedModifierIds: z.tuple([]),
        addedModifierId: z.null(),
        statement: z.string(),
      })
      .strict(),
    sourcePoolEligibleIds: z.array(z.string()),
    inspectionCandidateIds: z.array(z.string()),
    excluded: z.array(listedModifierSchema),
    unresolved: z.array(listedModifierSchema),
    finalMechanicCandidateIds: z.tuple([]),
    poolNote: z.string(),
    emptyPoolBehavior: z.literal("unknown"),
    blockers: z.array(z.string()),
    provenance: z
      .object({
        snapshotChecksum: z.string(),
        schemaVersion: z.number(),
        sourceCommit: z.string(),
        compatibilityPolicyVersion: z.number(),
        semanticsVersion: z.literal(CRAFTING_MECHANIC_SEMANTICS_VERSION),
        mechanicId: z.literal(ADD_RANDOM_EXPLICIT_ID),
      })
      .strict(),
  })
  .strict();

export const selectionExplanationSchema = z
  .object({
    ok: z.literal(true),
    selectionRuleStatus: z.literal("unproven"),
    spawnWeightStatus: z.literal("unproven"),
    generationWeightStatus: z.literal("unknown"),
    probabilityStatus: z.literal("blocked"),
    statement: z.string(),
  })
  .strict();
