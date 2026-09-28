import {
  craftingFailure,
  craftingSuccess,
  type CraftingResult,
} from "./errors.js";
import type {
  BaseItem,
  CraftingSnapshot,
  ModifierRecord,
  TranslationRecord,
} from "./schema.js";

export type IndexedCraftingData = {
  snapshot: CraftingSnapshot;
  baseById: Map<string, BaseItem>;
  baseByName: Map<string, BaseItem[]>;
  modById: Map<string, ModifierRecord>;
  modsByDomain: Map<string, ModifierRecord[]>;
  modsByGenerationType: Map<string, ModifierRecord[]>;
  modsByGroup: Map<string, ModifierRecord[]>;
  translationsByStatKey: Map<string, TranslationRecord>;
};

export type BaseResolution =
  | { status: "resolved"; base: BaseItem }
  | { status: "not-found" }
  | { status: "ambiguous"; candidateIds: string[] };

export type EligibilityStatus = "eligible" | "ineligible" | "unresolved";

export type EligibilityResult = {
  status: EligibilityStatus;
  reason: string | null;
  matchedSpawnTag: string | null;
  matchedSpawnWeight: number | null;
  matchedGenerationTag: string | null;
  matchedGenerationWeight: number | null;
};

export type SourcePoolQuery = {
  baseId: string;
  itemLevel: number;
  generationType?: string;
  group?: string;
  statId?: string;
  domain?: string;
};

export type SourcePoolResult = {
  eligible: string[];
  unresolved: string[];
  excludedCount: number;
  snapshotChecksum: string;
  warnings: string[];
};

const POOL_WARNINGS = [
  "Source-pool eligibility is not a crafting probability.",
  "Id order is not a recommendation.",
];

export function indexCraftingSnapshot(
  snapshot: CraftingSnapshot,
): IndexedCraftingData {
  const baseById = new Map<string, BaseItem>();
  const baseByName = new Map<string, BaseItem[]>();
  for (const base of snapshot.bases) {
    baseById.set(base.id, base);
    const named = baseByName.get(base.name) ?? [];
    named.push(base);
    baseByName.set(base.name, named);
  }

  const modById = new Map<string, ModifierRecord>();
  const modsByDomain = new Map<string, ModifierRecord[]>();
  const modsByGenerationType = new Map<string, ModifierRecord[]>();
  const modsByGroup = new Map<string, ModifierRecord[]>();
  for (const modifier of snapshot.modifiers) {
    modById.set(modifier.id, modifier);
    pushMap(modsByDomain, modifier.domain ?? "", modifier);
    pushMap(modsByGenerationType, modifier.generationType, modifier);
    for (const group of modifier.groups) {
      pushMap(modsByGroup, group, modifier);
    }
  }

  const translationsByStatKey = new Map<string, TranslationRecord>();
  for (const translation of snapshot.translations) {
    translationsByStatKey.set(translation.statIds.join("\u0000"), translation);
  }

  return {
    snapshot,
    baseById,
    baseByName,
    modById,
    modsByDomain,
    modsByGenerationType,
    modsByGroup,
    translationsByStatKey,
  };
}

export function resolveBase(
  indexed: IndexedCraftingData,
  query: { id?: string; name?: string; itemClass?: string },
): CraftingResult<BaseResolution> {
  if (query.id) {
    const base = indexed.baseById.get(query.id);
    if (!base) {
      return craftingSuccess({ status: "not-found" });
    }
    return craftingSuccess({ status: "resolved", base });
  }
  if (!query.name) {
    return craftingFailure(
      "base-not-found",
      "Base lookup needs an id or an exact name.",
    );
  }
  const named = indexed.baseByName.get(query.name) ?? [];
  const matches = query.itemClass
    ? named.filter((base) => base.itemClass === query.itemClass)
    : named;
  if (matches.length === 0) {
    return craftingSuccess({ status: "not-found" });
  }
  if (matches.length > 1) {
    return craftingSuccess({
      status: "ambiguous",
      candidateIds: matches.map((base) => base.id).sort(compareId),
    });
  }
  const base = matches[0];
  if (!base) {
    return craftingSuccess({ status: "not-found" });
  }
  return craftingSuccess({ status: "resolved", base });
}

export function resolveGearBase(
  indexed: IndexedCraftingData,
  gear: { baseName: string; itemClass: string },
): CraftingResult<BaseResolution> {
  return resolveBase(indexed, {
    name: gear.baseName,
    itemClass: gear.itemClass,
  });
}

export function shareModifierGroup(
  indexed: IndexedCraftingData,
  leftId: string,
  rightId: string,
): CraftingResult<boolean> {
  const left = indexed.modById.get(leftId);
  const right = indexed.modById.get(rightId);
  if (!left || !right) {
    return craftingFailure(
      "modifier-not-found",
      "Both modifier ids are required to compare groups.",
    );
  }
  const rightGroups = new Set(right.groups);
  return craftingSuccess(left.groups.some((group) => rightGroups.has(group)));
}

export function evaluateSourcePool(
  indexed: IndexedCraftingData,
  input: { baseId: string; modifierId: string; itemLevel: number },
  options?: { applyGenerationWeights?: boolean },
): CraftingResult<EligibilityResult> {
  const base = indexed.baseById.get(input.baseId);
  if (!base) {
    return craftingFailure(
      "base-not-found",
      `Base ${input.baseId} was not found.`,
    );
  }
  const modifier = indexed.modById.get(input.modifierId);
  if (!modifier) {
    return craftingFailure(
      "modifier-not-found",
      `Modifier ${input.modifierId} was not found.`,
    );
  }
  if (!Number.isFinite(input.itemLevel)) {
    return craftingFailure(
      "eligibility-unresolved",
      "Item level must be a finite number.",
    );
  }
  return craftingSuccess(
    eligibilityFor(base, modifier, input.itemLevel, options),
  );
}

export function querySourcePool(
  indexed: IndexedCraftingData,
  query: SourcePoolQuery,
): CraftingResult<SourcePoolResult> {
  if (!indexed.baseById.has(query.baseId)) {
    return craftingFailure(
      "base-not-found",
      `Base ${query.baseId} was not found.`,
    );
  }
  if (!Number.isFinite(query.itemLevel)) {
    return craftingFailure(
      "eligibility-unresolved",
      "Item level must be a finite number.",
    );
  }
  const eligible: string[] = [];
  const unresolved: string[] = [];
  let excludedCount = 0;
  for (const modifier of indexed.snapshot.modifiers) {
    if (
      query.generationType &&
      modifier.generationType !== query.generationType
    ) {
      continue;
    }
    if (query.group && !modifier.groups.includes(query.group)) {
      continue;
    }
    if (
      query.statId &&
      !modifier.stats.some((stat) => stat.id === query.statId)
    ) {
      continue;
    }
    if (query.domain && modifier.domain !== query.domain) {
      continue;
    }
    const result = evaluateSourcePool(indexed, {
      baseId: query.baseId,
      modifierId: modifier.id,
      itemLevel: query.itemLevel,
    });
    if (!result.ok) {
      return result;
    }
    if (result.value.status === "eligible") {
      eligible.push(modifier.id);
    } else if (result.value.status === "unresolved") {
      unresolved.push(modifier.id);
    } else {
      excludedCount += 1;
    }
  }
  eligible.sort(compareId);
  unresolved.sort(compareId);
  return craftingSuccess({
    eligible,
    unresolved,
    excludedCount,
    snapshotChecksum: indexed.snapshot.checksum,
    warnings: POOL_WARNINGS,
  });
}

export function lookupTranslation(
  indexed: IndexedCraftingData,
  statIds: string[],
): CraftingResult<TranslationRecord> {
  const found = indexed.translationsByStatKey.get(statIds.join("\u0000"));
  if (!found) {
    return craftingFailure(
      "translation-unresolved",
      `No English translation row exists for ${statIds.join(", ")}.`,
    );
  }
  return craftingSuccess(found);
}

export type ModifierTranslation = {
  status: "resolved" | "unresolved";
  lines: {
    statIds: string[];
    status: "resolved" | "unresolved";
    template: string | null;
    unresolvedReason: string | null;
  }[];
};

export function translateModifier(
  indexed: IndexedCraftingData,
  modifierId: string,
): CraftingResult<ModifierTranslation> {
  const modifier = indexed.modById.get(modifierId);
  if (!modifier) {
    return craftingFailure(
      "modifier-not-found",
      `Modifier ${modifierId} was not found.`,
    );
  }
  if (modifier.stats.length === 0) {
    return craftingSuccess({
      status: "unresolved",
      lines: [],
    });
  }
  const combined = lookupTranslation(
    indexed,
    modifier.stats.map((stat) => stat.id),
  );
  if (combined.ok && combined.value.status === "resolved") {
    return craftingSuccess({
      status: "resolved",
      lines: [
        {
          statIds: combined.value.statIds,
          status: "resolved",
          template: combined.value.template,
          unresolvedReason: null,
        },
      ],
    });
  }
  const lines = modifier.stats.map((stat) => {
    const row = lookupTranslation(indexed, [stat.id]);
    if (!row.ok || row.value.status === "unresolved") {
      return {
        statIds: [stat.id],
        status: "unresolved" as const,
        template: row.ok ? row.value.template : null,
        unresolvedReason: row.ok
          ? row.value.unresolvedReason
          : "missing-translation",
      };
    }
    return {
      statIds: [stat.id],
      status: "resolved" as const,
      template: row.value.template,
      unresolvedReason: null,
    };
  });
  const status = lines.every((line) => line.status === "resolved")
    ? "resolved"
    : "unresolved";
  return craftingSuccess({ status, lines });
}

export function requirePlannerCompatibility(
  snapshot: CraftingSnapshot,
): CraftingResult<CraftingSnapshot> {
  if (snapshot.compatibility.status !== "compatible") {
    return craftingFailure(
      "snapshot-incompatible",
      "Crafting snapshot compatibility is not compatible. Planner use is closed.",
    );
  }
  return craftingSuccess(snapshot);
}

function eligibilityFor(
  base: BaseItem,
  modifier: ModifierRecord,
  itemLevel: number,
  options?: { applyGenerationWeights?: boolean },
): EligibilityResult {
  const empty = {
    matchedSpawnTag: null,
    matchedSpawnWeight: null,
    matchedGenerationTag: null,
    matchedGenerationWeight: null,
  };
  if (itemLevel < modifier.requiredItemLevel) {
    return { status: "ineligible", reason: "item-level", ...empty };
  }
  if (base.domain === null || modifier.domain === null) {
    return { status: "unresolved", reason: "domain-absent", ...empty };
  }
  if (base.domain !== "item" || modifier.domain !== "item") {
    return { status: "unresolved", reason: "domain-not-mapped", ...empty };
  }

  const tags = new Set(base.tags);
  const spawn = firstMatchingWeight(modifier.spawnWeightRules, tags);
  if (spawn.status === "missing-weight") {
    return {
      status: "unresolved",
      reason: "missing-spawn-weight",
      matchedSpawnTag: spawn.tag,
      matchedSpawnWeight: null,
      matchedGenerationTag: null,
      matchedGenerationWeight: null,
    };
  }
  if (spawn.status === "none") {
    return { status: "ineligible", reason: "no-matching-spawn-tag", ...empty };
  }
  if (spawn.weight === 0) {
    return {
      status: "ineligible",
      reason: "spawn-weight-zero",
      matchedSpawnTag: spawn.tag,
      matchedSpawnWeight: 0,
      matchedGenerationTag: null,
      matchedGenerationWeight: null,
    };
  }

  if (
    modifier.generationWeightRules.length === 0 ||
    options?.applyGenerationWeights === false
  ) {
    return {
      status: "eligible",
      reason: null,
      matchedSpawnTag: spawn.tag,
      matchedSpawnWeight: spawn.weight,
      matchedGenerationTag: null,
      matchedGenerationWeight: null,
    };
  }

  const generation = firstMatchingWeight(modifier.generationWeightRules, tags);
  if (generation.status === "none") {
    return {
      status: "eligible",
      reason: null,
      matchedSpawnTag: spawn.tag,
      matchedSpawnWeight: spawn.weight,
      matchedGenerationTag: null,
      matchedGenerationWeight: null,
    };
  }
  if (generation.status === "missing-weight") {
    return {
      status: "unresolved",
      reason: "missing-generation-weight",
      matchedSpawnTag: spawn.tag,
      matchedSpawnWeight: spawn.weight,
      matchedGenerationTag: generation.tag,
      matchedGenerationWeight: null,
    };
  }
  if (generation.weight === 0) {
    return {
      status: "ineligible",
      reason: "generation-weight-zero",
      matchedSpawnTag: spawn.tag,
      matchedSpawnWeight: spawn.weight,
      matchedGenerationTag: generation.tag,
      matchedGenerationWeight: 0,
    };
  }
  return {
    status: "eligible",
    reason: null,
    matchedSpawnTag: spawn.tag,
    matchedSpawnWeight: spawn.weight,
    matchedGenerationTag: generation.tag,
    matchedGenerationWeight: generation.weight,
  };
}

function firstMatchingWeight(
  rules: ModifierRecord["spawnWeightRules"],
  tags: ReadonlySet<string>,
):
  | { status: "matched"; tag: string; weight: number }
  | { status: "missing-weight"; tag: string }
  | { status: "none" } {
  for (const rule of rules) {
    if (!tags.has(rule.tag)) {
      continue;
    }
    if (rule.weight === null) {
      return { status: "missing-weight", tag: rule.tag };
    }
    return { status: "matched", tag: rule.tag, weight: rule.weight };
  }
  return { status: "none" };
}

function pushMap<T>(map: Map<string, T[]>, key: string, value: T) {
  const list = map.get(key) ?? [];
  list.push(value);
  map.set(key, list);
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
