export type LayoutNode = {
  id: number;
  name: string;
  x: number | null;
  y: number | null;
};

export type AllocationStep = {
  step: number;
  id: number;
  name: string;
};

export type PathNodeComparison = {
  shared: readonly number[];
  onlyLeft: readonly number[];
  onlyRight: readonly number[];
};

export type MapPoint = {
  id: number;
  name: string;
  x: number;
  y: number;
  role: "current" | "proposed" | "shared" | "other";
  step: number | null;
};

export type MapEdge = {
  from: number;
  to: number;
  kind: "current-link" | "proposed" | "other";
};

export type PathMap = {
  points: readonly MapPoint[];
  edges: readonly MapEdge[];
  viewBox: string;
};

export function pathKey(nodeIds: readonly number[]): string {
  return nodeIds.join(",");
}

export function nodeLabel(
  node: Pick<LayoutNode, "id" | "name"> | undefined,
  id: number,
): string {
  const name = node?.name.trim() ?? "";
  return name.length > 0 ? name : `#${id}`;
}

export function allocationSteps(
  nodeIds: readonly number[],
  nodes: ReadonlyMap<number, LayoutNode>,
): AllocationStep[] {
  return nodeIds.map((id, index) => ({
    step: index + 1,
    id,
    name: nodeLabel(nodes.get(id), id),
  }));
}

/**
 * Set difference in path order. Shared nodes keep the left path's order.
 * This does not score or rank the paths.
 */
export function comparePathNodeSets(
  left: readonly number[],
  right: readonly number[],
): PathNodeComparison {
  const rightSet = new Set(right);
  const leftSet = new Set(left);
  return {
    shared: left.filter((id) => rightSet.has(id)),
    onlyLeft: left.filter((id) => !rightSet.has(id)),
    onlyRight: right.filter((id) => !leftSet.has(id)),
  };
}

export function buildPathMap(input: {
  proposedIds: readonly number[];
  otherIds?: readonly number[];
  entryNodeId: number | null;
  otherEntryNodeId?: number | null;
  nodes: ReadonlyMap<number, LayoutNode>;
}): PathMap | null {
  if (input.proposedIds.length === 0 && (input.otherIds?.length ?? 0) === 0) {
    return null;
  }
  const shared = new Set(
    comparePathNodeSets(input.proposedIds, input.otherIds ?? []).shared,
  );
  const points: MapPoint[] = [];
  const seen = new Set<number>();

  function add(
    id: number,
    role: MapPoint["role"],
    step: number | null,
  ): LayoutNode | null {
    if (seen.has(id)) return input.nodes.get(id) ?? null;
    const node = input.nodes.get(id);
    if (!node || node.x === null || node.y === null) return null;
    seen.add(id);
    points.push({
      id,
      name: nodeLabel(node, id),
      x: node.x,
      y: node.y,
      role,
      step,
    });
    return node;
  }

  const required: number[] = [...input.proposedIds];
  if (input.entryNodeId !== null) required.push(input.entryNodeId);
  for (const id of input.otherIds ?? []) required.push(id);
  if (input.otherEntryNodeId !== null && input.otherEntryNodeId !== undefined) {
    required.push(input.otherEntryNodeId);
  }
  if (required.some((id) => !hasPosition(input.nodes.get(id)))) return null;

  if (input.entryNodeId !== null) add(input.entryNodeId, "current", null);
  input.proposedIds.forEach((id, index) => {
    add(id, shared.has(id) ? "shared" : "proposed", index + 1);
  });
  if (
    input.otherEntryNodeId !== null &&
    input.otherEntryNodeId !== undefined &&
    input.otherEntryNodeId !== input.entryNodeId
  ) {
    add(input.otherEntryNodeId, "current", null);
  }
  (input.otherIds ?? []).forEach((id, index) => {
    add(id, shared.has(id) ? "shared" : "other", index + 1);
  });

  const edges: MapEdge[] = [];
  if (input.entryNodeId !== null && input.proposedIds[0] !== undefined) {
    edges.push({
      from: input.entryNodeId,
      to: input.proposedIds[0],
      kind: "current-link",
    });
  }
  for (let index = 0; index < input.proposedIds.length - 1; index += 1) {
    const from = input.proposedIds[index];
    const to = input.proposedIds[index + 1];
    if (from === undefined || to === undefined) continue;
    edges.push({ from, to, kind: "proposed" });
  }
  if (
    input.otherEntryNodeId !== null &&
    input.otherEntryNodeId !== undefined &&
    input.otherIds?.[0] !== undefined
  ) {
    edges.push({
      from: input.otherEntryNodeId,
      to: input.otherIds[0],
      kind: "current-link",
    });
  }
  for (let index = 0; index < (input.otherIds?.length ?? 0) - 1; index += 1) {
    const from = input.otherIds?.[index];
    const to = input.otherIds?.[index + 1];
    if (from === undefined || to === undefined) continue;
    edges.push({ from, to, kind: "other" });
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 1);
  const pad = span * 0.2;
  return {
    points,
    edges,
    viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`,
  };
}

function hasPosition(node: LayoutNode | undefined): boolean {
  return node !== undefined && node.x !== null && node.y !== null;
}
