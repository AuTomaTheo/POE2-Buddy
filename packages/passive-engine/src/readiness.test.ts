import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseBuildFixture } from "@poe2-helper/domain";
import {
  developmentPassiveTreeSnapshotDirectory,
  loadBuildFixture,
  loadPinnedPassiveTreeSnapshot,
} from "@poe2-helper/data-sources";
import { describe, expect, it } from "vitest";
import type { PassiveGraphSource } from "./graph";
import { buildPassiveGraph } from "./index";
import {
  assessOptimizationReadiness,
  graphIssueBlocksOptimization,
  OptimizationNotReadyError,
  requireOptimizationReadiness,
} from "./readiness";

const version = {
  source: "fixture",
  version: "readiness-test",
  commit: "abc123",
  fetchedAt: "2026-09-26T00:00:00.000Z",
};

function node(
  id: number,
  neighborIds: number[],
): PassiveGraphSource["nodes"][number] {
  return {
    id,
    name: `Node ${id}`,
    rawStats: [],
    neighborIds,
    kinds: ["small"],
    sourceFlags: [],
  };
}

function fixture(options?: {
  className?: string;
  allocatedPassiveIds?: number[];
  weaponSet1?: number[];
  commit?: string;
  version?: string;
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
      sourceVersion: {
        ...version,
        commit: options?.commit ?? version.commit,
        version: options?.version ?? version.version,
      },
    },
    goals: { objective: "offensive", pointBudget: 1 },
  });
}

function graphFrom(source: Omit<PassiveGraphSource, "version">) {
  return buildPassiveGraph({ version, ...source });
}

const classStart = [{ classIndex: 1, className: "Witch", nodeId: 1 }];

describe("optimization readiness", () => {
  it("classifies isolated nodes as diagnostic and other graph issues as blocking", () => {
    expect(
      graphIssueBlocksOptimization({ kind: "isolated-node", nodeId: 3 }),
    ).toBe(false);
    expect(
      graphIssueBlocksOptimization({ kind: "duplicate-node", nodeId: 1 }),
    ).toBe(true);
    expect(
      graphIssueBlocksOptimization({
        kind: "unknown-reference",
        referencedId: 99,
        via: "neighbor",
      }),
    ).toBe(true);
    expect(
      graphIssueBlocksOptimization({
        kind: "non-reciprocal",
        fromNodeId: 1,
        toNodeId: 2,
      }),
    ).toBe(true);
    expect(
      graphIssueBlocksOptimization({
        kind: "edge-mismatch",
        fromNodeId: 1,
        toNodeId: 2,
        detail: "missing-edge",
      }),
    ).toBe(true);
  });

  it("refuses path search when a blocking graph issue is present", () => {
    const cases = [
      graphFrom({
        nodes: [node(1, []), node(1, [])],
        edges: [],
        classStarts: classStart,
      }),
      graphFrom({
        nodes: [node(1, [99])],
        edges: [],
        classStarts: classStart,
      }),
      graphFrom({
        nodes: [node(1, [2]), node(2, [])],
        edges: [],
        classStarts: classStart,
      }),
      graphFrom({
        nodes: [node(1, [2]), node(2, [1])],
        edges: [],
        classStarts: classStart,
      }),
    ];

    for (const graph of cases) {
      expect(() =>
        requireOptimizationReadiness(
          fixture({ allocatedPassiveIds: [1] }),
          graph,
        ),
      ).toThrow(OptimizationNotReadyError);
      const readiness = assessOptimizationReadiness(
        fixture({ allocatedPassiveIds: [1] }),
        graph,
      );
      expect(readiness.status).toBe("not-ready");
      expect(
        readiness.blockers.some((blocker) => blocker.kind === "graph-issue"),
      ).toBe(true);
    }
  });

  it("stays ready when the only graph issue is an isolated node elsewhere", () => {
    const graph = graphFrom({
      nodes: [node(1, [2]), node(2, [1]), node(3, [])],
      edges: [{ fromNodeId: 1, toNodeId: 2 }],
      classStarts: classStart,
    });
    const readiness = requireOptimizationReadiness(
      fixture({ allocatedPassiveIds: [1, 2] }),
      graph,
    );

    expect(readiness.status).toBe("ready");
    expect(readiness.blockers).toEqual([]);
    expect(readiness.diagnosticIssues).toEqual([
      { kind: "isolated-node", nodeId: 3 },
    ]);
  });

  it("blocks an unknown class, allocated id, or weapon-set id", () => {
    const graph = graphFrom({
      nodes: [node(1, [2]), node(2, [1])],
      edges: [{ fromNodeId: 1, toNodeId: 2 }],
      classStarts: classStart,
    });

    expect(
      assessOptimizationReadiness(fixture({ className: "NotAClass" }), graph)
        .blockers,
    ).toContainEqual({ kind: "unknown-class", className: "NotAClass" });
    expect(
      assessOptimizationReadiness(
        fixture({ allocatedPassiveIds: [1, 999999999] }),
        graph,
      ).blockers,
    ).toContainEqual({ kind: "unknown-allocated-id", nodeId: 999999999 });
    expect(
      assessOptimizationReadiness(fixture({ weaponSet1: [42] }), graph)
        .blockers,
    ).toContainEqual({
      kind: "unknown-weapon-set-id",
      set: "set1",
      nodeId: 42,
    });
  });

  it("blocks a fixture whose commit does not match the tree", () => {
    const graph = graphFrom({
      nodes: [node(1, [])],
      edges: [],
      classStarts: classStart,
    });
    const readiness = assessOptimizationReadiness(
      fixture({ commit: "different" }),
      graph,
    );

    expect(readiness.status).toBe("not-ready");
    expect(readiness.compatibility.compatible).toBe(false);
    expect(readiness.compatibility.fixtureCommit).toBe("different");
    expect(readiness.compatibility.treeCommit).toBe("abc123");
    expect(
      readiness.blockers.some(
        (blocker) => blocker.kind === "source-incompatible",
      ),
    ).toBe(true);
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

  it("accepts the Witch and Warrior fixtures for main-tree search", () => {
    for (const name of ["witch-offensive.json", "warrior-defensive.json"]) {
      const loaded = loadBuildFixture({
        filePath: path.join(fixtureDirectory, name),
        snapshot,
      });
      const readiness = requireOptimizationReadiness(loaded.fixture, graph);

      expect(readiness.status).toBe("ready");
      expect(readiness.compatibility.compatible).toBe(true);
      expect(readiness.compatibility.fixtureVersion).toBe("0.5.5");
      expect(readiness.compatibility.treeCommit).toBe(
        "bd87e6512c92b868542eddfb1ba4ea8b6dc2da36",
      );
      expect(readiness.blockers).toEqual([]);
      expect(
        readiness.diagnosticIssues.filter(
          (issue) => issue.kind === "isolated-node",
        ),
      ).toHaveLength(22);
    }
  });

  it("detects a pinned fixture edited onto a different commit", () => {
    const loaded = loadBuildFixture({
      filePath: path.join(fixtureDirectory, "witch-offensive.json"),
      snapshot,
    });
    const edited = parseBuildFixture({
      ...loaded.fixture,
      character: {
        ...loaded.fixture.character,
        sourceVersion: {
          ...loaded.fixture.character.sourceVersion,
          commit: "f".repeat(40),
        },
      },
    });
    const readiness = assessOptimizationReadiness(edited, graph);

    expect(readiness.status).toBe("not-ready");
    expect(readiness.compatibility.compatible).toBe(false);
    expect(readiness.compatibility.reasons).toEqual([
      "Fixture commit and tree commit differ.",
    ]);
  });
});
