import {
  calculatorError,
  claimedPointCostMatches,
  evaluatePassiveCandidate,
  formatAbsoluteDelta,
  formatMetricValue,
  formatPercentDelta,
  type CalculatorError,
} from "@poe2-helper/pob2-calculator";
import {
  decodePob2Export,
  getPinnedPassiveTreeSnapshot,
  importPob2Build,
  pob2AscendancyNodeIds,
} from "@poe2-helper/data-sources";
import {
  runPassiveAnalysis,
  defaultSnapshotDirectory,
} from "./analyze-passive-build";
import { openCalculator } from "./pob2-session";

export type PassiveDeltaRow = {
  label: string;
  before: string;
  after: string;
  absolute: string;
  percent: string | null;
};

export type PassiveDeltaView = {
  status: "disabled" | "error" | "ready" | "partial";
  message: string;
  code?: string;
  skillName?: string | null;
  requestedNodeIds?: number[];
  verifiedNodeIds?: number[];
  actuallyAllocatedNodeIds?: number[];
  verifiedPointCost?: number | null;
  allocationVerified?: boolean;
  rows?: PassiveDeltaRow[];
  warnings?: string[];
  provenance?: {
    pobVersion: string;
    pobTreeKey: string;
    buddyTreeVersion: string;
    adapterVersion: number;
    protocolVersion: number;
    runtimeFingerprint: string;
  };
};

type VerifiedCandidateSource = {
  rankedCompleteCandidates: readonly {
    nodeIds: readonly number[];
    pointCost: number;
  }[];
  incompleteCandidates: readonly {
    nodeIds: readonly number[];
    pointCost: number;
  }[];
};

export function selectVerifiedPassiveCandidate(
  recommendation: VerifiedCandidateSource,
  nodeIds: readonly number[],
  claimedPointCost: number | null,
): { verifiedPointCost: number } | null {
  const requested = nodeIds.join(",");
  const match = [
    ...recommendation.rankedCompleteCandidates,
    ...recommendation.incompleteCandidates,
  ].find((candidate) => candidate.nodeIds.join(",") === requested);
  if (!match || !claimedPointCostMatches(claimedPointCost, match.pointCost)) {
    return null;
  }
  return { verifiedPointCost: match.pointCost };
}

function failure(error: CalculatorError): PassiveDeltaView {
  return { status: "error", code: error.code, message: error.message };
}

export async function measurePassiveDelta(input: {
  pob2Code: string;
  nodeIds: readonly number[];
  pointCost: number | null;
  objective: string;
  pointBudget: string;
}): Promise<PassiveDeltaView> {
  const opened = openCalculator();
  if (!opened.ok) return failure(opened.error);
  const { manifest, worker } = opened;

  let xml: string;
  let buildChecksum: string;
  try {
    const decoded = decodePob2Export(input.pob2Code);
    xml = decoded.xml;
    buildChecksum = decoded.checksum;
  } catch {
    return failure(calculatorError("build-load-failed"));
  }

  const snapshot = getPinnedPassiveTreeSnapshot({
    snapshotDirectory: defaultSnapshotDirectory(),
    logger: () => undefined,
  });
  const imported = importPob2Build(input.pob2Code, {
    nodeIds: new Set(snapshot.nodes.map((node) => node.id)),
    ascendancyNodeIds: pob2AscendancyNodeIds(snapshot.nodes),
    source: snapshot.version.source,
    version: snapshot.version.version,
    commit: snapshot.version.commit,
    checksum: snapshot.version.checksum,
  });
  if (
    !imported.ok ||
    !imported.document.treeVersion ||
    !snapshot.version.version
  ) {
    return failure(calculatorError("version-incompatible"));
  }

  const analysis = runPassiveAnalysis({
    fixtureId: "",
    fixtureJson: "",
    objective: input.objective,
    pointBudget: input.pointBudget,
    importSource: "pob2",
    pob2Code: input.pob2Code,
  });
  if (!analysis.ok) return failure(calculatorError("candidate-invalid"));
  const verified = selectVerifiedPassiveCandidate(
    analysis.recommendation,
    input.nodeIds,
    input.pointCost,
  );
  if (!verified) return failure(calculatorError("candidate-invalid"));

  const started = Date.now();
  const outcome = await evaluatePassiveCandidate({
    xml,
    buildChecksum,
    pobTreeKey: imported.document.treeVersion,
    gggVersion: snapshot.version.version,
    pobVersion: manifest.pobVersion,
    buddyTreeCommit: snapshot.version.commit ?? null,
    buddyTreeChecksum: snapshot.version.checksum ?? null,
    runtimeChecksum: manifest.runtimeChecksum,
    runtimeFingerprint: manifest.runtimeFingerprint,
    candidate: {
      nodeIds: input.nodeIds,
      allocationMode: "shared",
      verifiedPointCost: verified.verifiedPointCost,
    },
    transport: worker,
  });
  console.info(
    `pob2-calculator pob=${manifest.pobVersion} tree=${imported.document.treeVersion} runtime=${manifest.runtimeChecksum} build=${buildChecksum} status=${outcome.ok ? outcome.result.readiness : outcome.error.code} durationMs=${Date.now() - started}`,
  );
  if (!outcome.ok) return failure(outcome.error);

  return {
    status: outcome.result.readiness,
    message: "Restore check passed.",
    skillName: outcome.result.baseline.skill.name,
    requestedNodeIds: [...outcome.result.candidate.requestedNodeIds],
    verifiedNodeIds: [...outcome.result.candidate.verifiedNodeIds],
    actuallyAllocatedNodeIds: [
      ...outcome.result.candidate.actuallyAllocatedNodeIds,
    ],
    verifiedPointCost: outcome.result.candidate.verifiedPointCost,
    allocationVerified: true,
    warnings: [...outcome.result.warnings],
    provenance: {
      pobVersion: outcome.result.provenance.pobVersion,
      pobTreeKey: outcome.result.provenance.pobTreeKey,
      buddyTreeVersion: outcome.result.provenance.buddyTreeVersion,
      adapterVersion: outcome.result.provenance.adapterVersion,
      protocolVersion: outcome.result.provenance.protocolVersion,
      runtimeFingerprint: outcome.result.provenance.runtimeFingerprint,
    },
    rows: outcome.result.metrics.map((metric) => ({
      label: metric.label,
      before: formatMetricValue(metric.before, metric.unit),
      after: formatMetricValue(metric.after, metric.unit),
      absolute: formatAbsoluteDelta(metric),
      percent: formatPercentDelta(metric),
    })),
  };
}
