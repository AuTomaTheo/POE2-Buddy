import type { PassiveNode } from "@poe2-helper/domain";
import { semanticPassiveStats } from "./semantic.js";
import { parsePassiveStatLine } from "./stats.js";

export const PATH_CONFIDENCE_HIGH_PERCENT = 90;
export const PATH_CONFIDENCE_PARTIAL_PERCENT = 70;

export type PathScoringConfidence = "complete" | "high" | "partial" | "low";

export type PathSemanticCoverage = {
  nodeCount: number;
  totalStatLines: number;
  semanticallyMappedLines: number;
  structurallyParsedOnlyLines: number;
  unrecognizedLines: number;
  semanticCoverageRatio: number;
  structuralCoverageRatio: number;
  unsupportedRawLines: readonly string[];
  confidence: PathScoringConfidence;
};

function ratio(part: number, total: number): number {
  if (total === 0) return 1;
  return Math.round((part / total) * 10000) / 10000;
}

export function pathScoringConfidence(
  semanticallyMappedLines: number,
  totalStatLines: number,
): PathScoringConfidence {
  if (totalStatLines === 0 || semanticallyMappedLines === totalStatLines) {
    return "complete";
  }
  if (
    semanticallyMappedLines * 100 >=
    totalStatLines * PATH_CONFIDENCE_HIGH_PERCENT
  ) {
    return "high";
  }
  if (
    semanticallyMappedLines * 100 >=
    totalStatLines * PATH_CONFIDENCE_PARTIAL_PERCENT
  ) {
    return "partial";
  }
  return "low";
}

export function pathSemanticCoverage(
  nodes: readonly Pick<PassiveNode, "id" | "rawStats">[],
): PathSemanticCoverage {
  let semanticallyMappedLines = 0;
  let structurallyParsedOnlyLines = 0;
  let unrecognizedLines = 0;
  const unsupportedRawLines: string[] = [];

  for (const node of nodes) {
    for (const raw of node.rawStats) {
      const line = parsePassiveStatLine(raw);
      if (line.status === "unrecognized") {
        unrecognizedLines += 1;
        unsupportedRawLines.push(raw);
        continue;
      }
      if (semanticPassiveStats(line) === null) {
        structurallyParsedOnlyLines += 1;
        unsupportedRawLines.push(raw);
        continue;
      }
      semanticallyMappedLines += 1;
    }
  }

  const totalStatLines =
    semanticallyMappedLines + structurallyParsedOnlyLines + unrecognizedLines;

  return {
    nodeCount: nodes.length,
    totalStatLines,
    semanticallyMappedLines,
    structurallyParsedOnlyLines,
    unrecognizedLines,
    semanticCoverageRatio: ratio(semanticallyMappedLines, totalStatLines),
    structuralCoverageRatio: ratio(
      semanticallyMappedLines + structurallyParsedOnlyLines,
      totalStatLines,
    ),
    unsupportedRawLines,
    confidence: pathScoringConfidence(semanticallyMappedLines, totalStatLines),
  };
}
