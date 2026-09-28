import { createHash } from "node:crypto";

export const COMMUNITY_WEIGHT_SCHEMA_VERSION = 1 as const;
export const COMMUNITY_WEIGHT_PATCH = "4.5.5.3" as const;
export const COMMUNITY_WEIGHT_MODEL_KIND = "community-derived" as const;
export const COMMUNITY_WEIGHT_LINEAGE = "Prohibited Library lineage" as const;
export const COMMUNITY_WEIGHT_AUTHORITY =
  "Craft of Exile class weight" as const;
export const COMMUNITY_PROBABILITY_LABEL =
  "Community-derived crafting probability";
export const COMMUNITY_PROBABILITY_SUM_TOLERANCE = 1e-9;

export type CommunityAffixKind = "prefix" | "suffix";
export type CommunityExistingSide = "none" | "prefix" | "suffix";

export type HistoricalWeightTier = {
  tierIndex: number;
  requiredItemLevel: number;
  weight: number;
};

export type FamilyCandidate = {
  modifierId: string;
  affixKind: CommunityAffixKind;
  normalizedFamily: string;
  requiredItemLevel: number;
  resolved: boolean;
};

export type WeightComparison =
  "unchanged" | "changed" | "current-only" | "historical-only" | "unresolved";

export function normalizeCommunityFamily(display: string): string {
  return display
    .replace(/\{(\d+)\}/g, "#")
    .replace(/\[[^\]|]*\|([^\]]+)\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function mapHistoricalFamily(input: {
  displayFamily: string;
  affixKind: CommunityAffixKind;
  tiers: HistoricalWeightTier[];
  candidates: FamilyCandidate[];
}):
  | {
      status: "exact";
      rows: {
        modifierId: string;
        tierIndex: number;
        requiredItemLevel: number;
        weight: number;
      }[];
    }
  | { status: "unresolved"; candidateIds: string[]; reason: string } {
  const family = normalizeCommunityFamily(input.displayFamily);
  const matches = input.candidates
    .filter(
      (candidate) =>
        candidate.resolved &&
        candidate.affixKind === input.affixKind &&
        candidate.normalizedFamily === family,
    )
    .sort(
      (left, right) =>
        right.requiredItemLevel - left.requiredItemLevel ||
        left.modifierId.localeCompare(right.modifierId),
    );
  const tiers = [...input.tiers].sort(
    (left, right) => left.tierIndex - right.tierIndex,
  );
  if (matches.length === 0) {
    return {
      status: "unresolved",
      candidateIds: [],
      reason:
        "No resolved modifier family matches the historical display text.",
    };
  }
  if (matches.length !== tiers.length) {
    return {
      status: "unresolved",
      candidateIds: matches.map((candidate) => candidate.modifierId),
      reason:
        "The historical tier count does not match the current modifier count.",
    };
  }
  const levelMismatch = matches.filter(
    (candidate, index) =>
      candidate.requiredItemLevel !== tiers[index]?.requiredItemLevel,
  );
  if (levelMismatch.length > 0) {
    return {
      status: "unresolved",
      candidateIds: matches.map((candidate) => candidate.modifierId),
      reason: "Required item level does not follow the historical tier order.",
    };
  }
  return {
    status: "exact",
    rows: matches.map((candidate, index) => ({
      modifierId: candidate.modifierId,
      tierIndex: tiers[index]?.tierIndex ?? index + 1,
      requiredItemLevel: candidate.requiredItemLevel,
      weight: tiers[index]?.weight ?? 0,
    })),
  };
}

export function classifyCommunityWeight(
  historical: number | null,
  current: number | null,
): WeightComparison {
  if (historical === null && current === null) {
    return "unresolved";
  }
  if (historical === null) {
    return "current-only";
  }
  if (current === null) {
    return "historical-only";
  }
  return historical === current ? "unchanged" : "changed";
}

export function promotedWeight(input: {
  comparison: WeightComparison;
  current: number | null;
}): number | null {
  if (input.current === null) {
    return null;
  }
  if (
    input.comparison === "unchanged" ||
    input.comparison === "changed" ||
    input.comparison === "current-only"
  ) {
    return input.current;
  }
  return null;
}

export type CommunityWeightRecord = {
  modifierId: string;
  scope: string;
  affixKind: CommunityAffixKind;
  weight: number;
  patch: string;
  validation:
    "validated-historical-unchanged" | "validated-current" | "current-only";
};

export function communityWeightChecksum(rows: CommunityWeightRecord[]): string {
  const canonical = [...rows]
    .map((row) => ({
      modifierId: row.modifierId,
      scope: row.scope,
      affixKind: row.affixKind,
      weight: row.weight,
      patch: row.patch,
      validation: row.validation,
    }))
    .sort(
      (left, right) =>
        left.scope.localeCompare(right.scope) ||
        left.modifierId.localeCompare(right.modifierId),
    );
  return `sha256:${createHash("sha256").update(JSON.stringify(canonical)).digest("hex")}`;
}

export type AugmentationCandidate = {
  modifierId: string;
  affixKind: CommunityAffixKind;
  weight: number | null;
};

export function calculateCommunityAugmentationProbabilities(input: {
  requestedPatch: string;
  weightPatch: string;
  snapshotChecksum: string;
  existingSide: CommunityExistingSide;
  candidates: AugmentationCandidate[];
}):
  | {
      ok: true;
      modelKind: typeof COMMUNITY_WEIGHT_MODEL_KIND;
      schemaVersion: typeof COMMUNITY_WEIGHT_SCHEMA_VERSION;
      patch: string;
      snapshotChecksum: string;
      lineage: typeof COMMUNITY_WEIGHT_LINEAGE;
      weightAuthority: typeof COMMUNITY_WEIGHT_AUTHORITY;
      label: string;
      totalWeight: number;
      candidates: { modifierId: string; weight: number; probability: number }[];
    }
  | {
      ok: false;
      code: "patch-mismatch" | "missing-weight" | "empty-pool";
      message: string;
    } {
  if (input.requestedPatch !== input.weightPatch) {
    return {
      ok: false,
      code: "patch-mismatch",
      message: `Weight snapshot patch ${input.weightPatch} does not match requested patch ${input.requestedPatch}.`,
    };
  }
  const open = input.candidates.filter((candidate) => {
    if (input.existingSide === "prefix") {
      return candidate.affixKind === "suffix";
    }
    if (input.existingSide === "suffix") {
      return candidate.affixKind === "prefix";
    }
    return true;
  });
  if (open.length === 0) {
    return {
      ok: false,
      code: "empty-pool",
      message: "The open Augmentation pool has no candidates.",
    };
  }
  if (
    open.some(
      (candidate) =>
        candidate.weight === null || !Number.isFinite(candidate.weight),
    )
  ) {
    return {
      ok: false,
      code: "missing-weight",
      message:
        "An open candidate has no current weight. The probability set is blocked.",
    };
  }
  const weighted = open.map((candidate) => ({
    modifierId: candidate.modifierId,
    weight: candidate.weight ?? 0,
  }));
  const totalWeight = weighted.reduce(
    (sum, candidate) => sum + candidate.weight,
    0,
  );
  if (totalWeight <= 0) {
    return {
      ok: false,
      code: "missing-weight",
      message: "The open pool has no positive current weight.",
    };
  }
  return {
    ok: true,
    modelKind: COMMUNITY_WEIGHT_MODEL_KIND,
    schemaVersion: COMMUNITY_WEIGHT_SCHEMA_VERSION,
    patch: input.weightPatch,
    snapshotChecksum: input.snapshotChecksum,
    lineage: COMMUNITY_WEIGHT_LINEAGE,
    weightAuthority: COMMUNITY_WEIGHT_AUTHORITY,
    label: `${COMMUNITY_PROBABILITY_LABEL}. Validated against Craft of Exile patch ${input.weightPatch}. Weight research lineage: ${COMMUNITY_WEIGHT_LINEAGE}.`,
    totalWeight,
    candidates: weighted.map((candidate) => ({
      ...candidate,
      probability: candidate.weight / totalWeight,
    })),
  };
}
