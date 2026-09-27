import { describe, expect, it } from "vitest";
import {
  allocationSteps,
  buildPathMap,
  comparePathNodeSets,
  nodeLabel,
  type LayoutNode,
} from "../apps/web/src/lib/path-layout";

function nodes(rows: LayoutNode[]): Map<number, LayoutNode> {
  return new Map(rows.map((row) => [row.id, row]));
}

describe("path layout", () => {
  it("numbers proposed nodes in the given order and keeps a missing name visible", () => {
    const catalog = nodes([
      { id: 10, name: "Spell damage", x: 0, y: 0 },
      { id: 11, name: "  ", x: 1, y: 0 },
    ]);
    expect(allocationSteps([10, 11], catalog)).toEqual([
      { step: 1, id: 10, name: "Spell damage" },
      { step: 2, id: 11, name: "#11" },
    ]);
    expect(nodeLabel(undefined, 4)).toBe("#4");
  });

  it("compares node sets without sorting them by a score", () => {
    expect(comparePathNodeSets([3, 1, 4], [4, 9, 3])).toEqual({
      shared: [3, 4],
      onlyLeft: [1],
      onlyRight: [9],
    });
  });

  it("draws the proposed order from the current node and skips a map without positions", () => {
    const catalog = nodes([
      { id: 1, name: "Already taken", x: 0, y: 0 },
      { id: 2, name: "First", x: 10, y: 0 },
      { id: 3, name: "Second", x: 20, y: 5 },
    ]);
    const map = buildPathMap({
      proposedIds: [2, 3],
      entryNodeId: 1,
      nodes: catalog,
    });
    expect(
      map?.points.map((point) => [point.id, point.role, point.step]),
    ).toEqual([
      [1, "current", null],
      [2, "proposed", 1],
      [3, "proposed", 2],
    ]);
    expect(map?.edges).toEqual([
      { from: 1, to: 2, kind: "current-link" },
      { from: 2, to: 3, kind: "proposed" },
    ]);
    expect(
      buildPathMap({
        proposedIds: [2],
        entryNodeId: 1,
        nodes: nodes([
          { id: 1, name: "Already taken", x: null, y: null },
          { id: 2, name: "First", x: 10, y: 0 },
        ]),
      }),
    ).toBeNull();
  });
});
