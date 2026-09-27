import type { BuildFixture } from "@poe2-helper/domain";
import { compareGameDataSources } from "@poe2-helper/domain";
import type { SourceCompatibility } from "@poe2-helper/domain";
import type { GraphIssue } from "./graph";
import { PassiveGraph } from "./graph";

const weaponSets = ["set1", "set2", "set3"] as const;

export type OptimizationBlocker =
  | {
      kind: "unknown-class";
      className: string;
    }
  | {
      kind: "unknown-allocated-id";
      nodeId: number;
    }
  | {
      kind: "unknown-weapon-set-id";
      set: (typeof weaponSets)[number];
      nodeId: number;
    }
  | {
      kind: "source-incompatible";
      compatibility: SourceCompatibility;
    }
  | {
      kind: "graph-issue";
      issue: GraphIssue;
    };

/**
 * Structural readiness for a later main-tree path search.
 * `ready` means the fixture and graph are safe to search. It does not mean
 * the allocation is a legal PoE2 build. Ascendancy access, weapon-set rules,
 * and point totals from level or quests are not judged here.
 */
export type OptimizationReadiness = {
  status: "ready" | "not-ready";
  blockers: readonly OptimizationBlocker[];
  diagnosticIssues: readonly GraphIssue[];
  compatibility: SourceCompatibility;
};

export class OptimizationNotReadyError extends Error {
  readonly readiness: OptimizationReadiness;

  constructor(readiness: OptimizationReadiness) {
    super("Optimization is not ready.");
    this.name = "OptimizationNotReadyError";
    this.readiness = readiness;
  }
}

/**
 * Isolated nodes are diagnostic. Every other graph issue blocks path search
 * because connectivity may be incomplete. A new issue kind must be classified
 * in this switch before it can compile.
 */
export function graphIssueBlocksOptimization(issue: GraphIssue): boolean {
  switch (issue.kind) {
    case "isolated-node":
      return false;
    case "duplicate-node":
    case "unknown-reference":
    case "non-reciprocal":
    case "edge-mismatch":
      return true;
    default: {
      const unexpected: never = issue;
      throw new Error(
        `Unclassified graph issue ${JSON.stringify(unexpected)}.`,
      );
    }
  }
}

export function assessOptimizationReadiness(
  fixture: BuildFixture,
  graph: PassiveGraph,
): OptimizationReadiness {
  const blockers: OptimizationBlocker[] = [];
  const { character } = fixture;

  if (graph.classStartNodeIds(character.className).length === 0) {
    blockers.push({ kind: "unknown-class", className: character.className });
  }

  for (const nodeId of character.allocatedPassiveIds) {
    if (!graph.hasNode(nodeId)) {
      blockers.push({ kind: "unknown-allocated-id", nodeId });
    }
  }

  for (const set of weaponSets) {
    for (const nodeId of character.weaponSetSpecialisations[set]) {
      if (!graph.hasNode(nodeId)) {
        blockers.push({ kind: "unknown-weapon-set-id", set, nodeId });
      }
    }
  }

  const compatibility = compareGameDataSources(
    character.sourceVersion,
    graph.version,
  );
  if (!compatibility.compatible) {
    blockers.push({ kind: "source-incompatible", compatibility });
  }

  const diagnosticIssues: GraphIssue[] = [];
  for (const issue of graph.issues) {
    if (graphIssueBlocksOptimization(issue)) {
      blockers.push({ kind: "graph-issue", issue });
    } else {
      diagnosticIssues.push(issue);
    }
  }

  return {
    status: blockers.length === 0 ? "ready" : "not-ready",
    blockers,
    diagnosticIssues,
    compatibility,
  };
}

/**
 * Refuses main-tree path search when the fixture and graph are not ready.
 * This function does not enumerate paths.
 */
export function requireOptimizationReadiness(
  fixture: BuildFixture,
  graph: PassiveGraph,
): OptimizationReadiness {
  const readiness = assessOptimizationReadiness(fixture, graph);
  if (readiness.status === "not-ready") {
    throw new OptimizationNotReadyError(readiness);
  }
  return readiness;
}
