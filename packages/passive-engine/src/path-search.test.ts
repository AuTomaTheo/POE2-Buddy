import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PassiveNode } from "@poe2-helper/domain";
import { parseBuildFixture } from "@poe2-helper/domain";
import {
  developmentPassiveTreeSnapshotDirectory,
  loadBuildFixture,
  loadPinnedPassiveTreeSnapshot,
} from "@poe2-helper/data-sources";
import { describe, expect, it } from "vitest";
import type { PassiveGraphSource } from "./graph";
import { isAscendancyMember } from "./graph";
import {
  DisconnectedAllocationError,
  UnpricedPassiveNodeError,
  calculatePathPointCost,
  candidateSelectionClaim,
  enumerateMainTreePaths,
  passiveNodePointCost,
  PathSearchLimitError,
} from "./index";
import { buildPassiveGraph } from "./index";
import { OptimizationNotReadyError } from "./readiness";

const version = {
  source: "fixture",
  version: "path-search-test",
  commit: "abc123",
  fetchedAt: "2026-09-26T00:00:00.000Z",
};

function node(
  id: number,
  neighborIds: number[],
  extras?: Partial<Pick<PassiveNode, "ascendancyId" | "kinds" | "sourceFlags">>,
): PassiveGraphSource["nodes"][number] {
  return {
    id,
    name: `Node ${id}`,
    rawStats: [],
    neighborIds,
    kinds: extras?.kinds ?? ["small"],
    sourceFlags: extras?.sourceFlags ?? [],
    ascendancyId: extras?.ascendancyId,
  };
}

function edge(fromNodeId: number, toNodeId: number) {
  return { fromNodeId, toNodeId };
}

function buildFixture(options?: {
  allocatedPassiveIds?: number[];
  weaponSet1?: number[];
  pointBudget?: number;
  className?: string;
}) {
  return parseBuildFixture({
    character: {
      level: 10,
      className: options?.className ?? "Witch",
      allocatedPassiveIds: options?.allocatedPassiveIds ?? [1],
      weaponSetSpecialisations: {
        set1: options?.weaponSet1 ?? [],
        set2: [],
        set3: [],
      },
      questStats: [],
      skills: [],
      equipment: [],
      sourceVersion: version,
    },
    goals: {
      objective: "offensive",
      pointBudget: options?.pointBudget ?? 2,
    },
  });
}

const classStarts = [{ classIndex: 1, className: "Witch", nodeId: 1 }];

function sampleGraph() {
  return buildPassiveGraph({
    version,
    classStarts,
    nodes: [
      node(1, [2, 3, 6]),
      node(2, [1, 3, 4]),
      node(3, [1, 2]),
      node(4, [2, 9]),
      node(9, [4]),
      node(5, []),
      node(6, [1], { kinds: ["ascendancy-start"], ascendancyId: "Witch1" }),
    ],
    edges: [
      edge(1, 2),
      edge(1, 3),
      edge(1, 6),
      edge(2, 3),
      edge(2, 4),
      edge(4, 9),
    ],
  });
}

describe("main-tree path search", () => {
  it("enumerates connected branches, dedupes orders, and skips unreachable nodes", () => {
    const graph = sampleGraph();
    const result = enumerateMainTreePaths(buildFixture(), graph);

    expect(result.scope).toBe("main-passive-tree");
    expect(result.frontierNodeIds).toEqual([2, 3]);
    expect(result.paths.map((path) => path.nodeIds)).toEqual([
      [2],
      [3],
      [2, 3],
      [2, 4],
    ]);
    expect(result.paths.every((path) => path.pointCost <= 2)).toBe(true);
    expect(
      result.paths.every(
        (path) =>
          path.pointCost === path.nodeIds.length &&
          path.pointCost === calculatePathPointCost(graph, path.nodeIds),
      ),
    ).toBe(true);
    expect(result.truncated).toBe(false);
    expect(result.searchCompleteness).toBe("exhaustive");
    expect(candidateSelectionClaim(result)).toBe(
      "highest-scoring-path-among-enumerated-candidates",
    );
    expect(result.excludedUnpricedNodeIds).toEqual([]);
    for (const path of result.paths) {
      expect(new Set(path.nodeIds).size).toBe(path.nodeIds.length);
      expect(path.nodeIds).not.toContain(5);
      expect(path.nodeIds).not.toContain(6);
      expect(path.nodeIds).not.toContain(9);
      expect(path.nodeIds).not.toContain(1);
    }
    expect(enumerateMainTreePaths(buildFixture(), graph)).toEqual(result);
  });

  it("does not repeat nodes when the graph has a cycle", () => {
    const graph = sampleGraph();
    const result = enumerateMainTreePaths(
      buildFixture({ pointBudget: 3 }),
      graph,
    );

    expect(result.paths.some((path) => path.nodeIds.includes(9))).toBe(true);
    for (const path of result.paths) {
      expect(new Set(path.nodeIds).size).toBe(path.nodeIds.length);
      expect(path.pointCost).toBeLessThanOrEqual(3);
    }
    expect(result.paths.map((path) => path.nodeIds)).not.toContainEqual([
      2, 3, 2,
    ]);
  });

  it("refuses a shared allocation that is disconnected from the class start", () => {
    const graph = sampleGraph();
    let caught: unknown;
    try {
      enumerateMainTreePaths(
        buildFixture({ allocatedPassiveIds: [1, 9], pointBudget: 1 }),
        graph,
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(DisconnectedAllocationError);
    expect((caught as DisconnectedAllocationError).nodeIds).toEqual([9]);
  });

  it("excludes ascendancy nodes and weapon-set ids from the main-tree search", () => {
    const graph = sampleGraph();
    const ascendancy = enumerateMainTreePaths(
      buildFixture({ allocatedPassiveIds: [1, 6], pointBudget: 1 }),
      graph,
    );
    const weaponSet = enumerateMainTreePaths(
      buildFixture({ weaponSet1: [3], pointBudget: 1 }),
      graph,
    );

    expect(ascendancy.ignoredAscendancyIds).toEqual([6]);
    expect(ascendancy.frontierNodeIds).toEqual([2, 3]);
    expect(ascendancy.paths.flatMap((path) => path.nodeIds)).not.toContain(6);
    expect(weaponSet.ignoredWeaponSetIds).toEqual([3]);
    expect(weaponSet.frontierNodeIds).toEqual([2]);
    expect(weaponSet.paths.map((path) => path.nodeIds)).toEqual([[2]]);
    expect(weaponSet.warnings.join(" ")).toContain("Weapon-set");

    const distantWeaponSet = enumerateMainTreePaths(
      buildFixture({ weaponSet1: [9], pointBudget: 1 }),
      graph,
    );
    expect(distantWeaponSet.ignoredWeaponSetIds).toEqual([9]);
    expect(distantWeaponSet.paths.map((path) => path.nodeIds)).toEqual([
      [2],
      [3],
    ]);
  });

  it("stops when the path cap is reached and refuses a budget above the limit", () => {
    const graph = sampleGraph();
    const capped = enumerateMainTreePaths(buildFixture(), graph, {
      maxPaths: 1,
    });

    expect(capped.truncated).toBe(true);
    expect(capped.searchCompleteness).toBe("truncated");
    expect(candidateSelectionClaim(capped)).toBe(
      "best-path-found-within-search-limits",
    );
    expect(capped.paths).toEqual([{ nodeIds: [2], pointCost: 1 }]);
    expect(capped.warnings.join(" ")).toContain("not exhaustive");

    const expansionCapped = enumerateMainTreePaths(buildFixture(), graph, {
      maxExpansions: 1,
    });
    expect(expansionCapped.truncated).toBe(true);
    expect(expansionCapped.searchCompleteness).toBe("truncated");
    expect(expansionCapped.paths).toEqual([]);

    expect(() =>
      enumerateMainTreePaths(buildFixture({ pointBudget: 6 }), graph),
    ).toThrow(PathSearchLimitError);
  });

  it("refuses to search when optimization is not ready", () => {
    const graph = buildPassiveGraph({
      version,
      classStarts,
      nodes: [node(1, [2]), node(2, [])],
      edges: [],
    });

    expect(() => enumerateMainTreePaths(buildFixture(), graph)).toThrow(
      OptimizationNotReadyError,
    );
  });

  it("returns no paths when the point budget is zero", () => {
    const graph = sampleGraph();
    const result = enumerateMainTreePaths(
      buildFixture({ pointBudget: 0 }),
      graph,
    );

    expect(result.paths).toEqual([]);
    expect(result.frontierNodeIds).toEqual([2, 3]);
    expect(result.truncated).toBe(false);
    expect(result.searchCompleteness).toBe("exhaustive");
  });

  it("excludes an unpriced isFree neighbor and refuses an allocated one", () => {
    const graph = buildPassiveGraph({
      version,
      classStarts,
      nodes: [
        node(1, [2, 7]),
        node(2, [1]),
        node(7, [1], { sourceFlags: ["isFree"] }),
      ],
      edges: [edge(1, 2), edge(1, 7)],
    });
    const result = enumerateMainTreePaths(
      buildFixture({ pointBudget: 1 }),
      graph,
    );

    expect(result.paths.map((path) => path.nodeIds)).toEqual([[2]]);
    expect(result.excludedUnpricedNodeIds).toEqual([7]);
    expect(result.paths[0]?.pointCost).toBe(1);
    expect(() => passiveNodePointCost(graph.node(7))).toThrow(
      UnpricedPassiveNodeError,
    );

    let caught: unknown;
    try {
      enumerateMainTreePaths(
        buildFixture({ allocatedPassiveIds: [1, 7], pointBudget: 1 }),
        graph,
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(UnpricedPassiveNodeError);
    expect((caught as UnpricedPassiveNodeError).nodeIds).toEqual([7]);
  });
});

describe("pinned build fixtures", () => {
  const snapshot = loadPinnedPassiveTreeSnapshot({
    snapshotDirectory: developmentPassiveTreeSnapshotDirectory,
    logger: () => undefined,
  });
  const graph = buildPassiveGraph(snapshot);
  const fixtureDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../data-sources/fixtures/builds",
  );

  it("keeps Witch and Warrior paths inside the budget and off ascendancy nodes", () => {
    for (const name of ["witch-offensive.json", "warrior-defensive.json"]) {
      const loaded = loadBuildFixture({
        filePath: path.join(fixtureDirectory, name),
        snapshot,
      });
      const first = enumerateMainTreePaths(loaded.fixture, graph);
      const second = enumerateMainTreePaths(loaded.fixture, graph);

      expect(second).toEqual(first);
      expect(first.scope).toBe("main-passive-tree");
      expect(first.pointBudget).toBe(loaded.fixture.goals.pointBudget);
      expect(first.pointBudget).toBeGreaterThan(0);
      expect(first.frontierNodeIds.length).toBeGreaterThan(0);
      expect(first.paths.length).toBeGreaterThan(0);
      expect(first.searchCompleteness).toBe(
        first.truncated ? "truncated" : "exhaustive",
      );
      for (const path of first.paths) {
        expect(path.pointCost).toBeLessThanOrEqual(first.pointBudget);
        expect(path.pointCost).toBe(
          calculatePathPointCost(graph, path.nodeIds),
        );
        expect(path.pointCost).toBe(path.nodeIds.length);
        expect(new Set(path.nodeIds).size).toBe(path.nodeIds.length);
        expectConnected(
          graph,
          loaded.fixture.character.allocatedPassiveIds,
          path.nodeIds,
        );
        for (const nodeId of path.nodeIds) {
          expect(loaded.fixture.character.allocatedPassiveIds).not.toContain(
            nodeId,
          );
          expect(isAscendancyMember(graph.node(nodeId))).toBe(false);
          expect(graph.node(nodeId).sourceFlags).not.toContain("isFree");
        }
      }
    }
  });

  it("identifies the pinned isFree nodes and does not price them", () => {
    const freeNodes = snapshot.nodes
      .filter((node) => node.sourceFlags.includes("isFree"))
      .map((node) => ({
        id: node.id,
        name: node.name,
        ascendancyId: node.ascendancyId,
        kinds: node.kinds,
      }))
      .sort((left, right) => left.id - right.id);

    expect(freeNodes).toEqual([
      {
        id: 8415,
        name: "Sanguimancy",
        ascendancyId: "Witch2",
        kinds: ["notable"],
      },
      {
        id: 9988,
        name: "Smith's Masterwork",
        ascendancyId: "Warrior3",
        kinds: ["notable"],
      },
      {
        id: 28254,
        name: "Sacred Unity",
        ascendancyId: "Huntress2",
        kinds: ["notable"],
      },
    ]);
    expect(freeNodes.every((node) => node.ascendancyId !== undefined)).toBe(
      true,
    );
    for (const node of freeNodes) {
      expect(() => passiveNodePointCost(graph.node(node.id))).toThrow(
        UnpricedPassiveNodeError,
      );
    }
  });
});

function expectConnected(
  graph: ReturnType<typeof sampleGraph>,
  allocatedIds: readonly number[],
  path: readonly number[],
): void {
  const occupied = new Set(allocatedIds);
  for (const nodeId of path) {
    const touches = [...occupied].some((allocatedId) =>
      graph.neighbors(allocatedId).includes(nodeId),
    );
    expect(touches).toBe(true);
    occupied.add(nodeId);
  }
}
