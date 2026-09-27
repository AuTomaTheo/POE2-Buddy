import type { CandidateSelectionClaim } from "@poe2-helper/passive-engine";
import { candidateSelectionClaim } from "@poe2-helper/passive-engine";
import type { ScoredCandidate } from "./score.js";

const CONFIDENCE_RANK = {
  low: 0,
  partial: 1,
  high: 2,
  complete: 3,
} as const;

export type ScoreComparisonClaim =
  CandidateSelectionClaim | "not-definitive" | "no-candidates";

export type ScoreComparison = {
  definitive: boolean;
  claim: ScoreComparisonClaim;
  preferred: ScoredCandidate | null;
  higherHeuristicScore: ScoredCandidate | null;
};

function reliablyComparable(candidate: ScoredCandidate): boolean {
  return (
    candidate.semanticConfidence === "complete" &&
    candidate.valuationComplete &&
    candidate.searchCompleteness === "exhaustive"
  );
}

function nodeOrder(candidate: ScoredCandidate): string {
  return candidate.nodeIds.join(",");
}

/**
 * Display order for one class of candidates. Higher heuristic score first,
 * then the documented tie-break. This does not decide whether the comparison
 * is definitive.
 */
export function compareCandidateOrder(
  left: ScoredCandidate,
  right: ScoredCandidate,
): number {
  if (left.heuristicScore !== right.heuristicScore) {
    return right.heuristicScore - left.heuristicScore;
  }
  return tieBreak(left, right);
}

/**
 * Tie-break after equal heuristic scores: more complete semantic confidence,
 * then lower point cost, then ascending node-id text. No gameplay preference.
 */
function tieBreak(left: ScoredCandidate, right: ScoredCandidate): number {
  const confidence =
    CONFIDENCE_RANK[right.semanticConfidence] -
    CONFIDENCE_RANK[left.semanticConfidence];
  if (confidence !== 0) return confidence;
  if (left.pointCost !== right.pointCost)
    return left.pointCost - right.pointCost;
  return nodeOrder(left).localeCompare(nodeOrder(right));
}

export function compareScoredCandidates(
  left: ScoredCandidate,
  right: ScoredCandidate,
): ScoreComparison {
  const higherHeuristicScore =
    left.heuristicScore === right.heuristicScore
      ? null
      : left.heuristicScore > right.heuristicScore
        ? left
        : right;
  const sameScore = left.heuristicScore === right.heuristicScore;
  const definitive =
    reliablyComparable(left) &&
    reliablyComparable(right) &&
    left.searchCompleteness === right.searchCompleteness;

  if (!definitive) {
    const truncated =
      left.searchCompleteness === "truncated" ||
      right.searchCompleteness === "truncated";
    const bothComplete =
      left.semanticConfidence === "complete" &&
      right.semanticConfidence === "complete" &&
      left.valuationComplete &&
      right.valuationComplete;
    return {
      definitive: false,
      claim:
        truncated && bothComplete
          ? candidateSelectionClaim({ searchCompleteness: "truncated" })
          : "not-definitive",
      preferred: null,
      higherHeuristicScore,
    };
  }

  const preferred = sameScore
    ? tieBreak(left, right) <= 0
      ? left
      : right
    : higherHeuristicScore;
  return {
    definitive: true,
    claim: candidateSelectionClaim({ searchCompleteness: "exhaustive" }),
    preferred,
    higherHeuristicScore,
  };
}

export function selectScoredCandidates(
  candidates: readonly ScoredCandidate[],
): ScoreComparison & { ordered: readonly ScoredCandidate[] } {
  if (candidates.length === 0) {
    return {
      definitive: false,
      claim: "no-candidates",
      preferred: null,
      higherHeuristicScore: null,
      ordered: [],
    };
  }

  const ordered = [...candidates].sort(compareCandidateOrder);
  const first = ordered[0];
  if (!first) {
    return {
      definitive: false,
      claim: "no-candidates",
      preferred: null,
      higherHeuristicScore: null,
      ordered,
    };
  }

  const anyIncomplete = ordered.some(
    (candidate) =>
      candidate.semanticConfidence !== "complete" ||
      !candidate.valuationComplete,
  );
  const anyTruncated = ordered.some(
    (candidate) => candidate.searchCompleteness === "truncated",
  );
  const higherHeuristicScore =
    ordered.length > 1 && ordered[1]?.heuristicScore === first.heuristicScore
      ? null
      : first;

  if (anyIncomplete) {
    return {
      definitive: false,
      claim: "not-definitive",
      preferred: null,
      higherHeuristicScore,
      ordered,
    };
  }
  if (anyTruncated) {
    return {
      definitive: false,
      claim: candidateSelectionClaim({ searchCompleteness: "truncated" }),
      preferred: null,
      higherHeuristicScore,
      ordered,
    };
  }
  return {
    definitive: true,
    claim: candidateSelectionClaim({ searchCompleteness: "exhaustive" }),
    preferred: first,
    higherHeuristicScore,
    ordered,
  };
}
