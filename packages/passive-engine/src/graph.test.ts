import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  developmentPassiveTreeSnapshotDirectory,
  loadPinnedPassiveTreeSnapshot,
} from "@poe2-helper/data-sources";
import { describe, expect, it } from "vitest";
import type { PassiveGraphSource } from "./graph";
import { buildPassiveGraph, isAscendancyMember } from "./index";

const version = {
  source: "fixture",
  version: "graph-test",
  fetchedAt: "2026-09-26T00:00:00.000Z",
};

function node(
  id: number,
  neighborIds: number[],
  kinds: PassiveGraphSource["nodes"][number]["kinds"] = ["small"],
): PassiveGraphSource["nodes"][number] {
  return {
    id,
    name: `Node ${id}`,
    rawStats: [],
    neighborIds,
    kinds,
    sourceFlags: [],
  };
}

function connectedPair(): PassiveGraphSource {
  return {
    version,
    nodes: [node(1, [2]), node(2, [1], ["notable"])],
    edges: [{ fromNodeId: 1, toNodeId: 2 }],
    classStarts: [{ classIndex: 0, className: "Witch", nodeId: 1 }],
  };
}

describe("passive graph", () => {
  it("returns neighbors for a known node and classifies kinds", () => {
    const graph = buildPassiveGraph(connectedPair());

    expect(graph.neighbors(1)).toEqual([2]);
    expect(graph.neighbors(2)).toEqual([1]);
    expect(graph.nodesOfKind("notable").map((entry) => entry.id)).toEqual([2]);
    expect(graph.nodesOfKind("small").map((entry) => entry.id)).toEqual([1]);
    expect(graph.classStartNodeIds("Witch")).toEqual([1]);
    expect(graph.issues).toEqual([]);
  });

  it("throws when asked for an unknown node", () => {
    const graph = buildPassiveGraph(connectedPair());

    expect(() => graph.neighbors(99)).toThrow(/Unknown passive node 99/);
    expect(graph.hasNode(99)).toBe(false);
  });

  it("reports an unknown neighbor and a non-reciprocal link", () => {
    const graph = buildPassiveGraph({
      version,
      nodes: [node(1, [2, 99]), node(2, [])],
      edges: [],
      classStarts: [],
    });

    expect(graph.neighbors(1)).toEqual([2]);
    expect(graph.issues).toEqual(
      expect.arrayContaining([
        {
          kind: "unknown-reference",
          referencedId: 99,
          fromNodeId: 1,
          via: "neighbor",
        },
        {
          kind: "non-reciprocal",
          fromNodeId: 1,
          toNodeId: 2,
        },
        { kind: "isolated-node", nodeId: 2 },
      ]),
    );
  });

  it("reports a class start that does not exist on the graph", () => {
    const graph = buildPassiveGraph({
      version,
      nodes: [node(1, [])],
      edges: [],
      classStarts: [{ classIndex: 1, className: "Ranger", nodeId: 50 }],
    });

    expect(graph.classStartNodeIds("Ranger")).toEqual([50]);
    expect(graph.issues).toContainEqual({
      kind: "unknown-reference",
      referencedId: 50,
      via: "class-start",
    });
  });

  it("builds the pinned official tree without unknown or one-way links", () => {
    const snapshot = loadPinnedPassiveTreeSnapshot({
      snapshotDirectory: developmentPassiveTreeSnapshotDirectory,
      logger: () => undefined,
    });
    const graph = buildPassiveGraph(snapshot);
    const witchStart = snapshot.nodes.find((entry) => entry.id === 54447);
    const phylactery = graph.node(17788);

    expect(graph.version.commit).toBe(
      "bd87e6512c92b868542eddfb1ba4ea8b6dc2da36",
    );
    expect(graph.neighbors(54447)).toEqual(witchStart?.neighborIds);
    expect(graph.classStartNodeIds("Witch")).toEqual([54447]);
    expect(graph.classStartNodeIds("Sorceress")).toEqual([54447]);
    expect(phylactery.kinds).toEqual(["notable", "jewel-socket"]);
    expect(isAscendancyMember(phylactery)).toBe(true);
    expect(graph.hasNode(0)).toBe(false);
    expect(
      graph.issues.filter((issue) => issue.kind === "unknown-reference"),
    ).toEqual([]);
    expect(
      graph.issues.filter((issue) => issue.kind === "non-reciprocal"),
    ).toEqual([]);
    expect(
      graph.issues.filter((issue) => issue.kind === "edge-mismatch"),
    ).toEqual([]);
    expect(
      graph.issues.filter((issue) => issue.kind === "isolated-node"),
    ).toHaveLength(22);
  });
});

describe("passive-engine package boundary", () => {
  it("does not depend on the web app", () => {
    const packageJson = JSON.parse(
      readFileSync(
        path.resolve(
          path.dirname(fileURLToPath(import.meta.url)),
          "../package.json",
        ),
        "utf8",
      ),
    ) as { dependencies?: Record<string, string> };

    expect(packageJson.dependencies).toEqual({
      "@poe2-helper/domain": "0.1.0",
    });
  });
});
