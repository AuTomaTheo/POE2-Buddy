import {
  developmentPassiveTreeSnapshotDirectory,
  loadPinnedPassiveTreeSnapshot,
} from "@poe2-helper/data-sources";
import type { PassiveTreeSnapshot } from "@poe2-helper/domain";
import { weightedSemanticIds } from "@poe2-helper/scoring-engine";
import { describe, expect, it } from "vitest";
import {
  assessPassiveTreeCompatibility,
  formatPassiveTreeCompatibility,
} from "./compatibility";

const version = {
  source: "https://github.com/grindinggear/poe2-skilltree-export",
  version: "1.0.0",
  commit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  fetchedAt: "2026-09-26T18:00:00.000Z",
  checksum:
    "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
};

describe("passive tree optimizer compatibility", () => {
  it("accepts the approved 0.5.5 pin", () => {
    const snapshot = loadPinnedPassiveTreeSnapshot({
      snapshotDirectory: developmentPassiveTreeSnapshotDirectory,
      logger: () => undefined,
    });
    const report = assessPassiveTreeCompatibility({
      candidate: snapshot,
      current: snapshot,
      candidateClassCount: snapshot.classStarts.length,
      weightedSemanticIds: weightedSemanticIds(),
    });
    const again = assessPassiveTreeCompatibility({
      candidate: snapshot,
      current: snapshot,
      candidateClassCount: snapshot.classStarts.length,
      weightedSemanticIds: weightedSemanticIds(),
    });

    expect(report.compatible).toBe(true);
    expect(report.blockingReasons).toEqual([]);
    expect(report.classes.compatible).toBe(true);
    expect(report.classes.changes).toEqual([]);
    expect(report.coverage.semanticCoverageRatio).toBe(48.8);
    expect(report.coverage.structuralCoverageRatio).toBe(80.1);
    expect(report.coverage.delta?.semanticCoverageRatio).toBe(0);
    expect(report.mechanics.newSemanticIds).toEqual([]);
    expect(report.scoring.mappedButUnweighted).toContain(
      "maximum-cold-resistance",
    );
    expect(
      report.highPriorityFamilies.find(
        (family) => family.familyId === "maximum-resistance",
      )?.blocking,
    ).toBe(false);
    expect(formatPassiveTreeCompatibility(report)).toContain("  PASS");
    expect(again).toEqual(report);
  }, 30_000);

  it("promotes a structurally valid candidate with no blocking readiness issue", () => {
    const report = assessPassiveTreeCompatibility({
      candidate: linkedTree(),
      candidateClassCount: 1,
      weightedSemanticIds: weightedSemanticIds(),
    });

    expect(report.compatible).toBe(true);
    expect(report.graph.blockingDiagnostics).toEqual([]);
    expect(formatPassiveTreeCompatibility(report)).toContain("  PASS");
    expect(formatPassiveTreeCompatibility(report)).not.toContain(
      "Current snapshot was not changed.",
    );
  });

  it("rejects an unknown node reference", () => {
    const report = assessPassiveTreeCompatibility({
      candidate: linkedTree([], { neighborId: 99 }),
      candidateClassCount: 1,
      weightedSemanticIds: [],
    });

    expect(report.compatible).toBe(false);
    expect(report.graph.blockingDiagnostics).toContainEqual(
      expect.objectContaining({
        kind: "unknown-reference",
        referencedId: 99,
        via: "neighbor",
      }),
    );
    expect(formatPassiveTreeCompatibility(report)).toContain("  FAIL");
    expect(formatPassiveTreeCompatibility(report)).toContain(
      "unknown-reference 99 via neighbor",
    );
  });

  it("rejects a hidden unsupported high-priority family", () => {
    const report = assessPassiveTreeCompatibility({
      candidate: linkedTree(["10% of Life Converted to Damage"]),
      candidateClassCount: 1,
      weightedSemanticIds: weightedSemanticIds(),
    });

    expect(report.compatible).toBe(false);
    expect(report.blockingReasons.join("\n")).toContain("damage-conversion");
    expect(
      report.highPriorityFamilies.find(
        (family) => family.familyId === "damage-conversion",
      ),
    ).toMatchObject({
      presentInScoringDomain: true,
      omissionExposed: false,
      blocking: true,
    });
  });

  it("warns for an exposed unsupported mechanic and still allows promotion", () => {
    const report = assessPassiveTreeCompatibility({
      candidate: linkedTree(["10% less [Attack] and Cast Damage"]),
      candidateClassCount: 1,
      weightedSemanticIds: weightedSemanticIds(),
    });

    expect(report.compatible).toBe(true);
    expect(report.warnings.join("\n")).toContain("less-damage");
    expect(
      report.highPriorityFamilies.find(
        (family) => family.familyId === "less-damage",
      )?.blocking,
    ).toBe(false);
  });

  it("warns when semantic coverage falls and no family blocks", () => {
    const current = linkedTree(["10% increased maximum Life"]);
    const candidate = linkedTree([
      "10% increased maximum Life",
      "this line is not a passive stat",
    ]);
    const report = assessPassiveTreeCompatibility({
      candidate,
      current,
      candidateClassCount: 1,
      weightedSemanticIds: ["maximum-life"],
    });

    expect(report.compatible).toBe(true);
    expect(report.coverage.delta?.semanticCoverageRatio).toBeLessThan(0);
    expect(report.warnings.join("\n")).toContain("Semantic coverage changed");
    expect(report.mechanics.newUnrecognizedPatterns.length).toBeGreaterThan(0);
  });

  it("rejects a missing class index and a missing shared class start", () => {
    const missingIndex = assessPassiveTreeCompatibility({
      candidate: linkedTree(),
      candidateClassCount: 2,
      weightedSemanticIds: [],
    });
    expect(missingIndex.compatible).toBe(false);
    expect(missingIndex.classes.compatible).toBe(false);
    expect(missingIndex.blockingReasons).toContain(
      "Missing expected class index 1.",
    );

    const current = linkedTree();
    const sharedCurrent: PassiveTreeSnapshot = {
      ...current,
      classStarts: [
        { classIndex: 0, className: "Witch", nodeId: 1 },
        { classIndex: 1, className: "Sorceress", nodeId: 1 },
      ],
    };
    const candidate = linkedTree();
    const missingShared = assessPassiveTreeCompatibility({
      candidate,
      current: sharedCurrent,
      candidateClassCount: 1,
      weightedSemanticIds: [],
    });
    expect(missingShared.compatible).toBe(false);
    expect(missingShared.blockingReasons).toContain(
      "Missing shared class-start for Sorceress, previously node 1.",
    );
  });

  it("reports a class-start node move without blocking", () => {
    const current = linkedTree();
    const candidate: PassiveTreeSnapshot = {
      ...linkedTree(),
      classStarts: [{ classIndex: 0, className: "Witch", nodeId: 2 }],
    };
    const report = assessPassiveTreeCompatibility({
      candidate,
      current,
      candidateClassCount: 1,
      weightedSemanticIds: [],
    });

    expect(report.compatible).toBe(true);
    expect(report.classes.changes).toEqual([
      {
        classIndex: 0,
        className: "Witch",
        kind: "node-changed",
        previousNodeId: 1,
        candidateNodeId: 2,
      },
    ]);
    expect(report.warnings.join("\n")).toContain(
      "Class Witch start moved from node 1 to node 2.",
    );
  });

  it("reports a mapped semantic id that no profile weights", () => {
    const report = assessPassiveTreeCompatibility({
      candidate: linkedTree(["10% increased maximum Life"]),
      candidateClassCount: 1,
      weightedSemanticIds: [],
    });

    expect(report.compatible).toBe(true);
    expect(report.scoring.mappedButUnweighted).toEqual(["maximum-life"]);
    expect(report.warnings.join("\n")).toContain("maximum-life");
  });
});

function linkedTree(
  stats: readonly string[] = [],
  options?: { neighborId?: number },
): PassiveTreeSnapshot {
  const neighborId = options?.neighborId ?? 2;
  return {
    version,
    nodes: [
      {
        id: 1,
        name: "Start",
        rawStats: [],
        neighborIds: [neighborId],
        kinds: ["small"],
        sourceFlags: [],
      },
      {
        id: 2,
        name: "Next",
        rawStats: [...stats],
        neighborIds: [1],
        kinds: ["small"],
        sourceFlags: [],
      },
    ],
    edges: [{ fromNodeId: 1, toNodeId: 2 }],
    classStarts: [{ classIndex: 0, className: "Witch", nodeId: 1 }],
  };
}
