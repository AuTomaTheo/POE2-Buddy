import type { OptimizationObjective } from "@poe2-helper/domain";

/**
 * Calibration set 1. Weights are heuristic scale factors, not combat math.
 * `null` means that operation is left unscored for this semantic id.
 * A semantic id missing from a profile is not scored for that objective.
 * Increased, reduced, and added are never stored as the same number.
 */
export const SCORING_PROFILE_VERSION = 1;

export type OperationWeights = {
  increased: number | null;
  reduced: number | null;
  added: number | null;
};

export type ScoringProfile = {
  id: OptimizationObjective;
  version: number;
  weights: Readonly<Record<string, OperationWeights>>;
};

export type WeightCell = {
  semanticId: string;
  operation: "increased" | "reduced" | "added";
  offensive: number | null;
  defensive: number | null;
  balanced: number | null;
  offensivePresent: boolean;
  defensivePresent: boolean;
  balancedPresent: boolean;
};

function weights(
  increased: number | null,
  reduced: number | null,
  added: number | null,
): OperationWeights {
  return { increased, reduced, added };
}

const offensiveWeights: ScoringProfile["weights"] = {
  "projectile-damage": weights(2, -2, 0.25),
  "spell-damage": weights(2, -2, 0.25),
  "attack-damage": weights(1.6, -1.6, 0.2),
  "melee-damage": weights(1.4, -1.4, 0.2),
  "physical-damage": weights(1.2, -1.2, 0.2),
  "fire-damage": weights(1.2, -1.2, 0.2),
  "cold-damage": weights(1.2, -1.2, 0.2),
  "lightning-damage": weights(1.2, -1.2, 0.2),
  "chaos-damage": weights(1.2, -1.2, 0.2),
  "elemental-damage": weights(1.2, -1.2, 0.2),
  "critical-hit-chance": weights(1.5, -1.5, 8),
  "critical-damage-bonus": weights(1.2, -1.2, 0.4),
  "critical-hit-chance-for-spells": weights(1.4, -1.4, 8),
  "critical-hit-chance-for-attacks": weights(1.4, -1.4, 8),
  "attack-speed": weights(1.5, -1.5, null),
  "cast-speed": weights(1.5, -1.5, null),
  "projectile-speed": weights(0.5, -0.5, null),
  accuracy: weights(0.3, -0.3, 0.05),
};

const defensiveWeights: ScoringProfile["weights"] = {
  "maximum-life": weights(2, -2, 0.2),
  "maximum-energy-shield": weights(1.8, -1.8, 0.15),
  armour: weights(1.4, -1.4, 0.04),
  evasion: weights(1.6, -1.6, 0.04),
  deflection: weights(1.4, -1.4, 0.08),
  "block-chance": weights(1, -1, 0.5),
  "fire-resistance": weights(0.2, -0.2, 0.6),
  "cold-resistance": weights(0.2, -0.2, 0.6),
  "lightning-resistance": weights(0.2, -0.2, 0.6),
  "chaos-resistance": weights(0.3, -0.3, 0.8),
  strength: weights(0.1, -0.1, 0.15),
  dexterity: weights(0.1, -0.1, 0.15),
  intelligence: weights(0.1, -0.1, 0.15),
};

const balancedWeights: ScoringProfile["weights"] = {
  "projectile-damage": weights(1, -1, 0.1),
  "spell-damage": weights(1, -1, 0.1),
  "attack-damage": weights(0.8, -0.8, 0.1),
  "critical-hit-chance": weights(0.8, -0.8, 4),
  "critical-damage-bonus": weights(0.6, -0.6, 0.2),
  "attack-speed": weights(0.8, -0.8, null),
  "cast-speed": weights(0.8, -0.8, null),
  "maximum-life": weights(1, -1, 0.1),
  "maximum-energy-shield": weights(0.9, -0.9, 0.08),
  armour: weights(0.7, -0.7, 0.02),
  evasion: weights(0.8, -0.8, 0.02),
  deflection: weights(0.7, -0.7, 0.04),
  "fire-resistance": weights(0.1, -0.1, 0.3),
  "cold-resistance": weights(0.1, -0.1, 0.3),
  "lightning-resistance": weights(0.1, -0.1, 0.3),
  "chaos-resistance": weights(0.15, -0.15, 0.4),
};

export const SCORING_PROFILES: Readonly<
  Record<OptimizationObjective, ScoringProfile>
> = {
  offensive: {
    id: "offensive",
    version: SCORING_PROFILE_VERSION,
    weights: offensiveWeights,
  },
  defensive: {
    id: "defensive",
    version: SCORING_PROFILE_VERSION,
    weights: defensiveWeights,
  },
  balanced: {
    id: "balanced",
    version: SCORING_PROFILE_VERSION,
    weights: balancedWeights,
  },
};

const OPERATIONS = ["increased", "reduced", "added"] as const;

export function weightInventory(): readonly WeightCell[] {
  const ids = new Set<string>([
    ...Object.keys(offensiveWeights),
    ...Object.keys(defensiveWeights),
    ...Object.keys(balancedWeights),
  ]);
  const rows: WeightCell[] = [];
  for (const semanticId of [...ids].sort((left, right) =>
    left.localeCompare(right),
  )) {
    for (const operation of OPERATIONS) {
      rows.push({
        semanticId,
        operation,
        offensive: offensiveWeights[semanticId]?.[operation] ?? null,
        defensive: defensiveWeights[semanticId]?.[operation] ?? null,
        balanced: balancedWeights[semanticId]?.[operation] ?? null,
        offensivePresent: Object.hasOwn(offensiveWeights, semanticId),
        defensivePresent: Object.hasOwn(defensiveWeights, semanticId),
        balancedPresent: Object.hasOwn(balancedWeights, semanticId),
      });
    }
  }
  return rows;
}

export function scoringProfile(id: OptimizationObjective): ScoringProfile {
  return SCORING_PROFILES[id];
}

/** Semantic ids that appear in at least one scoring profile. */
export function weightedSemanticIds(): readonly string[] {
  const ids = new Set<string>();
  for (const row of weightInventory()) {
    if (row.offensivePresent || row.defensivePresent || row.balancedPresent) {
      ids.add(row.semanticId);
    }
  }
  return [...ids].sort((left, right) => left.localeCompare(right));
}
