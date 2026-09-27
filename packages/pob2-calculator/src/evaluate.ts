import { checkCompatibility } from "./compatibility.js";
import { computeMetricDeltas, sameMetricMap } from "./delta.js";
import { calculatorError, type CalculatorError } from "./errors.js";
import {
  ALLOCATION_MODES,
  CALCULATOR_ADAPTER_VERSION,
  CALCULATOR_PROTOCOL_VERSION,
  type AllocationMode,
} from "./metrics.js";
import {
  itemReplacementRejection,
  itemTextChecksum,
  pobSlotForReplacement,
} from "./items.js";
import {
  MAX_CANDIDATE_BATCH,
  MAX_CANDIDATE_NODES,
  parseWorkerResponse,
  type AllocationReport,
  type SkillIdentity,
  type WorkerResponse,
} from "./protocol.js";
import type { MetricDelta } from "./delta.js";

export type CalculatorReadiness =
  "ready" | "incompatible" | "unavailable" | "partial";

export type CalculatorProvenance = {
  pobVersion: string;
  pobTreeKey: string;
  buddyTreeVersion: string;
  buddyTreeCommit: string | null;
  buddyTreeChecksum: string | null;
  adapterVersion: number;
  protocolVersion: number;
  buildChecksum: string;
  runtimeChecksum: string;
  runtimeFingerprint: string;
};

export type CharacterDeltaResult = {
  readiness: Exclude<CalculatorReadiness, "incompatible" | "unavailable">;
  baseline: {
    metrics: MetricDelta[];
    skill: SkillIdentity;
  };
  candidate: {
    requestedNodeIds: readonly number[];
    verifiedNodeIds: readonly number[];
    actuallyAllocatedNodeIds: readonly number[];
    allocationMode: AllocationMode;
    verifiedPointCost: number;
    skill: SkillIdentity;
  };
  metrics: readonly MetricDelta[];
  restoreVerified: true;
  provenance: CalculatorProvenance;
  warnings: readonly string[];
  weaponSetNodes: readonly { id: number; allocMode: number }[];
};

export type CalculatorOutcome =
  | { ok: true; result: CharacterDeltaResult }
  | { ok: false; error: CalculatorError; allocation?: AllocationReport };

export type CalculatorTransport = {
  request(payload: unknown, timeoutMs: number): Promise<unknown>;
  discard(): void;
  runtimeFingerprint?: string | null;
};

export type PassiveCandidateInput = {
  nodeIds: readonly number[];
  allocationMode: AllocationMode;
  /** Point cost recomputed by the server from passive-engine rules. */
  verifiedPointCost: number;
};

export type EvaluatePassiveInput = {
  xml: string;
  buildChecksum: string;
  pobTreeKey: string;
  gggVersion: string;
  pobVersion: string;
  buddyTreeCommit?: string | null;
  buddyTreeChecksum?: string | null;
  runtimeChecksum: string;
  runtimeFingerprint: string;
  candidate: PassiveCandidateInput;
  transport: CalculatorTransport;
  timeoutMs?: number;
  requestId?: string;
};

const DEFAULT_TIMEOUT_MS = 30_000;

function invalidCandidate(
  nodeIds: readonly number[],
  allocationMode: string,
): boolean {
  if (!(ALLOCATION_MODES as readonly string[]).includes(allocationMode))
    return true;
  if (nodeIds.length === 0 || nodeIds.length > MAX_CANDIDATE_NODES) return true;
  const seen = new Set<number>();
  for (const id of nodeIds) {
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) return true;
    seen.add(id);
  }
  return false;
}

function sameIdSet(left: readonly number[], right: readonly number[]): boolean {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort((a, b) => a - b);
  const sortedRight = [...right].sort((a, b) => a - b);
  return sortedLeft.every((id, index) => id === sortedRight[index]);
}

function idDifference(
  expected: readonly number[],
  actual: readonly number[],
): { missing: number[]; unexpected: number[] } {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  return {
    missing: [...expected]
      .filter((id) => !actualSet.has(id))
      .sort((a, b) => a - b),
    unexpected: [...actual]
      .filter((id) => !expectedSet.has(id))
      .sort((a, b) => a - b),
  };
}

export function claimedPointCostMatches(
  claimed: number | null,
  verified: number,
): boolean {
  return Number.isInteger(verified) && verified >= 0 && claimed === verified;
}

function verifiedPointCostAccepted(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function skillUnresolved(skill: SkillIdentity): boolean {
  return skill.name === null || skill.name.length === 0;
}

export async function evaluatePassiveCandidate(
  input: EvaluatePassiveInput,
): Promise<CalculatorOutcome> {
  const compatibility = checkCompatibility({
    pobTreeKey: input.pobTreeKey,
    gggVersion: input.gggVersion,
    pobVersion: input.pobVersion,
  });
  if (!compatibility.ok) return compatibility;

  if (
    invalidCandidate(input.candidate.nodeIds, input.candidate.allocationMode)
  ) {
    return { ok: false, error: calculatorError("candidate-invalid") };
  }
  if (!verifiedPointCostAccepted(input.candidate.verifiedPointCost)) {
    return { ok: false, error: calculatorError("candidate-invalid") };
  }
  if (input.xml.trim().length === 0) {
    return { ok: false, error: calculatorError("build-load-failed") };
  }

  const requestId = input.requestId ?? crypto.randomUUID();
  let raw: unknown;
  try {
    raw = await input.transport.request(
      {
        requestId,
        protocolVersion: CALCULATOR_PROTOCOL_VERSION,
        action: "evaluate-passive-candidate",
        buildXml: input.xml,
        candidate: {
          nodeIds: [...input.candidate.nodeIds],
          allocationMode: input.candidate.allocationMode,
        },
        expectTree: compatibility.mapping.pobTreeKey,
        expectPob: compatibility.mapping.pobVersion,
      },
      input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
  } catch (error) {
    return transportFailure(error, input.transport);
  }

  const response = parseWorkerResponse(raw);
  if (!response || response.requestId !== requestId) {
    input.transport.discard();
    return { ok: false, error: calculatorError("protocol-invalid") };
  }
  return outcomeFromResponse(response, input);
}

export function outcomeFromResponse(
  response: WorkerResponse,
  input: EvaluatePassiveInput,
): CalculatorOutcome {
  if (!response.ok) {
    if (
      response.error?.code === "candidate-allocation-mismatch" &&
      response.baseline &&
      response.restoreMetrics &&
      !sameMetricMap(response.baseline.metrics, response.restoreMetrics)
    ) {
      input.transport.discard();
      return { ok: false, error: calculatorError("restore-failed") };
    }
    const code = response.error?.code;
    if (
      code === "restore-failed" ||
      code === "worker-crashed" ||
      code === "timeout"
    ) {
      input.transport.discard();
    }
    if (code) {
      return {
        ok: false,
        error: calculatorError(code),
        ...(response.allocation ? { allocation: response.allocation } : {}),
      };
    }
    return { ok: false, error: calculatorError("calculation-failed") };
  }
  if (response.protocolVersion !== CALCULATOR_PROTOCOL_VERSION) {
    input.transport.discard();
    return { ok: false, error: calculatorError("protocol-invalid") };
  }
  if (
    response.pobVersion !== input.pobVersion ||
    response.treeKey !== input.pobTreeKey ||
    !response.baseline ||
    !response.candidate ||
    !response.restoreMetrics
  ) {
    input.transport.discard();
    return { ok: false, error: calculatorError("version-incompatible") };
  }
  if (!sameMetricMap(response.baseline.metrics, response.restoreMetrics)) {
    input.transport.discard();
    return { ok: false, error: calculatorError("restore-failed") };
  }
  if (response.candidate.allocationMode !== input.candidate.allocationMode) {
    input.transport.discard();
    return { ok: false, error: calculatorError("protocol-invalid") };
  }
  if (
    !sameIdSet(input.candidate.nodeIds, response.candidate.allocatedNodeIds)
  ) {
    const difference = idDifference(
      input.candidate.nodeIds,
      response.candidate.allocatedNodeIds,
    );
    return {
      ok: false,
      error: calculatorError("candidate-allocation-mismatch"),
      allocation: {
        requestedNodeIds: [...input.candidate.nodeIds],
        expectedNodeIds: [...input.candidate.nodeIds],
        actuallyAllocatedNodeIds: [...response.candidate.allocatedNodeIds],
        unexpectedNodeIds: difference.unexpected,
        missingNodeIds: difference.missing,
        allocationMode: input.candidate.allocationMode,
      },
    };
  }

  const computed = computeMetricDeltas(
    response.baseline.metrics,
    response.candidate.metrics,
  );
  const warnings: string[] = [];
  if (computed.unsupportedFields.length > 0) {
    warnings.push("unsupported metric");
  }
  if (skillUnresolved(response.baseline.skill)) {
    warnings.push("selected skill unresolved");
  }
  if (input.candidate.allocationMode !== "shared") {
    warnings.push("weapon-set candidate");
  }

  const baselineRows = computeMetricDeltas(
    response.baseline.metrics,
    response.baseline.metrics,
  ).metrics;

  return {
    ok: true,
    result: {
      readiness: skillUnresolved(response.baseline.skill) ? "partial" : "ready",
      baseline: {
        metrics: baselineRows,
        skill: response.baseline.skill,
      },
      candidate: {
        requestedNodeIds: [...input.candidate.nodeIds],
        verifiedNodeIds: [...input.candidate.nodeIds],
        actuallyAllocatedNodeIds: [...response.candidate.allocatedNodeIds],
        allocationMode: response.candidate.allocationMode,
        verifiedPointCost: input.candidate.verifiedPointCost,
        skill: response.candidate.skill,
      },
      metrics: computed.metrics,
      restoreVerified: true,
      provenance: {
        pobVersion: response.pobVersion,
        pobTreeKey: response.treeKey,
        buddyTreeVersion: input.gggVersion,
        buddyTreeCommit: input.buddyTreeCommit ?? null,
        buddyTreeChecksum: input.buddyTreeChecksum ?? null,
        adapterVersion: CALCULATOR_ADAPTER_VERSION,
        protocolVersion: CALCULATOR_PROTOCOL_VERSION,
        buildChecksum: input.buildChecksum,
        runtimeChecksum: input.runtimeChecksum,
        runtimeFingerprint: resolvedFingerprint(input),
      },
      warnings,
      weaponSetNodes: response.weaponSetNodes ?? [],
    },
  };
}

export type BaselineResult = {
  readiness: "ready" | "partial";
  skill: SkillIdentity;
  metrics: readonly MetricDelta[];
  weaponSetNodes: readonly { id: number; allocMode: number }[];
  provenance: CalculatorProvenance;
  warnings: readonly string[];
};

export async function calculateBaseline(
  input: Omit<EvaluatePassiveInput, "candidate">,
): Promise<
  { ok: true; result: BaselineResult } | { ok: false; error: CalculatorError }
> {
  const compatibility = checkCompatibility({
    pobTreeKey: input.pobTreeKey,
    gggVersion: input.gggVersion,
    pobVersion: input.pobVersion,
  });
  if (!compatibility.ok) return compatibility;
  if (input.xml.trim().length === 0) {
    return { ok: false, error: calculatorError("build-load-failed") };
  }
  const requestId = input.requestId ?? crypto.randomUUID();
  let raw: unknown;
  try {
    raw = await input.transport.request(
      {
        requestId,
        protocolVersion: CALCULATOR_PROTOCOL_VERSION,
        action: "baseline",
        buildXml: input.xml,
        expectTree: compatibility.mapping.pobTreeKey,
        expectPob: compatibility.mapping.pobVersion,
      },
      input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
  } catch (error) {
    return transportFailure(error, input.transport);
  }
  const response = parseWorkerResponse(raw);
  if (!response || response.requestId !== requestId) {
    input.transport.discard();
    return { ok: false, error: calculatorError("protocol-invalid") };
  }
  if (!response.ok) {
    return {
      ok: false,
      error: calculatorError(response.error?.code ?? "calculation-failed"),
    };
  }
  if (
    response.pobVersion !== input.pobVersion ||
    response.treeKey !== input.pobTreeKey ||
    !response.baseline
  ) {
    input.transport.discard();
    return { ok: false, error: calculatorError("version-incompatible") };
  }
  const warnings: string[] = [];
  if (skillUnresolved(response.baseline.skill)) {
    warnings.push("selected skill unresolved");
  }
  return {
    ok: true,
    result: {
      readiness: skillUnresolved(response.baseline.skill) ? "partial" : "ready",
      skill: response.baseline.skill,
      metrics: computeMetricDeltas(
        response.baseline.metrics,
        response.baseline.metrics,
      ).metrics,
      weaponSetNodes: response.weaponSetNodes ?? [],
      provenance: provenanceFor(input, response.pobVersion, response.treeKey),
      warnings,
    },
  };
}

function provenanceFor(
  input: Omit<EvaluatePassiveInput, "candidate">,
  pobVersion: string,
  treeKey: string,
): CalculatorProvenance {
  return {
    pobVersion,
    pobTreeKey: treeKey,
    buddyTreeVersion: input.gggVersion,
    buddyTreeCommit: input.buddyTreeCommit ?? null,
    buddyTreeChecksum: input.buddyTreeChecksum ?? null,
    adapterVersion: CALCULATOR_ADAPTER_VERSION,
    protocolVersion: CALCULATOR_PROTOCOL_VERSION,
    buildChecksum: input.buildChecksum,
    runtimeChecksum: input.runtimeChecksum,
    runtimeFingerprint: resolvedFingerprint(input),
  };
}

function resolvedFingerprint(
  input: Omit<EvaluatePassiveInput, "candidate">,
): string {
  return input.transport.runtimeFingerprint || input.runtimeFingerprint;
}

function transportFailure(
  error: unknown,
  transport: CalculatorTransport,
): { ok: false; error: CalculatorError } {
  const code = error instanceof Error ? error.message : "";
  transport.discard();
  if (code === "timeout")
    return { ok: false, error: calculatorError("timeout") };
  if (code === "worker-crashed") {
    return { ok: false, error: calculatorError("worker-crashed") };
  }
  if (code === "runtime-integrity-mismatch") {
    return { ok: false, error: calculatorError("runtime-integrity-mismatch") };
  }
  return { ok: false, error: calculatorError("protocol-invalid") };
}

export type ItemIdentity = {
  slot: string;
  pobSlot: string;
  id: number | null;
  rawChecksum: string | null;
  label: string | null;
};

export type ItemDeltaResult = {
  readiness: "ready" | "partial";
  slot: string;
  baselineItem: ItemIdentity;
  candidateItem: ItemIdentity;
  skill: SkillIdentity;
  metrics: readonly MetricDelta[];
  restoreVerified: true;
  provenance: CalculatorProvenance;
  warnings: readonly string[];
};

export async function evaluateItemReplacement(
  input: Omit<EvaluatePassiveInput, "candidate"> & {
    item: { slot: string; rawItemText: string; label?: string };
  },
): Promise<
  { ok: true; result: ItemDeltaResult } | { ok: false; error: CalculatorError }
> {
  const compatibility = checkCompatibility({
    pobTreeKey: input.pobTreeKey,
    gggVersion: input.gggVersion,
    pobVersion: input.pobVersion,
  });
  if (!compatibility.ok) return compatibility;
  const rejection = itemReplacementRejection(input.item);
  if (rejection) return { ok: false, error: calculatorError(rejection) };
  const pobSlot = pobSlotForReplacement(input.item.slot);
  if (!pobSlot)
    return { ok: false, error: calculatorError("item-slot-unsupported") };
  if (input.xml.trim().length === 0) {
    return { ok: false, error: calculatorError("build-load-failed") };
  }

  const requestId = input.requestId ?? crypto.randomUUID();
  let raw: unknown;
  try {
    raw = await input.transport.request(
      {
        requestId,
        protocolVersion: CALCULATOR_PROTOCOL_VERSION,
        action: "evaluate-item-replacement",
        buildXml: input.xml,
        item: { slot: pobSlot, rawText: input.item.rawItemText },
        expectTree: compatibility.mapping.pobTreeKey,
        expectPob: compatibility.mapping.pobVersion,
      },
      input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
  } catch (error) {
    return transportFailure(error, input.transport);
  }

  const response = parseWorkerResponse(raw);
  if (!response || response.requestId !== requestId) {
    input.transport.discard();
    return { ok: false, error: calculatorError("protocol-invalid") };
  }
  if (!response.ok) {
    if (response.error?.code === "restore-failed") input.transport.discard();
    return {
      ok: false,
      error: calculatorError(response.error?.code ?? "item-replacement-failed"),
    };
  }
  if (
    response.pobVersion !== input.pobVersion ||
    response.treeKey !== input.pobTreeKey ||
    !response.baseline ||
    !response.item ||
    !response.restoreMetrics ||
    response.item.slot !== pobSlot
  ) {
    input.transport.discard();
    return { ok: false, error: calculatorError("protocol-invalid") };
  }
  if (!sameMetricMap(response.baseline.metrics, response.restoreMetrics)) {
    input.transport.discard();
    return { ok: false, error: calculatorError("restore-failed") };
  }
  if (response.item.restoredItemId !== response.item.baselineItemId) {
    input.transport.discard();
    return { ok: false, error: calculatorError("restore-failed") };
  }

  const computed = computeMetricDeltas(
    response.baseline.metrics,
    response.item.metrics,
  );
  const warnings: string[] = [];
  if (computed.unsupportedFields.length > 0)
    warnings.push("unsupported metric");
  if (skillUnresolved(response.baseline.skill)) {
    warnings.push("selected skill unresolved");
  }
  const baselineRaw = response.item.baselineItemRaw;
  return {
    ok: true,
    result: {
      readiness: skillUnresolved(response.baseline.skill) ? "partial" : "ready",
      slot: input.item.slot,
      baselineItem: {
        slot: input.item.slot,
        pobSlot,
        id: response.item.baselineItemId,
        rawChecksum:
          baselineRaw === null ? null : itemTextChecksum(baselineRaw),
        label: null,
      },
      candidateItem: {
        slot: input.item.slot,
        pobSlot,
        id: null,
        rawChecksum: itemTextChecksum(input.item.rawItemText),
        label: input.item.label ?? null,
      },
      skill: response.item.skill,
      metrics: computed.metrics,
      restoreVerified: true,
      provenance: provenanceFor(input, response.pobVersion, response.treeKey),
      warnings,
    },
  };
}

export async function evaluatePassiveCandidates(
  input: Omit<EvaluatePassiveInput, "candidate"> & {
    candidates: readonly PassiveCandidateInput[];
  },
): Promise<CalculatorOutcome[]> {
  if (input.candidates.length > MAX_CANDIDATE_BATCH) {
    return [{ ok: false, error: calculatorError("candidate-invalid") }];
  }
  const results: CalculatorOutcome[] = [];
  for (const candidate of input.candidates) {
    const outcome = await evaluatePassiveCandidate({ ...input, candidate });
    results.push(outcome);
    if (
      !outcome.ok &&
      (outcome.error.code === "restore-failed" ||
        outcome.error.code === "timeout" ||
        outcome.error.code === "worker-crashed")
    ) {
      break;
    }
  }
  return results;
}
