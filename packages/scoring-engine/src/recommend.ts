import type {
  BuildFixture,
  GameDataVersion,
  OptimizationObjective,
} from "@poe2-helper/domain";
import {
  enumerateMainTreePaths,
  type PassiveGraph,
  type PathSearchLimits,
  type SearchCompleteness,
} from "@poe2-helper/passive-engine";
import { compareCandidateOrder } from "./compare.js";
import { scoringProfile, type ScoringProfile } from "./profiles.js";
import { scorePassivePath, type ScoredCandidate } from "./score.js";

export type RecommendationClaim =
  | "highest-scoring-complete-path-among-enumerated-candidates"
  | "highest-scoring-complete-path-found-within-search-limits"
  | "not-definitive-incomplete-valuation"
  | "no-complete-candidate"
  | "no-candidates";

export type RankedCompleteCandidate = ScoredCandidate & {
  fullValueUnknown: false;
};

export type IncompleteRecommendationCandidate = ScoredCandidate & {
  fullValueUnknown: true;
};

export type PassivePathRecommendation = {
  rankedCompleteCandidates: readonly RankedCompleteCandidate[];
  incompleteCandidates: readonly IncompleteRecommendationCandidate[];
  searchCompleteness: SearchCompleteness;
  selectionClaim: RecommendationClaim;
  definitive: boolean;
  dataVersion: GameDataVersion;
  profileVersion: number;
  profileId: OptimizationObjective;
  pointBudget: number;
  k: number;
};

function isValuationComplete(candidate: ScoredCandidate): boolean {
  return (
    candidate.semanticConfidence === "complete" && candidate.valuationComplete
  );
}

function recommendationClaim(input: {
  candidateCount: number;
  completeCount: number;
  truncated: boolean;
}): RecommendationClaim {
  if (input.candidateCount === 0) return "no-candidates";
  if (input.completeCount === 0) return "no-complete-candidate";
  if (input.completeCount < input.candidateCount) {
    return "not-definitive-incomplete-valuation";
  }
  if (input.truncated) {
    return "highest-scoring-complete-path-found-within-search-limits";
  }
  return "highest-scoring-complete-path-among-enumerated-candidates";
}

/**
 * Splits scored paths into a Top-K of fully valued candidates and a separate
 * list of candidates whose full value is unknown. Does not return node ids alone.
 */
export function recommendScoredCandidates(input: {
  candidates: readonly ScoredCandidate[];
  k: number;
  searchCompleteness: SearchCompleteness;
  dataVersion: GameDataVersion;
  profileVersion: number;
  profileId: OptimizationObjective;
  pointBudget: number;
}): PassivePathRecommendation {
  if (!Number.isInteger(input.k) || input.k < 0) {
    throw new RangeError(
      `K must be a nonnegative integer. Received ${input.k}.`,
    );
  }
  for (const candidate of input.candidates) {
    if (candidate.profileId !== input.profileId) {
      throw new Error(
        "Scored candidates use a different profile than the recommendation.",
      );
    }
    if (candidate.profileVersion !== input.profileVersion) {
      throw new Error(
        "Scored candidates use a different profile version than the recommendation.",
      );
    }
  }

  const truncated =
    input.searchCompleteness === "truncated" ||
    input.candidates.some(
      (candidate) => candidate.searchCompleteness === "truncated",
    );
  const complete = input.candidates
    .filter(isValuationComplete)
    .sort(compareCandidateOrder);
  const incomplete = input.candidates
    .filter((candidate) => !isValuationComplete(candidate))
    .sort(compareCandidateOrder);
  const selectionClaim = recommendationClaim({
    candidateCount: input.candidates.length,
    completeCount: complete.length,
    truncated,
  });

  return {
    rankedCompleteCandidates: complete.slice(0, input.k).map((candidate) => ({
      ...candidate,
      fullValueUnknown: false,
    })),
    incompleteCandidates: incomplete.map((candidate) => ({
      ...candidate,
      fullValueUnknown: true,
    })),
    searchCompleteness: truncated ? "truncated" : "exhaustive",
    selectionClaim,
    definitive:
      selectionClaim ===
        "highest-scoring-complete-path-among-enumerated-candidates" &&
      input.k > 0,
    dataVersion: input.dataVersion,
    profileVersion: input.profileVersion,
    profileId: input.profileId,
    pointBudget: input.pointBudget,
    k: input.k,
  };
}

function scoreSearchPaths(
  search: ReturnType<typeof enumerateMainTreePaths>,
  graph: PassiveGraph,
  profile: ScoringProfile,
): ScoredCandidate[] {
  return search.paths.map((path) =>
    scorePassivePath({
      nodes: path.nodeIds.map((id) => {
        const node = graph.node(id);
        return { id: node.id, rawStats: [...node.rawStats] };
      }),
      nodeIds: path.nodeIds,
      pointCost: path.pointCost,
      profile,
      searchCompleteness: search.searchCompleteness,
    }),
  );
}

export function recommendMainTreePaths(input: {
  fixture: BuildFixture;
  graph: PassiveGraph;
  profile: ScoringProfile;
  k: number;
  limits?: Partial<PathSearchLimits>;
}): PassivePathRecommendation {
  const search = enumerateMainTreePaths(
    input.fixture,
    input.graph,
    input.limits,
  );
  return recommendScoredCandidates({
    candidates: scoreSearchPaths(search, input.graph, input.profile),
    k: input.k,
    searchCompleteness: search.searchCompleteness,
    dataVersion: input.graph.version,
    profileVersion: input.profile.version,
    profileId: input.profile.id,
    pointBudget: search.pointBudget,
  });
}

export function recommendMainTreeObjectives(input: {
  fixture: BuildFixture;
  graph: PassiveGraph;
  k: number;
  limits?: Partial<PathSearchLimits>;
}): Record<OptimizationObjective, PassivePathRecommendation> {
  const search = enumerateMainTreePaths(
    input.fixture,
    input.graph,
    input.limits,
  );
  const objectives = ["offensive", "defensive", "balanced"] as const;
  return Object.fromEntries(
    objectives.map((objective) => {
      const profile = scoringProfile(objective);
      return [
        objective,
        recommendScoredCandidates({
          candidates: scoreSearchPaths(search, input.graph, profile),
          k: input.k,
          searchCompleteness: search.searchCompleteness,
          dataVersion: input.graph.version,
          profileVersion: profile.version,
          profileId: profile.id,
          pointBudget: search.pointBudget,
        }),
      ];
    }),
  ) as Record<OptimizationObjective, PassivePathRecommendation>;
}
