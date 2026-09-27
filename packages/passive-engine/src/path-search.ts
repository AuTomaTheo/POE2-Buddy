import type { BuildFixture, PassiveNode } from "@poe2-helper/domain";
import { isAscendancyMember } from "./graph";
import type { PassiveGraph } from "./graph";
import { requireOptimizationReadiness } from "./readiness";

const weaponSets = ["set1", "set2", "set3"] as const;

export const DEFAULT_PATH_SEARCH_LIMITS = {
  maxPointBudget: 5,
  maxPaths: 500,
  maxExpansions: 20_000,
} as const;

export type PathSearchLimits = {
  maxPointBudget: number;
  maxPaths: number;
  maxExpansions: number;
};

/**
 * One connected main-tree allocation.
 * `nodeIds` is the order to take new nodes. The class start and nodes the
 * character already allocated are not included. `pointCost` comes from
 * `calculatePathPointCost`.
 */
export type MainTreePath = {
  nodeIds: readonly number[];
  pointCost: number;
};

export type SearchCompleteness = "exhaustive" | "truncated";

/**
 * The only selection claims later scoring code may attach to a search.
 * A truncated search is not exhaustive and is not globally optimal.
 */
export type CandidateSelectionClaim =
  | "best-path-found-within-search-limits"
  | "highest-scoring-path-among-enumerated-candidates";

export type MainTreePathSearch = {
  scope: "main-passive-tree";
  pointBudget: number;
  frontierNodeIds: readonly number[];
  paths: readonly MainTreePath[];
  truncated: boolean;
  searchCompleteness: SearchCompleteness;
  expansions: number;
  excludedUnpricedNodeIds: readonly number[];
  ignoredAscendancyIds: readonly number[];
  ignoredWeaponSetIds: readonly number[];
  warnings: readonly string[];
};

export class PathSearchLimitError extends Error {
  constructor(pointBudget: number, maxPointBudget: number) {
    super(
      `Point budget ${pointBudget} exceeds the path search limit of ${maxPointBudget}.`,
    );
    this.name = "PathSearchLimitError";
  }
}

export class DisconnectedAllocationError extends Error {
  readonly nodeIds: readonly number[];

  constructor(nodeIds: readonly number[]) {
    super(`Disconnected shared passive allocations: ${nodeIds.join(", ")}.`);
    this.name = "DisconnectedAllocationError";
    this.nodeIds = nodeIds;
  }
}

export class UnpricedPassiveNodeError extends Error {
  readonly nodeIds: readonly number[];

  constructor(nodeIds: readonly number[]) {
    super(`Passive node point cost is unknown for ${nodeIds.join(", ")}.`);
    this.name = "UnpricedPassiveNodeError";
    this.nodeIds = nodeIds;
  }
}

/**
 * Point cost for one node under the implemented main-tree rules.
 * A node flagged `isFree` has no verified cost, so this throws instead of
 * guessing 0 or 1.
 */
export function passiveNodePointCost(node: PassiveNode): number {
  if (node.sourceFlags.includes("isFree")) {
    throw new UnpricedPassiveNodeError([node.id]);
  }
  return 1;
}

export function calculatePathPointCost(
  graph: PassiveGraph,
  nodeIds: readonly number[],
): number {
  let total = 0;
  for (const nodeId of nodeIds) {
    total += passiveNodePointCost(graph.node(nodeId));
  }
  return total;
}

export function candidateSelectionClaim(
  result: Pick<MainTreePathSearch, "searchCompleteness">,
): CandidateSelectionClaim {
  if (result.searchCompleteness === "truncated") {
    return "best-path-found-within-search-limits";
  }
  return "highest-scoring-path-among-enumerated-candidates";
}

const scopeWarning =
  "Main-tree search only. Ascendancy access, weapon-set legality, and point totals from level or quests are not applied.";

/**
 * Enumerate connected main-tree paths that cost at most the fixture point budget.
 * Calls `requireOptimizationReadiness` first. Does not score paths.
 */
export function enumerateMainTreePaths(
  fixture: BuildFixture,
  graph: PassiveGraph,
  limits?: Partial<PathSearchLimits>,
): MainTreePathSearch {
  requireOptimizationReadiness(fixture, graph);
  const resolved = resolveLimits(limits);
  const pointBudget = fixture.goals.pointBudget;
  if (pointBudget > resolved.maxPointBudget) {
    throw new PathSearchLimitError(pointBudget, resolved.maxPointBudget);
  }

  const { character } = fixture;
  const ignoredWeaponSetIds = weaponSetOnlyIds(character);
  const ignoredWeaponSetIdSet = new Set(ignoredWeaponSetIds);
  const ignoredAscendancyIds: number[] = [];
  const allocatedMainTree = new Set<number>();

  for (const nodeId of character.allocatedPassiveIds) {
    if (isAscendancyMember(graph.node(nodeId))) {
      ignoredAscendancyIds.push(nodeId);
      continue;
    }
    allocatedMainTree.add(nodeId);
  }
  ignoredAscendancyIds.sort((left, right) => left - right);

  const component = connectedToClassStart(
    graph,
    character.className,
    allocatedMainTree,
  );
  const disconnectedAllocatedIds = [...allocatedMainTree]
    .filter((nodeId) => !component.has(nodeId))
    .sort((left, right) => left - right);
  if (disconnectedAllocatedIds.length > 0) {
    throw new DisconnectedAllocationError(disconnectedAllocatedIds);
  }
  const unpricedAllocatedIds = [...component]
    .filter((nodeId) => hasUnverifiedPointCost(graph.node(nodeId)))
    .sort((left, right) => left - right);
  if (unpricedAllocatedIds.length > 0) {
    throw new UnpricedPassiveNodeError(unpricedAllocatedIds);
  }

  const excludedUnpricedNodeIds = new Set<number>();
  const frontierNodeIds = frontierNodes(
    graph,
    component,
    ignoredWeaponSetIdSet,
    excludedUnpricedNodeIds,
  );

  const search = searchPaths(
    graph,
    component,
    ignoredWeaponSetIdSet,
    pointBudget,
    resolved,
    excludedUnpricedNodeIds,
  );
  const warnings = [
    scopeWarning,
    ...allocationWarnings(ignoredAscendancyIds, ignoredWeaponSetIds),
  ];
  if (search.truncated) {
    warnings.push(
      "Path search stopped at the configured limit. The result is not exhaustive.",
    );
  }

  return {
    scope: "main-passive-tree",
    pointBudget,
    frontierNodeIds,
    paths: search.paths,
    truncated: search.truncated,
    searchCompleteness: search.truncated ? "truncated" : "exhaustive",
    expansions: search.expansions,
    excludedUnpricedNodeIds: [...excludedUnpricedNodeIds].sort(
      (left, right) => left - right,
    ),
    ignoredAscendancyIds,
    ignoredWeaponSetIds,
    warnings,
  };
}

function resolveLimits(partial?: Partial<PathSearchLimits>): PathSearchLimits {
  const limits: PathSearchLimits = {
    ...DEFAULT_PATH_SEARCH_LIMITS,
    ...partial,
  };
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`Path search limit ${name} must be a positive integer.`);
    }
  }
  return limits;
}

function weaponSetOnlyIds(
  character: BuildFixture["character"],
): readonly number[] {
  const shared = new Set(character.allocatedPassiveIds);
  const ids = new Set<number>();
  for (const set of weaponSets) {
    for (const nodeId of character.weaponSetSpecialisations[set]) {
      if (!shared.has(nodeId)) {
        ids.add(nodeId);
      }
    }
  }
  return [...ids].sort((left, right) => left - right);
}

function connectedToClassStart(
  graph: PassiveGraph,
  className: string,
  allocatedMainTree: ReadonlySet<number>,
): Set<number> {
  const component = new Set<number>();
  const queue: number[] = [];
  for (const nodeId of graph.classStartNodeIds(className)) {
    if (isAscendancyMember(graph.node(nodeId)) || component.has(nodeId)) {
      continue;
    }
    component.add(nodeId);
    queue.push(nodeId);
  }

  let head = 0;
  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    if (current === undefined) {
      continue;
    }
    for (const neighborId of graph.neighbors(current)) {
      if (component.has(neighborId) || !allocatedMainTree.has(neighborId)) {
        continue;
      }
      component.add(neighborId);
      queue.push(neighborId);
    }
  }
  return component;
}

function frontierNodes(
  graph: PassiveGraph,
  component: ReadonlySet<number>,
  blocked: ReadonlySet<number>,
  excludedUnpricedNodeIds: Set<number>,
): number[] {
  const found = new Set<number>();
  for (const nodeId of component) {
    for (const neighborId of graph.neighbors(nodeId)) {
      if (component.has(neighborId) || blocked.has(neighborId)) {
        continue;
      }
      const neighbor = graph.node(neighborId);
      if (isAscendancyMember(neighbor)) {
        continue;
      }
      if (hasUnverifiedPointCost(neighbor)) {
        excludedUnpricedNodeIds.add(neighborId);
        continue;
      }
      found.add(neighborId);
    }
  }
  return [...found].sort((left, right) => left - right);
}

function hasUnverifiedPointCost(node: PassiveNode): boolean {
  return node.sourceFlags.includes("isFree");
}

function searchPaths(
  graph: PassiveGraph,
  component: ReadonlySet<number>,
  blocked: ReadonlySet<number>,
  pointBudget: number,
  limits: PathSearchLimits,
  excludedUnpricedNodeIds: Set<number>,
): { paths: MainTreePath[]; truncated: boolean; expansions: number } {
  const queue: number[][] = [[]];
  const seen = new Set<string>();
  const paths: MainTreePath[] = [];
  let head = 0;
  let expansions = 0;
  let truncated = false;

  while (head < queue.length) {
    if (expansions >= limits.maxExpansions) {
      truncated = true;
      break;
    }
    const path = queue[head];
    head += 1;
    if (path === undefined) {
      continue;
    }
    expansions += 1;
    const key = pathKey(path);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    if (path.length > 0) {
      const pointCost = calculatePathPointCost(graph, path);
      paths.push({ nodeIds: path, pointCost });
      if (paths.length >= limits.maxPaths) {
        truncated = hasUnseenPath(
          graph,
          component,
          blocked,
          pointBudget,
          queue,
          head,
          seen,
          path,
          excludedUnpricedNodeIds,
        );
        break;
      }
    }

    if (calculatePathPointCost(graph, path) >= pointBudget) {
      continue;
    }
    const occupied = new Set(component);
    for (const nodeId of path) {
      occupied.add(nodeId);
    }
    for (const nextId of frontierNodes(
      graph,
      occupied,
      blocked,
      excludedUnpricedNodeIds,
    )) {
      queue.push([...path, nextId]);
    }
  }

  paths.sort(
    (left, right) =>
      left.pointCost - right.pointCost ||
      compareNodeIds(left.nodeIds, right.nodeIds),
  );
  return { paths, truncated, expansions };
}

function hasUnseenPath(
  graph: PassiveGraph,
  component: ReadonlySet<number>,
  blocked: ReadonlySet<number>,
  pointBudget: number,
  queue: readonly number[][],
  head: number,
  seen: ReadonlySet<string>,
  path: readonly number[],
  excludedUnpricedNodeIds: Set<number>,
): boolean {
  for (let index = head; index < queue.length; index += 1) {
    const queued = queue[index];
    if (queued !== undefined && !seen.has(pathKey(queued))) {
      return true;
    }
  }
  if (calculatePathPointCost(graph, path) >= pointBudget) {
    return false;
  }
  const occupied = new Set(component);
  for (const nodeId of path) {
    occupied.add(nodeId);
  }
  return frontierNodes(graph, occupied, blocked, excludedUnpricedNodeIds).some(
    (nextId) => !seen.has(pathKey([...path, nextId])),
  );
}

function pathKey(path: readonly number[]): string {
  return [...path].sort((left, right) => left - right).join(",");
}

function compareNodeIds(
  left: readonly number[],
  right: readonly number[],
): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return left.length - right.length;
}

function allocationWarnings(
  ignoredAscendancyIds: readonly number[],
  ignoredWeaponSetIds: readonly number[],
): string[] {
  const warnings: string[] = [];
  if (ignoredAscendancyIds.length > 0) {
    warnings.push("Ascendancy nodes were excluded from main-tree path search.");
  }
  if (ignoredWeaponSetIds.length > 0) {
    warnings.push(
      "Weapon-set specialisations were excluded from main-tree path search.",
    );
  }
  return warnings;
}
