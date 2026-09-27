import {
  developmentPassiveTreeSnapshotDirectory,
  loadPinnedPassiveTreeSnapshot,
} from "@poe2-helper/data-sources";
import { describe, expect, it } from "vitest";
import { pathSemanticCoverage } from "./path-coverage";
import { highPriorityFamilyBlocks, highPriorityFamilyReport } from "./semantic";

const snapshot = loadPinnedPassiveTreeSnapshot({
  snapshotDirectory: developmentPassiveTreeSnapshotDirectory,
  logger: () => undefined,
});

describe("scoring readiness policy", () => {
  it("does not block an unsupported family that is absent from passive nodes", () => {
    expect(
      highPriorityFamilyBlocks({
        supportStatus: "still-unsupported",
        presentInScoringDomain: false,
        omissionExposed: false,
      }),
    ).toBe(false);
  });

  it("can block an unsupported family that is present and hidden", () => {
    expect(
      highPriorityFamilyBlocks({
        supportStatus: "still-unsupported",
        presentInScoringDomain: true,
        omissionExposed: false,
      }),
    ).toBe(true);
  });

  it("does not treat incoming less damage as outgoing less-damage", () => {
    const incoming = highPriorityFamilyReport([
      { id: 1, rawStats: ["Take 30% less Damage"] },
      { id: 2, rawStats: ["10% less Damage taken"] },
      {
        id: 3,
        rawStats: ["10% less [ElementalDamage|Elemental Damage] taken"],
      },
    ]);
    expect(
      incoming.find((family) => family.familyId === "less-damage"),
    ).toMatchObject({
      presentInScoringDomain: false,
      blocking: false,
    });
    expect(
      incoming.find((family) => family.familyId === "damage-reduction"),
    ).toMatchObject({
      supportStatus: "supported-semantically",
      presentInScoringDomain: true,
      blocking: false,
    });
  });

  it("detects outgoing less-damage when a passive node states it", () => {
    const present = highPriorityFamilyReport([
      { id: 1, rawStats: ["Mirages deal 50% less Damage"] },
    ]);
    expect(
      present.find((family) => family.familyId === "less-damage"),
    ).toMatchObject({
      supportStatus: "supported-semantically",
      presentInScoringDomain: true,
      blocking: false,
    });

    const hiddenShape = highPriorityFamilyReport([
      { id: 2, rawStats: ["10% less [Attack] and Cast Damage"] },
    ]);
    expect(
      hiddenShape.find((family) => family.familyId === "less-damage"),
    ).toMatchObject({
      supportStatus: "still-unsupported",
      presentInScoringDomain: true,
      omissionExposed: true,
      blocking: false,
    });
  });

  it("keeps partial damage conversion visible and non-blocking", () => {
    const node = snapshot.nodes.find((candidate) =>
      candidate.rawStats.some((raw) => raw.includes("Deal no Non-Fire Damage")),
    );
    expect(node).toBeDefined();
    if (!node) return;

    const report = highPriorityFamilyReport([node]);
    expect(
      report.find((family) => family.familyId === "damage-conversion"),
    ).toMatchObject({
      presentInScoringDomain: true,
      omissionExposed: true,
      blocking: false,
    });

    const coverage = pathSemanticCoverage([
      { id: node.id, rawStats: node.rawStats },
    ]);
    expect(
      coverage.unsupportedRawLines.some((raw) =>
        raw.includes("Deal no Non-Fire Damage"),
      ),
    ).toBe(true);
    expect(coverage.confidence).not.toBe("complete");
    expect(coverage).not.toHaveProperty("searchCompleteness");
  });
});
