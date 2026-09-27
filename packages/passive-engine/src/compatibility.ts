import type { PassiveTreeSnapshot } from "@poe2-helper/domain";
import { PassiveGraph, type GraphIssue } from "./graph.js";
import { graphIssueBlocksOptimization } from "./readiness.js";
import {
  highPriorityFamilyReport,
  passiveStatSemanticCoverage,
  type HighPriorityFamilyReport,
} from "./semantic.js";
import { unrecognizedStatInventory } from "./stat-inventory.js";
import { unmappedStructuredInventory } from "./unmapped-inventory.js";

export type ClassStartChange = {
  classIndex: number;
  className: string;
  kind: "node-changed" | "added" | "removed";
  previousNodeId: number | null;
  candidateNodeId: number | null;
};

export type PassiveTreeCoverageReport = {
  totalStatLines: number;
  structurallyParsedLines: number;
  structuralCoverageRatio: number;
  semanticallyMappedLines: number;
  semanticCoverageRatio: number;
  unrecognizedLines: number;
  structuredButUnmappedLines: number;
  nodeCount: number;
  edgeCount: number;
  isolatedNodeCount: number;
};

export type PassiveTreeCompatibility = {
  compatible: boolean;
  version: string | null;
  commit: string | null;
  graph: {
    blockingDiagnostics: readonly GraphIssue[];
    nonBlockingDiagnostics: readonly GraphIssue[];
  };
  classes: {
    compatible: boolean;
    changes: readonly ClassStartChange[];
  };
  coverage: PassiveTreeCoverageReport & {
    delta: PassiveTreeCoverageDelta | null;
  };
  highPriorityFamilies: readonly HighPriorityFamilyReport[];
  mechanics: {
    newSemanticIds: readonly string[];
    newStructuredUnmapped: readonly string[];
    newUnrecognizedPatterns: readonly string[];
    removedSemanticIds: readonly string[];
  };
  scoring: {
    mappedButUnweighted: readonly string[];
  };
  blockingReasons: readonly string[];
  warnings: readonly string[];
};

export type PassiveTreeCoverageDelta = {
  totalStatLines: number;
  structuralCoverageRatio: number;
  semanticCoverageRatio: number;
  unrecognizedLines: number;
  structuredButUnmappedLines: number;
  nodeCount: number;
  edgeCount: number;
  isolatedNodeCount: number;
};

export function assessPassiveTreeCompatibility(input: {
  candidate: PassiveTreeSnapshot;
  current?: PassiveTreeSnapshot | null;
  candidateClassCount?: number;
  weightedSemanticIds: readonly string[];
}): PassiveTreeCompatibility {
  const graph = PassiveGraph.fromSnapshot(input.candidate);
  const blockingDiagnostics = graph.issues
    .filter((issue) => graphIssueBlocksOptimization(issue))
    .sort(compareIssues);
  const nonBlockingDiagnostics = graph.issues
    .filter((issue) => !graphIssueBlocksOptimization(issue))
    .sort(compareIssues);
  const families = highPriorityFamilyReport(input.candidate.nodes);
  const coverage = coverageReport(
    input.candidate,
    nonBlockingDiagnostics.filter((issue) => issue.kind === "isolated-node")
      .length,
  );
  const currentCoverage =
    input.current === undefined || input.current === null
      ? null
      : coverageReport(
          input.current,
          PassiveGraph.fromSnapshot(input.current).issues.filter(
            (issue) => issue.kind === "isolated-node",
          ).length,
        );
  const classReport = classStartReport(
    input.candidate,
    input.current ?? null,
    input.candidateClassCount,
  );
  const mechanics = mechanicReport(input.candidate, input.current ?? null);
  const weighted = new Set(input.weightedSemanticIds);
  const mappedButUnweighted = semanticIds(input.candidate).filter(
    (semanticId) => !weighted.has(semanticId),
  );
  const blockingReasons = [
    ...blockingDiagnostics.map(
      (issue) => `Graph diagnostic: ${describeGraphIssue(issue)}.`,
    ),
    ...classReport.reasons,
    ...families
      .filter((family) => family.blocking)
      .map(
        (family) =>
          `High-priority family ${family.familyId} blocks promotion. ${family.reason}`,
      ),
  ];
  const warnings = compatibilityWarnings({
    nonBlockingDiagnostics,
    classChanges: classReport.changes,
    coverage,
    currentCoverage,
    families,
    mechanics,
    mappedButUnweighted,
  });

  return {
    compatible: blockingReasons.length === 0,
    version: input.candidate.version.version ?? null,
    commit: input.candidate.version.commit ?? null,
    graph: { blockingDiagnostics, nonBlockingDiagnostics },
    classes: {
      compatible: classReport.reasons.length === 0,
      changes: classReport.changes,
    },
    coverage: {
      ...coverage,
      delta:
        currentCoverage === null
          ? null
          : {
              totalStatLines:
                coverage.totalStatLines - currentCoverage.totalStatLines,
              structuralCoverageRatio: round1(
                coverage.structuralCoverageRatio -
                  currentCoverage.structuralCoverageRatio,
              ),
              semanticCoverageRatio: round1(
                coverage.semanticCoverageRatio -
                  currentCoverage.semanticCoverageRatio,
              ),
              unrecognizedLines:
                coverage.unrecognizedLines - currentCoverage.unrecognizedLines,
              structuredButUnmappedLines:
                coverage.structuredButUnmappedLines -
                currentCoverage.structuredButUnmappedLines,
              nodeCount: coverage.nodeCount - currentCoverage.nodeCount,
              edgeCount: coverage.edgeCount - currentCoverage.edgeCount,
              isolatedNodeCount:
                coverage.isolatedNodeCount - currentCoverage.isolatedNodeCount,
            },
    },
    highPriorityFamilies: families,
    mechanics,
    scoring: { mappedButUnweighted },
    blockingReasons,
    warnings,
  };
}

export function formatPassiveTreeCompatibility(
  report: PassiveTreeCompatibility,
): string {
  const lines = [
    "Passive-tree candidate compatibility",
    "",
    `Version: ${report.version ?? "unknown"}`,
    `Commit: ${report.commit ?? "unknown"}`,
    "",
    "Graph:",
    `  blocking diagnostics: ${report.graph.blockingDiagnostics.length}`,
    `  warnings: ${report.graph.nonBlockingDiagnostics.length}`,
    "",
    "Coverage:",
    `  structural: ${report.coverage.structuralCoverageRatio.toFixed(1)}%`,
    `  semantic:   ${report.coverage.semanticCoverageRatio.toFixed(1)}%`,
  ];
  if (report.coverage.delta) {
    lines.push(
      `  semantic delta: ${signed(report.coverage.delta.semanticCoverageRatio)} pp`,
    );
  }
  lines.push(
    "",
    "High-priority families:",
    `  blocking: ${report.highPriorityFamilies.filter((family) => family.blocking).length}`,
    "",
    "New mechanics:",
    `  recognized: ${report.mechanics.newSemanticIds.length}`,
    `  structured-unmapped: ${report.mechanics.newStructuredUnmapped.length}`,
    `  unrecognized families: ${report.mechanics.newUnrecognizedPatterns.length}`,
    "",
    "Optimizer compatibility:",
    report.compatible ? "  PASS" : "  FAIL",
  );
  if (!report.compatible) {
    lines.push("", "Blocking reasons:");
    for (const reason of report.blockingReasons) {
      lines.push(`- ${reason}`);
    }
    lines.push("", "Current snapshot was not changed.");
  }
  if (report.warnings.length > 0) {
    lines.push("", "Warnings:");
    for (const warning of report.warnings) {
      lines.push(`- ${warning}`);
    }
  }
  return lines.join("\n");
}

function coverageReport(
  snapshot: PassiveTreeSnapshot,
  isolatedNodeCount: number,
): PassiveTreeCoverageReport {
  const semantic = passiveStatSemanticCoverage(snapshot.nodes);
  return {
    totalStatLines: semantic.lineCount,
    structurallyParsedLines: semantic.recognizedLineCount,
    structuralCoverageRatio: semantic.extractionCoveragePercent,
    semanticallyMappedLines: semantic.semanticLineCount,
    semanticCoverageRatio: semantic.semanticCoveragePercent,
    unrecognizedLines: semantic.unrecognizedLineCount,
    structuredButUnmappedLines: unmappedStructuredInventory(snapshot.nodes)
      .lineCount,
    nodeCount: snapshot.nodes.length,
    edgeCount: snapshot.edges.length,
    isolatedNodeCount,
  };
}

function classStartReport(
  candidate: PassiveTreeSnapshot,
  current: PassiveTreeSnapshot | null,
  candidateClassCount: number | undefined,
): { reasons: readonly string[]; changes: readonly ClassStartChange[] } {
  const reasons: string[] = [];
  const changes: ClassStartChange[] = [];
  const nodeIds = new Set(candidate.nodes.map((node) => node.id));
  const starts = [...candidate.classStarts].sort(compareClassStarts);
  const presentIndexes = new Set(starts.map((start) => start.classIndex));

  for (const start of starts) {
    if (!nodeIds.has(start.nodeId)) {
      reasons.push(
        `Class ${start.className} starts at unknown node ${start.nodeId}.`,
      );
    }
  }

  if (candidateClassCount !== undefined) {
    for (let index = 0; index < candidateClassCount; index += 1) {
      if (!presentIndexes.has(index)) {
        reasons.push(`Missing expected class index ${index}.`);
      }
    }
  }

  if (current) {
    const currentStarts = [...current.classStarts].sort(compareClassStarts);
    const candidateByIndex = new Map(
      starts.map((start) => [start.classIndex, start]),
    );
    const candidateNames = new Set(starts.map((start) => start.className));
    const sharedNodeIds = new Set<number>();
    const namesByNode = new Map<number, string[]>();
    for (const start of currentStarts) {
      const names = namesByNode.get(start.nodeId) ?? [];
      names.push(start.className);
      namesByNode.set(start.nodeId, names);
      if (names.length > 1) sharedNodeIds.add(start.nodeId);
    }

    for (const start of currentStarts) {
      if (candidateNames.has(start.className)) continue;
      const shared = sharedNodeIds.has(start.nodeId);
      reasons.push(
        shared
          ? `Missing shared class-start for ${start.className}, previously node ${start.nodeId}.`
          : `Missing class start for ${start.className}.`,
      );
      changes.push({
        classIndex: start.classIndex,
        className: start.className,
        kind: "removed",
        previousNodeId: start.nodeId,
        candidateNodeId: null,
      });
    }

    for (const start of currentStarts) {
      const next = candidateByIndex.get(start.classIndex);
      if (!next || next.className !== start.className) continue;
      if (next.nodeId === start.nodeId) continue;
      changes.push({
        classIndex: start.classIndex,
        className: start.className,
        kind: "node-changed",
        previousNodeId: start.nodeId,
        candidateNodeId: next.nodeId,
      });
    }

    for (const start of starts) {
      if (currentStarts.some((item) => item.className === start.className)) {
        continue;
      }
      changes.push({
        classIndex: start.classIndex,
        className: start.className,
        kind: "added",
        previousNodeId: null,
        candidateNodeId: start.nodeId,
      });
    }
  }

  changes.sort(
    (left, right) =>
      left.classIndex - right.classIndex ||
      left.className.localeCompare(right.className) ||
      left.kind.localeCompare(right.kind),
  );
  return { reasons, changes };
}

function mechanicReport(
  candidate: PassiveTreeSnapshot,
  current: PassiveTreeSnapshot | null,
): PassiveTreeCompatibility["mechanics"] {
  if (!current) {
    return {
      newSemanticIds: [],
      newStructuredUnmapped: [],
      newUnrecognizedPatterns: [],
      removedSemanticIds: [],
    };
  }
  return {
    newSemanticIds: difference(semanticIds(candidate), semanticIds(current)),
    removedSemanticIds: difference(
      semanticIds(current),
      semanticIds(candidate),
    ),
    newStructuredUnmapped: difference(
      unmappedIds(candidate),
      unmappedIds(current),
    ),
    newUnrecognizedPatterns: difference(
      unrecognizedIds(candidate),
      unrecognizedIds(current),
    ),
  };
}

function compatibilityWarnings(input: {
  nonBlockingDiagnostics: readonly GraphIssue[];
  classChanges: readonly ClassStartChange[];
  coverage: PassiveTreeCoverageReport;
  currentCoverage: PassiveTreeCoverageReport | null;
  families: readonly HighPriorityFamilyReport[];
  mechanics: PassiveTreeCompatibility["mechanics"];
  mappedButUnweighted: readonly string[];
}): string[] {
  const warnings: string[] = [];
  const isolated = input.nonBlockingDiagnostics.filter(
    (issue) => issue.kind === "isolated-node",
  ).length;
  if (isolated > 0) {
    warnings.push(
      `${isolated} isolated nodes are diagnostic and do not block promotion.`,
    );
  }
  for (const change of input.classChanges) {
    if (change.kind === "removed") continue;
    if (change.kind === "added") {
      warnings.push(
        `Class ${change.className} start was added at node ${change.candidateNodeId}.`,
      );
      continue;
    }
    warnings.push(
      `Class ${change.className} start moved from node ${change.previousNodeId} to node ${change.candidateNodeId}.`,
    );
  }
  if (
    input.currentCoverage &&
    input.coverage.semanticCoverageRatio <
      input.currentCoverage.semanticCoverageRatio
  ) {
    warnings.push(
      `Semantic coverage changed from ${input.currentCoverage.semanticCoverageRatio.toFixed(1)}% to ${input.coverage.semanticCoverageRatio.toFixed(1)}%.`,
    );
  }
  for (const family of input.families) {
    if (!family.presentInScoringDomain || family.blocking) continue;
    if (
      family.supportStatus === "supported-semantically" ||
      family.supportStatus === "supported-structurally"
    ) {
      continue;
    }
    warnings.push(
      `High-priority family ${family.familyId} is ${family.supportStatus}. Its omission stays visible, so it does not block promotion.`,
    );
  }
  if (input.mechanics.newSemanticIds.length > 0) {
    warnings.push(
      `New semantic ids: ${input.mechanics.newSemanticIds.join(", ")}.`,
    );
  }
  if (input.mechanics.newStructuredUnmapped.length > 0) {
    warnings.push(
      `New structured-unmapped patterns: ${input.mechanics.newStructuredUnmapped.join(", ")}.`,
    );
  }
  if (input.mechanics.newUnrecognizedPatterns.length > 0) {
    warnings.push(
      `New unrecognized patterns: ${input.mechanics.newUnrecognizedPatterns.join(", ")}.`,
    );
  }
  if (input.mechanics.removedSemanticIds.length > 0) {
    warnings.push(
      `Removed semantic ids: ${input.mechanics.removedSemanticIds.join(", ")}.`,
    );
  }
  if (input.mappedButUnweighted.length > 0) {
    warnings.push(
      `Mapped but unweighted semantic ids: ${input.mappedButUnweighted.join(", ")}.`,
    );
  }
  return warnings;
}

function semanticIds(snapshot: PassiveTreeSnapshot): readonly string[] {
  return passiveStatSemanticCoverage(snapshot.nodes).semanticById.map(
    (entry) => entry.semanticId,
  );
}

function unmappedIds(snapshot: PassiveTreeSnapshot): readonly string[] {
  return unmappedStructuredInventory(snapshot.nodes).families.map(
    (family) => family.familyId,
  );
}

function unrecognizedIds(snapshot: PassiveTreeSnapshot): readonly string[] {
  return unrecognizedStatInventory(snapshot.nodes).families.map(
    (family) => family.familyId,
  );
}

function difference(
  left: readonly string[],
  right: readonly string[],
): readonly string[] {
  const excluded = new Set(right);
  return left
    .filter((value) => !excluded.has(value))
    .sort((first, second) => first.localeCompare(second));
}

function compareClassStarts(
  left: { classIndex: number; className: string },
  right: { classIndex: number; className: string },
): number {
  return (
    left.classIndex - right.classIndex ||
    left.className.localeCompare(right.className)
  );
}

function compareIssues(left: GraphIssue, right: GraphIssue): number {
  return describeGraphIssue(left).localeCompare(describeGraphIssue(right));
}

function describeGraphIssue(issue: GraphIssue): string {
  switch (issue.kind) {
    case "duplicate-node":
      return `duplicate-node ${issue.nodeId}`;
    case "unknown-reference":
      return `unknown-reference ${issue.referencedId} via ${issue.via}`;
    case "non-reciprocal":
      return `non-reciprocal ${issue.fromNodeId}-${issue.toNodeId}`;
    case "edge-mismatch":
      return `edge-mismatch ${issue.fromNodeId}-${issue.toNodeId} ${issue.detail}`;
    case "isolated-node":
      return `isolated-node ${issue.nodeId}`;
    default: {
      const unexpected: never = issue;
      return JSON.stringify(unexpected);
    }
  }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function signed(value: number): string {
  const text = value.toFixed(1);
  return value > 0 ? `+${text}` : text;
}
