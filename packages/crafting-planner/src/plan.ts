import {
  CRAFTING_COMPATIBILITY_POLICY_VERSION,
  PLANNER_SUPPORTED_ITEM_CLASSES,
  assessPlannerReadiness,
  evaluateSourcePool,
  indexCraftingSnapshot,
  presentModifier,
  resolveBase,
  type CraftingCompatibilityReport,
  type CraftingSnapshot,
  type EligibilityResult,
  type IndexedCraftingData,
  type ModifierRecord,
} from "@poe2-helper/crafting-data";
import type { z } from "zod";

import {
  planInputSchema,
  planResultSchema,
  plannerErrorSchema,
} from "./schema.js";
import {
  CANDIDATE_ORDERING,
  COEXISTENCE_WARNING,
  CRAFTING_PLANNER_VERSION,
  INDIVIDUAL_ONLY_WARNING,
  NO_ELIGIBLE_MESSAGE,
  SPAWN_WEIGHT_WARNING,
} from "./version.js";

const SUPPORTED_CLASSES = new Set<string>(PLANNER_SUPPORTED_ITEM_CLASSES);

export type PlanInput = z.infer<typeof planInputSchema>;
export type PlanResult = z.infer<typeof planResultSchema>;
export type PlannerError = z.infer<typeof plannerErrorSchema>;
export type PlannerResponse = PlanResult | PlannerError;

type NormalizedTarget = {
  id: string;
  kind: "stat" | "modifier";
  label: string;
  statId?: string;
  modifierId?: string;
  minimumValue?: number;
};

type Evidence = PlanResult["candidates"][number]["evidence"][number];

export function planCraftTargets(
  snapshot: CraftingSnapshot,
  report: CraftingCompatibilityReport,
  input: PlanInput,
): PlannerResponse {
  const readiness = assessPlannerReadiness(snapshot, report);
  if (!readiness.ok || readiness.value.status !== "ready") {
    return plannerErrorSchema.parse({
      ok: false,
      code: "planner-not-ready",
      message: readiness.ok
        ? "Crafting planner readiness is not ready."
        : readiness.error.message,
      compatibilityPolicyVersion: CRAFTING_COMPATIBILITY_POLICY_VERSION,
    });
  }

  const parsed = planInputSchema.safeParse(input);
  if (!parsed.success) {
    const itemLevelIssue = parsed.error.issues.some((issue) =>
      issue.path.includes("itemLevel"),
    );
    return plannerErrorSchema.parse({
      ok: false,
      code: itemLevelIssue ? "invalid-item-level" : "unsupported-target",
      message: itemLevelIssue
        ? "Item level must be an integer greater than or equal to 1."
        : "The target input is not a stat id or a modifier id.",
    });
  }

  const indexed = indexCraftingSnapshot(snapshot);
  const baseQuery =
    "id" in parsed.data.base
      ? { id: parsed.data.base.id }
      : {
          name: parsed.data.base.name,
          itemClass: parsed.data.base.itemClass,
        };
  const resolved = resolveBase(indexed, baseQuery);
  if (!resolved.ok) {
    return plannerErrorSchema.parse({
      ok: false,
      code: "base-not-found",
      message: resolved.error.message,
    });
  }
  if (resolved.value.status === "not-found") {
    return plannerErrorSchema.parse({
      ok: false,
      code: "base-not-found",
      message: "The base was not found.",
      baseId: "id" in parsed.data.base ? parsed.data.base.id : undefined,
      baseName: "name" in parsed.data.base ? parsed.data.base.name : undefined,
    });
  }
  if (resolved.value.status === "ambiguous") {
    return plannerErrorSchema.parse({
      ok: false,
      code: "base-ambiguous",
      message: `Base name matches more than one record: ${resolved.value.candidateIds.join(", ")}.`,
    });
  }

  const base = resolved.value.base;
  const approvedClasses = new Set(report.supportedItemClasses);
  if (
    !SUPPORTED_CLASSES.has(base.itemClass) ||
    !approvedClasses.has(base.itemClass)
  ) {
    return plannerErrorSchema.parse({
      ok: false,
      code: "unsupported-item-class",
      message: `${base.itemClass} is not a supported item class. No nearby class is used.`,
      itemClass: base.itemClass,
      baseId: base.id,
      baseName: base.name,
      compatibilityPolicyVersion: report.policyVersion,
    });
  }

  const targets = dedupeTargets(parsed.data.targets);
  const affixKinds = parsed.data.options?.affixKinds;
  const byModifier = new Map<
    string,
    { modifier: ModifierRecord; targetIds: string[]; notes: Evidence[] }
  >();
  const missing = new Set<string>();

  for (const target of targets) {
    const match = modifiersForTarget(indexed, target, affixKinds);
    if (match.outcome === "not-found") {
      missing.add(target.id);
      continue;
    }
    for (const modifier of match.modifiers) {
      const existing = byModifier.get(modifier.id);
      const notes = notesForTarget(modifier, target);
      if (existing) {
        existing.targetIds.push(target.id);
        existing.notes.push(...notes);
      } else {
        byModifier.set(modifier.id, {
          modifier,
          targetIds: [target.id],
          notes,
        });
      }
    }
  }

  const candidates = [...byModifier.values()]
    .map((entry) =>
      toCandidate(
        indexed,
        base.id,
        parsed.data.itemLevel,
        entry.modifier,
        uniqueSorted(entry.targetIds),
        entry.notes,
      ),
    )
    .sort(compareCandidates);

  const targetRows: PlanResult["targets"] = [];
  for (const target of targets) {
    if (missing.has(target.id)) {
      targetRows.push({
        id: target.id,
        kind: target.kind,
        label: target.label,
        ...(target.minimumValue !== undefined
          ? { minimumValue: target.minimumValue }
          : {}),
        resolution: "not-found",
        message:
          target.kind === "stat"
            ? `Stat id ${target.statId} was not found.`
            : `Modifier ${target.modifierId} was not found.`,
        coverage: { eligible: 0, ineligible: 0, unresolved: 0 },
      });
      continue;
    }
    const related = candidates.filter((candidate) =>
      candidate.targetIds.includes(target.id),
    );
    const coverage = {
      eligible: related.filter(
        (candidate) => candidate.eligibility === "eligible",
      ).length,
      ineligible: related.filter(
        (candidate) => candidate.eligibility === "ineligible",
      ).length,
      unresolved: related.filter(
        (candidate) => candidate.eligibility === "unresolved",
      ).length,
    };
    const hiddenSpecial =
      target.kind === "stat" &&
      related.length === 0 &&
      indexed.snapshot.modifiers.some(
        (modifier) =>
          modifier.affixKind === "other" &&
          modifier.stats.some((stat) => stat.id === target.statId),
      );
    targetRows.push({
      id: target.id,
      kind: target.kind,
      label: target.label,
      ...(target.minimumValue !== undefined
        ? { minimumValue: target.minimumValue }
        : {}),
      resolution:
        coverage.eligible > 0
          ? "resolved-with-eligible-candidates"
          : "resolved-no-eligible-candidates",
      ...(coverage.eligible === 0
        ? {
            message: hiddenSpecial
              ? `${NO_ELIGIBLE_MESSAGE} Special generation types that contain this stat are not part of the default normal-affix target pool. Target the modifier id directly to see them.`
              : NO_ELIGIBLE_MESSAGE,
          }
        : {}),
      coverage,
    });
  }

  const warnings = [SPAWN_WEIGHT_WARNING];
  if (targets.length > 1) {
    warnings.unshift(COEXISTENCE_WARNING, INDIVIDUAL_ONLY_WARNING);
  }

  return planResultSchema.parse({
    ok: true,
    status: targetRows.every(
      (target) => target.resolution === "resolved-with-eligible-candidates",
    )
      ? "ready"
      : "partial",
    plannerVersion: CRAFTING_PLANNER_VERSION,
    base: { id: base.id, name: base.name, itemClass: base.itemClass },
    itemLevel: parsed.data.itemLevel,
    combinationFeasibility: targets.length > 1 ? "unresolved" : "not-requested",
    warnings,
    targets: targetRows,
    candidates,
    ordering: CANDIDATE_ORDERING,
    provenance: {
      snapshotChecksum: snapshot.checksum,
      schemaVersion: snapshot.schemaVersion,
      sourceCommit: snapshot.provenance.commit,
      compatibilityPolicyVersion: report.policyVersion,
      plannerVersion: CRAFTING_PLANNER_VERSION,
      supportedItemClasses: [...report.supportedItemClasses],
    },
  });
}

function dedupeTargets(targets: PlanInput["targets"]): NormalizedTarget[] {
  const stats = new Map<string, { statId: string; minimumValue?: number }>();
  const modifiers = new Map<string, string>();
  for (const target of targets) {
    if (target.kind === "modifier") {
      modifiers.set(target.modifierId, target.modifierId);
      continue;
    }
    const existing = stats.get(target.statId);
    const minimumValue = stricterMinimum(
      existing?.minimumValue,
      target.minimumValue,
    );
    stats.set(target.statId, {
      statId: target.statId,
      ...(minimumValue !== undefined ? { minimumValue } : {}),
    });
  }
  const normalized: NormalizedTarget[] = [];
  for (const stat of [...stats.values()].sort((left, right) =>
    compareId(left.statId, right.statId),
  )) {
    normalized.push({
      id:
        stat.minimumValue !== undefined
          ? `stat:${stat.statId}:min:${stat.minimumValue}`
          : `stat:${stat.statId}`,
      kind: "stat",
      label: stat.statId,
      statId: stat.statId,
      ...(stat.minimumValue !== undefined
        ? { minimumValue: stat.minimumValue }
        : {}),
    });
  }
  for (const modifierId of [...modifiers.keys()].sort(compareId)) {
    normalized.push({
      id: `modifier:${modifierId}`,
      kind: "modifier",
      label: modifierId,
      modifierId,
    });
  }
  return normalized;
}

function stricterMinimum(
  left: number | undefined,
  right: number | undefined,
): number | undefined {
  if (left === undefined) {
    return right;
  }
  if (right === undefined) {
    return left;
  }
  return Math.max(left, right);
}

function modifiersForTarget(
  indexed: IndexedCraftingData,
  target: NormalizedTarget,
  affixKinds: ("prefix" | "suffix")[] | undefined,
):
  | { outcome: "not-found" }
  | { outcome: "matched"; modifiers: ModifierRecord[] } {
  if (target.kind === "modifier") {
    const modifier = indexed.modById.get(target.modifierId ?? "");
    return modifier
      ? { outcome: "matched", modifiers: [modifier] }
      : { outcome: "not-found" };
  }
  const statId = target.statId ?? "";
  const holders = indexed.snapshot.modifiers.filter((modifier) =>
    modifier.stats.some((stat) => stat.id === statId),
  );
  if (holders.length === 0) {
    return { outcome: "not-found" };
  }
  const modifiers = holders.filter((modifier) => {
    if (modifier.affixKind === "other") {
      return false;
    }
    if (affixKinds && !affixKinds.includes(modifier.affixKind)) {
      return false;
    }
    const minimum = target.minimumValue;
    if (minimum === undefined) {
      return true;
    }
    return modifier.stats.some(
      (stat) => stat.id === statId && stat.max >= minimum,
    );
  });
  return { outcome: "matched", modifiers };
}

function notesForTarget(
  modifier: ModifierRecord,
  target: NormalizedTarget,
): Evidence[] {
  if (target.kind !== "stat" || target.minimumValue === undefined) {
    return [];
  }
  const stat = modifier.stats.find((entry) => entry.id === target.statId);
  if (!stat || stat.max < target.minimumValue) {
    return [];
  }
  if (stat.min >= target.minimumValue) {
    return [
      {
        code: "minimum-range-always",
        detail:
          "Every value in the source range is at least the requested minimum. This is not a roll probability.",
      },
    ];
  }
  return [
    {
      code: "minimum-range-possible",
      detail:
        "This modifier can roll a value that meets the target. It is not guaranteed to roll that value.",
    },
  ];
}

function toCandidate(
  indexed: IndexedCraftingData,
  baseId: string,
  itemLevel: number,
  modifier: ModifierRecord,
  targetIds: string[],
  notes: Evidence[],
): PlanResult["candidates"][number] {
  const pool = evaluateSourcePool(
    indexed,
    { baseId, modifierId: modifier.id, itemLevel },
    { applyGenerationWeights: false },
  );
  const eligibility: EligibilityResult = pool.ok
    ? pool.value
    : {
        status: "unresolved",
        reason: "eligibility-unresolved",
        matchedSpawnTag: null,
        matchedSpawnWeight: null,
        matchedGenerationTag: null,
        matchedGenerationWeight: null,
      };
  const presented = presentModifier(indexed, modifier.id);
  const presentation =
    presented.ok && presented.value.presentation === "resolved"
      ? "resolved"
      : "fallback";
  const text = presented.ok
    ? presented.value.text
    : `${modifier.id}\ntranslation unresolved`;
  const evidence = evidenceFor(
    modifier,
    itemLevel,
    eligibility,
    presentation,
    notes,
  );
  const warnings: string[] = [];
  if (modifier.affixKind === "other") {
    warnings.push(
      "Special generation type. This planner does not model how to obtain this modifier.",
    );
  }
  if (modifier.isEssenceOnly === true) {
    warnings.push(
      "Source marks this modifier as essence-only. The current planner does not model the mechanic that grants it.",
    );
  }
  for (const note of notes) {
    warnings.push(note.detail);
  }
  const passed = itemLevel >= modifier.requiredItemLevel;
  return {
    modifierId: modifier.id,
    name: modifier.name,
    targetIds,
    affixKind: modifier.affixKind,
    generationType: modifier.generationType,
    requiredItemLevel: modifier.requiredItemLevel,
    requiredItemLevelPassed: passed,
    eligibility: eligibility.status,
    eligibilityLabel: labelFor(eligibility.status),
    reasons: evidence.map((entry) => entry.detail),
    evidence,
    stats: modifier.stats.map((stat) => ({
      id: stat.id,
      min: stat.min,
      max: stat.max,
    })),
    presentation: text,
    presentationStatus: presentation,
    spawnWeight: eligibility.matchedSpawnWeight,
    spawnWeightLabel: "Source spawn weight",
    essenceOnly: modifier.isEssenceOnly === true,
    warnings,
  };
}

function evidenceFor(
  modifier: ModifierRecord,
  itemLevel: number,
  eligibility: EligibilityResult,
  presentation: "resolved" | "fallback",
  notes: Evidence[],
): Evidence[] {
  const evidence: Evidence[] = [];
  if (itemLevel >= modifier.requiredItemLevel) {
    evidence.push({
      code: "item-level-satisfied",
      detail: `Required item level ${modifier.requiredItemLevel} is met by item level ${itemLevel}.`,
    });
  } else {
    evidence.push({
      code: "item-level-failed",
      detail: `Candidate exists but requires ilvl ${modifier.requiredItemLevel}.`,
    });
  }
  if (eligibility.reason === "spawn-weight-zero") {
    evidence.push({
      code: "weight-zero",
      detail: `Spawn rule matched tag ${eligibility.matchedSpawnTag} with source weight 0.`,
    });
  } else if (eligibility.reason === "no-matching-spawn-tag") {
    evidence.push({
      code: "no-matching-tag",
      detail: "No spawn rule matched this base.",
    });
  } else if (eligibility.reason === "missing-spawn-weight") {
    evidence.push({
      code: "spawn-weight-unavailable",
      detail: `Spawn rule for tag ${eligibility.matchedSpawnTag} has no weight. Missing weight is not zero.`,
    });
  } else if (
    eligibility.reason === "domain-absent" ||
    eligibility.reason === "domain-not-mapped"
  ) {
    evidence.push({
      code: "domain-unresolved",
      detail: "Domain is unresolved for source-pool eligibility.",
    });
  } else if (eligibility.status === "eligible" && eligibility.matchedSpawnTag) {
    evidence.push({
      code: "spawn-tag-matched",
      detail: `Spawn rule matched tag ${eligibility.matchedSpawnTag} with positive source weight.`,
    });
  }
  if (modifier.affixKind === "other") {
    evidence.push({
      code: "special-generation",
      detail:
        "Special generation type. This planner does not model how to obtain this modifier.",
    });
  }
  if (modifier.isEssenceOnly === true) {
    evidence.push({
      code: "essence-only",
      detail:
        "Source marks this modifier as essence-only. The current planner does not model the mechanic that grants it.",
    });
  }
  if (presentation === "fallback") {
    evidence.push({
      code: "translation-fallback",
      detail: "translation unresolved",
    });
  }
  evidence.push(...notes);
  return evidence;
}

function labelFor(status: EligibilityResult["status"]): string {
  if (status === "eligible") {
    return "Source-pool eligible";
  }
  if (status === "ineligible") {
    return "Source-pool ineligible";
  }
  return "Eligibility unresolved";
}

function compareCandidates(
  left: PlanResult["candidates"][number],
  right: PlanResult["candidates"][number],
): number {
  const eligibility =
    rankEligibility(left.eligibility) - rankEligibility(right.eligibility);
  if (eligibility !== 0) {
    return eligibility;
  }
  const affix = rankAffix(left.affixKind) - rankAffix(right.affixKind);
  if (affix !== 0) {
    return affix;
  }
  const level = (left.requiredItemLevel ?? 0) - (right.requiredItemLevel ?? 0);
  if (level !== 0) {
    return level;
  }
  return compareId(left.modifierId, right.modifierId);
}

function rankEligibility(status: EligibilityResult["status"]): number {
  if (status === "eligible") {
    return 0;
  }
  if (status === "unresolved") {
    return 1;
  }
  return 2;
}

function rankAffix(kind: "prefix" | "suffix" | "other"): number {
  if (kind === "prefix") {
    return 0;
  }
  if (kind === "suffix") {
    return 1;
  }
  return 2;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort(compareId);
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
