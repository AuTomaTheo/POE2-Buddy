import { PassiveGraph, type PassiveGraphSource } from "./graph";

export { isAscendancyMember, PassiveGraph } from "./graph";
export type { GraphIssue, PassiveGraphSource } from "./graph";
export {
  assessOptimizationReadiness,
  graphIssueBlocksOptimization,
  OptimizationNotReadyError,
  requireOptimizationReadiness,
} from "./readiness";
export type { OptimizationBlocker, OptimizationReadiness } from "./readiness";
export {
  DEFAULT_PATH_SEARCH_LIMITS,
  DisconnectedAllocationError,
  PathSearchLimitError,
  UnpricedPassiveNodeError,
  calculatePathPointCost,
  candidateSelectionClaim,
  enumerateMainTreePaths,
  passiveNodePointCost,
} from "./path-search";
export type {
  CandidateSelectionClaim,
  MainTreePath,
  MainTreePathSearch,
  PathSearchLimits,
  SearchCompleteness,
} from "./path-search";
export {
  extractPassiveNodeStats,
  parsePassiveStatLine,
  passiveStatCoverage,
} from "./stats";
export type {
  PassiveNodeStats,
  PassiveStatCoverage,
  PassiveStatForm,
  PassiveStatLine,
  PassiveStatUnit,
  PassiveOperation,
  RecognizedPassiveStat,
  UnrecognizedPassiveStat,
} from "./stats";
export { parsePassiveStatExpression, effectStatIdentity } from "./grammar";
export type {
  MarkupRef,
  ParsedPassiveEffect,
  ParsedPassiveStatExpression,
  StatClause,
  StatDirection,
} from "./grammar";
export { markupVisible, tokenizePassiveStat } from "./tokenize";
export type {
  MarkupToken,
  NumberToken,
  PunctuationToken,
  RangeToken,
  StatToken,
  WordToken,
} from "./tokenize";
export {
  EXTRACTION_COVERAGE_TARGET_PERCENT,
  HIGH_PRIORITY_FAMILIES,
  REQUIRED_SEMANTIC_IDS,
  REQUIRED_STRUCTURAL_OPERATIONS,
  UNSUPPORTED_HIGH_PRIORITY_FAMILIES,
  assessStatScoringReadiness,
  decideStatScoringReadiness,
  highPriorityFamilyBlocks,
  highPriorityFamilyReport,
  passiveStatSemanticCoverage,
  semanticFamilyForEffect,
  semanticPassiveStat,
  semanticPassiveStats,
  structuralOperationsPresent,
} from "./semantic";
export type {
  HighPriorityFamilyReport,
  HighPriorityFamilyStatus,
  PassiveStatSemanticCoverage,
  SemanticPassiveStat,
  StatScoringReadiness,
} from "./semantic";
export {
  unrecognizedStatFamilyId,
  unrecognizedStatInventory,
  unrecognizedStatOccurrences,
} from "./stat-inventory";
export type {
  UnrecognizedStatFamily,
  UnrecognizedStatInventory,
  UnrecognizedStatOccurrence,
} from "./stat-inventory";
export {
  unmappedStructuredFamilyId,
  unmappedStructuredInventory,
} from "./unmapped-inventory";
export type {
  UnmappedStructuredFamily,
  UnmappedStructuredInventory,
} from "./unmapped-inventory";
export {
  PATH_CONFIDENCE_HIGH_PERCENT,
  PATH_CONFIDENCE_PARTIAL_PERCENT,
  pathScoringConfidence,
  pathSemanticCoverage,
} from "./path-coverage";
export type {
  PathScoringConfidence,
  PathSemanticCoverage,
} from "./path-coverage";

export function buildPassiveGraph(source: PassiveGraphSource): PassiveGraph {
  return PassiveGraph.fromSnapshot(source);
}
export {
  assessPassiveTreeCompatibility,
  formatPassiveTreeCompatibility,
} from "./compatibility";
export type {
  ClassStartChange,
  PassiveTreeCompatibility,
  PassiveTreeCoverageDelta,
  PassiveTreeCoverageReport,
} from "./compatibility";
