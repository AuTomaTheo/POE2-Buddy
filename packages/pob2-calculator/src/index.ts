export {
  APPROVED_CALCULATOR_MAPPINGS,
  checkCompatibility,
  findApprovedMapping,
} from "./compatibility.js";
export type {
  ApprovedCalculatorMapping,
  CompatibilityInput,
} from "./compatibility.js";
export {
  computeMetricDeltas,
  formatAbsoluteDelta,
  formatMetricValue,
  formatPercentDelta,
  sameMetricMap,
} from "./delta.js";
export type { DeltaComputation, MetricDelta, RawMetricMap } from "./delta.js";
export {
  CALCULATOR_ERROR_CODES,
  calculatorError,
  isCalculatorErrorCode,
} from "./errors.js";
export type { CalculatorError, CalculatorErrorCode } from "./errors.js";
export {
  calculateBaseline,
  claimedPointCostMatches,
  evaluateItemReplacement,
  evaluatePassiveCandidate,
  evaluatePassiveCandidates,
  outcomeFromResponse,
} from "./evaluate.js";
export type {
  BaselineResult,
  CalculatorOutcome,
  CalculatorProvenance,
  CalculatorReadiness,
  CalculatorTransport,
  CharacterDeltaResult,
  EvaluatePassiveInput,
  ItemDeltaResult,
  ItemIdentity,
  PassiveCandidateInput,
} from "./evaluate.js";
export {
  ALLOCATION_MODES,
  CALCULATOR_ADAPTER_VERSION,
  CALCULATOR_PROTOCOL_VERSION,
  METRIC_DEFINITIONS,
  allowsPercentDelta,
  metricDefinition,
} from "./metrics.js";
export type {
  AllocationMode,
  MetricCategory,
  MetricDefinition,
  MetricId,
  MetricUnit,
} from "./metrics.js";
export {
  MAX_CANDIDATE_BATCH,
  MAX_CANDIDATE_NODES,
  parseWorkerResponse,
  skillIdentitySchema,
  workerResponseSchema,
} from "./protocol.js";
export type { SkillIdentity, WorkerResponse } from "./protocol.js";
export {
  IsolatedPob2Worker,
  MAX_LOADED_BUILDS,
  MAX_WORKER_AGE_MS,
  WORKER_STARTUP_TIMEOUT_MS,
  assertIsolatedRuntimeDir,
  liveInstallPath,
  readRuntimeManifest,
  shouldRecycleWorker,
  workerEnvironment,
} from "./worker.js";
export type { RuntimeManifest } from "./worker.js";
export {
  FINGERPRINT_INCLUDED_DIRECTORIES,
  fingerprintIncludes,
  runtimeFingerprint,
} from "./fingerprint.js";
export {
  ITEM_REPLACEMENT_SLOTS,
  MAX_ITEM_TEXT_CHARS,
  itemReplacementRejection,
  itemTextChecksum,
  pobSlotForReplacement,
} from "./items.js";
export type { ItemReplacementInput, ItemReplacementSlot } from "./items.js";
