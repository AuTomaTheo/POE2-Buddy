import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  developmentPassiveTreeSnapshotDirectory,
  loadBuildFixture,
  loadPinnedPassiveTreeSnapshot,
} from "@poe2-helper/data-sources";
import { describe, expect, it } from "vitest";
import { buildPassiveGraph } from "./index";
import { pathScoringConfidence, pathSemanticCoverage } from "./path-coverage";
import { enumerateMainTreePaths } from "./path-search";
import { unmappedStructuredInventory } from "./unmapped-inventory";

describe("path semantic coverage", () => {
  it("counts stat lines and keeps unmapped effects visible", () => {
    const coverage = pathSemanticCoverage([
      {
        id: 1,
        rawStats: ["10% increased [Spell] Damage", "20% more Damage"],
      },
      {
        id: 2,
        rawStats: [
          "Gain [Deflect|Deflection Rating] equal to 4% of [Evasion|Evasion Rating]",
          "8% increased [Attack] and Cast Speed",
        ],
      },
    ]);

    expect(coverage.nodeCount).toBe(2);
    expect(coverage.totalStatLines).toBe(4);
    expect(coverage.semanticallyMappedLines).toBe(3);
    expect(coverage.structurallyParsedOnlyLines).toBe(0);
    expect(coverage.unrecognizedLines).toBe(1);
    expect(coverage.unsupportedRawLines).toEqual([
      "8% increased [Attack] and Cast Speed",
    ]);
    expect(coverage).not.toHaveProperty("amount");
  });

  it("treats a path with no stat lines as completely understood", () => {
    const coverage = pathSemanticCoverage([{ id: 1, rawStats: [] }]);
    expect(coverage.totalStatLines).toBe(0);
    expect(coverage.semanticCoverageRatio).toBe(1);
    expect(coverage.structuralCoverageRatio).toBe(1);
    expect(coverage.confidence).toBe("complete");
    expect(coverage.unsupportedRawLines).toEqual([]);
  });

  it("classifies confidence from mapped stat lines", () => {
    const line = (raw: string) => ({ id: raw.length, rawStats: [raw] });
    const mapped = "10% increased [Spell] Damage";
    const unseen = "8% increased [Attack] and Cast Speed";
    const nodes = (mappedCount: number, unseenCount: number) => [
      ...Array.from({ length: mappedCount }, () => line(mapped)),
      ...Array.from({ length: unseenCount }, () => line(unseen)),
    ];

    expect(pathSemanticCoverage(nodes(10, 0)).confidence).toBe("complete");
    expect(pathSemanticCoverage(nodes(9, 1)).confidence).toBe("high");
    expect(pathSemanticCoverage(nodes(7, 3)).confidence).toBe("partial");
    expect(pathSemanticCoverage(nodes(6, 4)).confidence).toBe("low");
    expect(pathScoringConfidence(9, 10)).toBe("high");
    expect(pathScoringConfidence(7, 10)).toBe("partial");
  });

  it("reports a structurally parsed line that has no semantic family", () => {
    const coverage = pathSemanticCoverage([
      {
        id: 1,
        rawStats: ["5% chance to [Daze] on [Hit]"],
      },
    ]);
    expect(coverage.structurallyParsedOnlyLines).toBe(1);
    expect(coverage.semanticallyMappedLines).toBe(0);
    expect(coverage.unsupportedRawLines).toEqual([
      "5% chance to [Daze] on [Hit]",
    ]);
    expect(coverage.confidence).toBe("low");
  });

  it("covers one candidate main-tree path and leaves search completeness separate", () => {
    const snapshot = loadPinnedPassiveTreeSnapshot({
      snapshotDirectory: developmentPassiveTreeSnapshotDirectory,
      logger: () => undefined,
    });
    const graph = buildPassiveGraph(snapshot);
    const loaded = loadBuildFixture({
      filePath: path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../data-sources/fixtures/builds/witch-offensive.json",
      ),
      snapshot,
    });
    const search = enumerateMainTreePaths(loaded.fixture, graph);
    const candidate = search.paths[0];
    expect(candidate).toBeDefined();
    if (!candidate) return;
    const nodes = candidate.nodeIds.map((id) => {
      const node = graph.node(id);
      return { id: node.id, rawStats: node.rawStats };
    });
    const coverage = pathSemanticCoverage(nodes);

    expect(coverage.nodeCount).toBe(candidate.nodeIds.length);
    expect(
      coverage.semanticallyMappedLines +
        coverage.structurallyParsedOnlyLines +
        coverage.unrecognizedLines,
    ).toBe(coverage.totalStatLines);
    expect(coverage).not.toHaveProperty("searchCompleteness");
    expect(search.searchCompleteness).toMatch(/exhaustive|truncated/);
    expect(pathSemanticCoverage(nodes)).toEqual(coverage);
  });
});

describe("structured but unmapped inventory", () => {
  it("is empty when every parsed line has a semantic family", () => {
    const inventory = unmappedStructuredInventory([
      { id: 1, rawStats: ["10% increased [Spell] Damage"] },
    ]);
    expect(inventory.lineCount).toBe(0);
    expect(inventory.families).toEqual([]);
  });

  it("groups the same lines the same way on every call", () => {
    const nodes = [
      {
        id: 1,
        rawStats: [
          "5% chance to [Daze] on [Hit]",
          "5% chance to [Daze] on [Hit]",
        ],
      },
      { id: 2, rawStats: ["4% chance to [Blind] on [Hit]"] },
    ];
    expect(unmappedStructuredInventory(nodes)).toEqual(
      unmappedStructuredInventory(nodes),
    );
    expect(unmappedStructuredInventory(nodes).lineCount).toBe(3);
  });
});
