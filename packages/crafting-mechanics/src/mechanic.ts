import {
  PLANNER_SUPPORTED_ITEM_CLASSES,
  assessPlannerReadiness,
  evaluateSourcePool,
  indexCraftingSnapshot,
  resolveBase,
  type CraftingCompatibilityReport,
  type CraftingSnapshot,
  type ModifierRecord,
} from "@poe2-helper/crafting-data";
import type { z } from "zod";

import {
  craftingItemStateSchema,
  exclusionReasonCodeSchema,
  mechanicErrorSchema,
  mechanicInspectionSchema,
  selectionExplanationSchema,
} from "./schema.js";
import {
  ADD_RANDOM_EXPLICIT_ID,
  CRAFTING_MECHANIC_SEMANTICS_VERSION,
  STATED_RANDOM_MODIFIER_CAP,
} from "./version.js";

const SUPPORTED_CLASSES = new Set<string>(PLANNER_SUPPORTED_ITEM_CLASSES);

export type CraftingItemState = z.infer<typeof craftingItemStateSchema>;
export type MechanicError = z.infer<typeof mechanicErrorSchema>;
export type MechanicInspection = z.infer<typeof mechanicInspectionSchema>;
export type MechanicResponse = MechanicInspection | MechanicError;

const BLOCKERS = [
  "The item text proves an added random modifier. It does not prove the modifier pool.",
  "The currency record has no spawn, weight, prefix, suffix, group, or essence field, and no modifier record names this currency.",
  "Spawn weight is not proven as this currency's selection rule.",
  "Generation-weight rules have no proven formula. Absence is not a multiplier of 1.",
  "The stated cap is two random modifiers. A prefix slot plus a suffix slot is not stated.",
  "Same-id exclusion and same-group exclusivity are not proven, so an item that already has an explicit modifier stays unresolved.",
  "The text states a cap of two random modifiers. It does not say whether a full item consumes the currency.",
  "Empty-pool behavior is not stated.",
  "Greater and Perfect Orb of Augmentation share this text and are not this mechanic.",
] as const;

const POOL_NOTE =
  "Source-pool eligible prefix and suffix ids are listed for inspection. They are not a proven Orb of Augmentation candidate pool.";

const TRANSITION_STATEMENT =
  "Adds one random modifier. The item stays magic. Existing explicit modifiers are not described as removed. This version does not choose the modifier.";

export function assessAddRandomExplicit(
  snapshot: CraftingSnapshot,
  report: CraftingCompatibilityReport,
): MechanicResponse | { ok: true; readiness: "ready-for-state-transition" } {
  const gate = gateReadiness(snapshot, report);
  if (!gate.ok) {
    return gate;
  }
  return { ok: true, readiness: "ready-for-state-transition" };
}

export function validateAddRandomExplicit(
  snapshot: CraftingSnapshot,
  report: CraftingCompatibilityReport,
  input: CraftingItemState,
): MechanicError | { ok: true; state: CraftingItemState } {
  const gate = gateReadiness(snapshot, report);
  if (!gate.ok) {
    return gate;
  }
  const parsed = craftingItemStateSchema.safeParse(input);
  if (!parsed.success) {
    const itemLevelIssue = parsed.error.issues.some((issue) =>
      issue.path.includes("itemLevel"),
    );
    return failure(
      itemLevelIssue ? "item-level-missing" : "unsupported-item-state",
      itemLevelIssue
        ? "Item level must be an integer greater than or equal to 1."
        : "The item state is missing a base, a rarity, or explicit modifier ids.",
    );
  }
  if (parsed.data.rarity !== "magic") {
    return failure(
      "unsupported-rarity",
      "Orb of Augmentation applies to a magic item.",
    );
  }
  const indexed = indexCraftingSnapshot(snapshot);
  const resolved = resolveBase(indexed, { id: parsed.data.baseId });
  if (!resolved.ok || resolved.value.status !== "resolved") {
    return failure("base-unresolved", "The base was not found.");
  }
  const base = resolved.value.base;
  if (
    !SUPPORTED_CLASSES.has(base.itemClass) ||
    !report.supportedItemClasses.includes(base.itemClass)
  ) {
    return failure(
      "unsupported-item-state",
      `${base.itemClass} is not a supported item class.`,
    );
  }
  for (const modifierId of parsed.data.explicitModifierIds) {
    if (!indexed.modById.has(modifierId)) {
      return failure(
        "modifier-identity-unresolved",
        `Modifier ${modifierId} was not found.`,
      );
    }
  }
  if (parsed.data.explicitModifierIds.length >= STATED_RANDOM_MODIFIER_CAP) {
    return failure(
      "no-open-affix-slot",
      "Magic items can have up to two random modifiers. Whether the currency is consumed on a full item is not stated.",
    );
  }
  if (parsed.data.explicitModifierIds.length > 0) {
    return failure(
      "conflict-model-unavailable",
      "An existing explicit modifier needs a conflict rule. Mod-group exclusivity is not approved.",
    );
  }
  return { ok: true, state: parsed.data };
}

export function buildAddRandomExplicitPool(
  snapshot: CraftingSnapshot,
  report: CraftingCompatibilityReport,
  input: CraftingItemState,
): MechanicResponse {
  const valid = validateAddRandomExplicit(snapshot, report, input);
  if (!valid.ok) {
    return valid;
  }
  const indexed = indexCraftingSnapshot(snapshot);
  const sourcePoolEligibleIds: string[] = [];
  const excluded: {
    modifierId: string;
    code: z.infer<typeof exclusionReasonCodeSchema>;
    reason: string;
  }[] = [];
  const unresolved: {
    modifierId: string;
    code: z.infer<typeof exclusionReasonCodeSchema>;
    reason: string;
  }[] = [];
  for (const modifier of snapshot.modifiers) {
    const listed = classifyModifier(indexed, valid.state, modifier);
    if (listed.bucket === "eligible") {
      sourcePoolEligibleIds.push(modifier.id);
    } else if (listed.bucket === "excluded") {
      excluded.push({
        modifierId: modifier.id,
        code: listed.code,
        reason: listed.reason,
      });
    } else {
      unresolved.push({
        modifierId: modifier.id,
        code: listed.code,
        reason: listed.reason,
      });
    }
  }
  sourcePoolEligibleIds.sort(compareId);
  excluded.sort((left, right) => compareId(left.modifierId, right.modifierId));
  unresolved.sort((left, right) =>
    compareId(left.modifierId, right.modifierId),
  );
  return mechanicInspectionSchema.parse({
    ok: true,
    mechanicId: ADD_RANDOM_EXPLICIT_ID,
    semanticsVersion: CRAFTING_MECHANIC_SEMANTICS_VERSION,
    stateTransitionStatus: "ready",
    poolStatus: "partial",
    candidatePoolStatus: "partial",
    conflictStatus: "not-required",
    conflictRuleStatus: "blocked",
    slotRuleStatus: "unproven",
    weightStatus: "unknown",
    spawnWeightStatus: "unproven",
    generationWeightStatus: "unknown",
    selectionRuleStatus: "unproven",
    probabilityStatus: "blocked",
    transition: {
      rarityAfter: "magic",
      explicitCountBefore: 0,
      explicitCountAfter: 1,
      removedModifierIds: [],
      addedModifierId: null,
      statement: TRANSITION_STATEMENT,
    },
    sourcePoolEligibleIds,
    inspectionCandidateIds: sourcePoolEligibleIds,
    excluded,
    unresolved,
    finalMechanicCandidateIds: [],
    poolNote: POOL_NOTE,
    emptyPoolBehavior: "unknown",
    blockers: [...BLOCKERS],
    provenance: {
      snapshotChecksum: snapshot.checksum,
      schemaVersion: snapshot.schemaVersion,
      sourceCommit: snapshot.provenance.commit,
      compatibilityPolicyVersion: report.policyVersion,
      semanticsVersion: CRAFTING_MECHANIC_SEMANTICS_VERSION,
      mechanicId: ADD_RANDOM_EXPLICIT_ID,
    },
  });
}

export function explainAddRandomExplicitSelection(): z.infer<
  typeof selectionExplanationSchema
> {
  return selectionExplanationSchema.parse({
    ok: true,
    selectionRuleStatus: "unproven",
    spawnWeightStatus: "unproven",
    generationWeightStatus: "unknown",
    probabilityStatus: "blocked",
    statement:
      "No selection formula is proven for Orb of Augmentation. Spawn weight is not established as the final weight, and an empty generation-weight list is not a multiplier of 1.",
  });
}

export function explainWeightModel(): MechanicError {
  return failure(
    "weight-model-unavailable",
    "No spawn-weight or generation-weight formula is proven for Orb of Augmentation.",
  );
}

export function craftingStateFromKnownFields(input: {
  baseId: string | null;
  itemLevel: number | null;
  rarity: string | null;
  explicitModifierIds: string[] | null;
}):
  | { ok: true; state: CraftingItemState }
  | { ok: false; code: "state-unresolved"; missing: string[] } {
  const missing: string[] = [];
  if (!input.baseId) {
    missing.push("baseId");
  }
  if (
    input.itemLevel === null ||
    !Number.isInteger(input.itemLevel) ||
    input.itemLevel < 1
  ) {
    missing.push("itemLevel");
  }
  if (
    input.rarity !== "normal" &&
    input.rarity !== "magic" &&
    input.rarity !== "rare" &&
    input.rarity !== "unique"
  ) {
    missing.push("rarity");
  }
  if (!input.explicitModifierIds) {
    missing.push("explicitModifierIds");
  }
  if (missing.length > 0 || !input.baseId || !input.explicitModifierIds) {
    return { ok: false, code: "state-unresolved", missing };
  }
  const itemLevel = input.itemLevel;
  if (itemLevel === null) {
    return { ok: false, code: "state-unresolved", missing: ["itemLevel"] };
  }
  return {
    ok: true,
    state: {
      baseId: input.baseId,
      itemLevel,
      rarity: input.rarity as CraftingItemState["rarity"],
      explicitModifierIds: input.explicitModifierIds,
    },
  };
}

function classifyModifier(
  indexed: ReturnType<typeof indexCraftingSnapshot>,
  state: CraftingItemState,
  modifier: ModifierRecord,
):
  | { bucket: "eligible" }
  | {
      bucket: "excluded" | "unresolved";
      code:
        | "wrong-generation-type"
        | "essence-only-unresolved"
        | "source-pool-ineligible"
        | "source-pool-unresolved"
        | "zero-weight"
        | "generation-weight-unresolved";
      reason: string;
    } {
  if (modifier.affixKind === "other") {
    return {
      bucket: "excluded",
      code: "wrong-generation-type",
      reason:
        "Special generation type. The Augmentation item text does not include it.",
    };
  }
  if (modifier.generationWeightRules.length > 0) {
    return {
      bucket: "unresolved",
      code: "generation-weight-unresolved",
      reason:
        "Generation-weight rules are present. This mechanic has no proven formula for them.",
    };
  }
  if (modifier.isEssenceOnly === true) {
    return {
      bucket: "unresolved",
      code: "essence-only-unresolved",
      reason:
        "Source marks this modifier as essence-only. The Augmentation item text does not say whether that flag excludes it.",
    };
  }
  const pool = evaluateSourcePool(
    indexed,
    {
      baseId: state.baseId,
      modifierId: modifier.id,
      itemLevel: state.itemLevel,
    },
    { applyGenerationWeights: false },
  );
  if (!pool.ok) {
    return {
      bucket: "unresolved",
      code: "source-pool-unresolved",
      reason: pool.error.message,
    };
  }
  if (pool.value.status === "eligible") {
    return { bucket: "eligible" };
  }
  if (pool.value.reason === "spawn-weight-zero") {
    return {
      bucket: "excluded",
      code: "zero-weight",
      reason: "Spawn rule weight is zero on this base.",
    };
  }
  if (pool.value.reason === "item-level") {
    return {
      bucket: "excluded",
      code: "source-pool-ineligible",
      reason: `Required item level is ${modifier.requiredItemLevel}.`,
    };
  }
  if (pool.value.reason === "no-matching-spawn-tag") {
    return {
      bucket: "excluded",
      code: "source-pool-ineligible",
      reason: "No spawn rule matched this base.",
    };
  }
  return {
    bucket: "unresolved",
    code: "source-pool-unresolved",
    reason: "Source-pool eligibility is unresolved for this modifier.",
  };
}

function compareId(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function gateReadiness(
  snapshot: CraftingSnapshot,
  report: CraftingCompatibilityReport,
): MechanicError | { ok: true } {
  const readiness = assessPlannerReadiness(snapshot, report);
  if (!readiness.ok || readiness.value.status !== "ready") {
    return failure(
      "mechanic-not-ready",
      readiness.ok
        ? "Crafting planner readiness is not ready."
        : readiness.error.message,
    );
  }
  return { ok: true };
}

function failure(code: MechanicError["code"], message: string): MechanicError {
  return mechanicErrorSchema.parse({ ok: false, code, message });
}
