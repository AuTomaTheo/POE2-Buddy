import type {
  ClassStart,
  GameDataVersion,
  PassiveEdge,
  PassiveNode,
  PassiveNodeId,
  PassiveNodeKind,
  PassiveTreeSnapshot,
} from "@poe2-helper/domain";

export type PassiveGraphSource = Pick<
  PassiveTreeSnapshot,
  "version" | "nodes" | "edges" | "classStarts"
>;

export type GraphIssue =
  | {
      kind: "duplicate-node";
      nodeId: number;
    }
  | {
      kind: "unknown-reference";
      referencedId: number;
      via: "neighbor" | "edge" | "class-start";
      fromNodeId?: number;
    }
  | {
      kind: "non-reciprocal";
      fromNodeId: number;
      toNodeId: number;
    }
  | {
      kind: "edge-mismatch";
      fromNodeId: number;
      toNodeId: number;
      detail: "missing-edge" | "edge-without-neighbor-link";
    }
  | {
      kind: "isolated-node";
      nodeId: number;
    };

/**
 * Adjacency view of a passive-tree snapshot.
 * Travel nodes use the domain kind `small`. Ascendancy membership stays on
 * `ascendancyId` and the `ascendancy-start` kind.
 */
export class PassiveGraph {
  readonly version: GameDataVersion;
  readonly issues: readonly GraphIssue[];

  private readonly nodesById: ReadonlyMap<number, PassiveNode>;
  private readonly neighborsById: ReadonlyMap<number, readonly number[]>;
  private readonly classStarts: readonly ClassStart[];

  private constructor(
    version: GameDataVersion,
    nodesById: ReadonlyMap<number, PassiveNode>,
    neighborsById: ReadonlyMap<number, readonly number[]>,
    classStarts: readonly ClassStart[],
    issues: readonly GraphIssue[],
  ) {
    this.version = version;
    this.nodesById = nodesById;
    this.neighborsById = neighborsById;
    this.classStarts = classStarts;
    this.issues = issues;
  }

  static fromSnapshot(source: PassiveGraphSource): PassiveGraph {
    const assembled = assemblePassiveGraph(source);
    return new PassiveGraph(
      assembled.version,
      assembled.nodesById,
      assembled.neighborsById,
      assembled.classStarts,
      assembled.issues,
    );
  }

  hasNode(id: PassiveNodeId): boolean {
    return this.nodesById.has(id);
  }

  node(id: PassiveNodeId): PassiveNode {
    const found = this.nodesById.get(id);
    if (!found) {
      throw new Error(`Unknown passive node ${id}.`);
    }
    return found;
  }

  neighbors(id: PassiveNodeId): readonly number[] {
    const neighbors = this.neighborsById.get(id);
    if (!neighbors) {
      throw new Error(`Unknown passive node ${id}.`);
    }
    return neighbors;
  }

  nodesOfKind(kind: PassiveNodeKind): readonly PassiveNode[] {
    return [...this.nodesById.values()]
      .filter((node) => node.kinds.includes(kind))
      .sort((left, right) => left.id - right.id);
  }

  classStartNodeIds(className: string): readonly number[] {
    return this.classStarts
      .filter((classStart) => classStart.className === className)
      .map((classStart) => classStart.nodeId);
  }
}

export function isAscendancyMember(node: PassiveNode): boolean {
  return (
    node.ascendancyId !== undefined || node.kinds.includes("ascendancy-start")
  );
}

function assemblePassiveGraph(source: PassiveGraphSource): {
  version: GameDataVersion;
  nodesById: ReadonlyMap<number, PassiveNode>;
  neighborsById: ReadonlyMap<number, readonly number[]>;
  classStarts: readonly ClassStart[];
  issues: readonly GraphIssue[];
} {
  const issues: GraphIssue[] = [];
  const nodesById = new Map<number, PassiveNode>();

  for (const node of source.nodes) {
    if (nodesById.has(node.id)) {
      issues.push({ kind: "duplicate-node", nodeId: node.id });
      continue;
    }
    nodesById.set(node.id, node);
  }

  const neighborsById = new Map<number, number[]>();
  for (const node of nodesById.values()) {
    const neighbors: number[] = [];
    const seen = new Set<number>();
    for (const neighborId of node.neighborIds) {
      if (seen.has(neighborId)) {
        continue;
      }
      seen.add(neighborId);
      if (!nodesById.has(neighborId)) {
        issues.push({
          kind: "unknown-reference",
          referencedId: neighborId,
          fromNodeId: node.id,
          via: "neighbor",
        });
        continue;
      }
      neighbors.push(neighborId);
    }
    neighborsById.set(node.id, neighbors);
    if (neighbors.length === 0) {
      issues.push({ kind: "isolated-node", nodeId: node.id });
    }
  }

  for (const [nodeId, neighbors] of neighborsById) {
    for (const neighborId of neighbors) {
      const reverse = neighborsById.get(neighborId) ?? [];
      if (!reverse.includes(nodeId)) {
        issues.push({
          kind: "non-reciprocal",
          fromNodeId: nodeId,
          toNodeId: neighborId,
        });
      }
    }
  }

  const reciprocalPairs = new Set<string>();
  for (const [nodeId, neighbors] of neighborsById) {
    for (const neighborId of neighbors) {
      if (
        nodeId < neighborId &&
        (neighborsById.get(neighborId) ?? []).includes(nodeId)
      ) {
        reciprocalPairs.add(pairKey(nodeId, neighborId));
      }
    }
  }

  const edgePairs = new Set<string>();
  for (const edge of source.edges) {
    reportMissingEdgeEndpoint(edge, nodesById, issues);
    if (!nodesById.has(edge.fromNodeId) || !nodesById.has(edge.toNodeId)) {
      continue;
    }
    const key = pairKey(edge.fromNodeId, edge.toNodeId);
    edgePairs.add(key);
    const fromNeighbors = neighborsById.get(edge.fromNodeId) ?? [];
    const toNeighbors = neighborsById.get(edge.toNodeId) ?? [];
    if (
      !fromNeighbors.includes(edge.toNodeId) ||
      !toNeighbors.includes(edge.fromNodeId)
    ) {
      issues.push({
        kind: "edge-mismatch",
        fromNodeId: edge.fromNodeId,
        toNodeId: edge.toNodeId,
        detail: "edge-without-neighbor-link",
      });
    }
  }

  for (const key of reciprocalPairs) {
    if (!edgePairs.has(key)) {
      const [fromNodeId, toNodeId] = key.split("-").map(Number);
      issues.push({
        kind: "edge-mismatch",
        fromNodeId: fromNodeId ?? 0,
        toNodeId: toNodeId ?? 0,
        detail: "missing-edge",
      });
    }
  }

  for (const classStart of source.classStarts) {
    if (!nodesById.has(classStart.nodeId)) {
      issues.push({
        kind: "unknown-reference",
        referencedId: classStart.nodeId,
        via: "class-start",
      });
    }
  }

  return {
    version: source.version,
    nodesById,
    neighborsById,
    classStarts: source.classStarts,
    issues,
  };
}

function reportMissingEdgeEndpoint(
  edge: PassiveEdge,
  nodesById: ReadonlyMap<number, PassiveNode>,
  issues: GraphIssue[],
): void {
  if (!nodesById.has(edge.fromNodeId)) {
    issues.push({
      kind: "unknown-reference",
      referencedId: edge.fromNodeId,
      via: "edge",
    });
  }
  if (!nodesById.has(edge.toNodeId)) {
    issues.push({
      kind: "unknown-reference",
      referencedId: edge.toNodeId,
      via: "edge",
    });
  }
}

function pairKey(left: number, right: number): string {
  return left < right ? `${left}-${right}` : `${right}-${left}`;
}
