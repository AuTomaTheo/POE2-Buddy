import type { PassiveNode, StatContribution } from "@poe2-helper/domain";
import {
  parsePassiveStatLine,
  pathSemanticCoverage,
  semanticPassiveStats,
  type PathScoringConfidence,
  type PathSemanticCoverage,
  type SearchCompleteness,
  type SemanticPassiveStat,
} from "@poe2-helper/passive-engine";
import type { ScoringProfile } from "./profiles.js";

const SCORED_OPERATIONS = new Set(["increased", "reduced", "added"]);

const UNSCORED_SCOPE_TYPES = new Set([
  "while",
  "if",
  "when",
  "against",
  "with",
  "for",
  "per",
]);

export type ScoredCandidate = {
  nodeIds: readonly number[];
  pointCost: number;
  heuristicScore: number;
  scorePerPoint: number;
  contributions: readonly StatContribution[];
  pathSemanticCoverage: PathSemanticCoverage;
  semanticConfidence: PathScoringConfidence;
  unsupportedRawLines: readonly string[];
  searchCompleteness: SearchCompleteness;
  valuationComplete: boolean;
  profileId: ScoringProfile["id"];
  profileVersion: number;
};

function hasUnscoredQualifier(stat: SemanticPassiveStat): boolean {
  if (stat.conditions !== undefined && stat.conditions.length > 0) return true;
  if (
    stat.structuredScopes?.some((scope) => UNSCORED_SCOPE_TYPES.has(scope.type))
  ) {
    return true;
  }
  return stat.scopes.some((scope) =>
    /^(while|if|when|against|with|for|per)\b/i.test(scope),
  );
}

function scoreStat(
  stat: SemanticPassiveStat,
  profile: ScoringProfile,
): StatContribution {
  const operationWeights = profile.weights[stat.semanticId];
  const operationWeight = SCORED_OPERATIONS.has(stat.operation)
    ? (operationWeights?.[
        stat.operation as "increased" | "reduced" | "added"
      ] ?? null)
    : null;
  const supported = operationWeight !== null && !hasUnscoredQualifier(stat);
  const weight = supported ? operationWeight : 0;
  return {
    statId: stat.statId,
    label: stat.semanticId,
    amount: stat.amount,
    weight,
    contribution: supported ? stat.amount * weight : 0,
    supported,
  };
}

/**
 * Scores known increased, reduced, and added effects using the profile.
 * Unrecognized and unmapped lines stay on `unsupportedRawLines` and are
 * omitted from `heuristicScore`. Comparison uses `heuristicScore`, not
 * `scorePerPoint`.
 */
export function scorePassivePath(input: {
  nodes: readonly Pick<PassiveNode, "id" | "rawStats">[];
  nodeIds: readonly number[];
  pointCost: number;
  profile: ScoringProfile;
  searchCompleteness: SearchCompleteness;
}): ScoredCandidate {
  const contributions: StatContribution[] = [];
  for (const node of input.nodes) {
    for (const raw of node.rawStats) {
      const stats = semanticPassiveStats(parsePassiveStatLine(raw));
      if (stats === null) continue;
      for (const stat of stats) {
        contributions.push(scoreStat(stat, input.profile));
      }
    }
  }

  const coverage = pathSemanticCoverage(input.nodes);
  const heuristicScore = contributions.reduce(
    (sum, contribution) =>
      contribution.supported ? sum + contribution.contribution : sum,
    0,
  );
  const valuationComplete =
    coverage.confidence === "complete" &&
    coverage.unsupportedRawLines.length === 0 &&
    contributions.every((contribution) => contribution.supported);

  return {
    nodeIds: input.nodeIds,
    pointCost: input.pointCost,
    heuristicScore,
    scorePerPoint:
      input.pointCost === 0 ? heuristicScore : heuristicScore / input.pointCost,
    contributions,
    pathSemanticCoverage: coverage,
    semanticConfidence: coverage.confidence,
    unsupportedRawLines: coverage.unsupportedRawLines,
    searchCompleteness: input.searchCompleteness,
    valuationComplete,
    profileId: input.profile.id,
    profileVersion: input.profile.version,
  };
}
