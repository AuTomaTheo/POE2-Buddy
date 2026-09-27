import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CHARACTER_CONTEXT_VERSION } from "@poe2-helper/character-context";
import {
  developmentPassiveTreeSnapshotDirectory,
  POB2_NORMALIZATION_VERSION,
} from "@poe2-helper/data-sources";
import { GEAR_NORMALIZATION_VERSION } from "@poe2-helper/gear-engine";
import { runPassiveAnalysis } from "../apps/web/src/server/analyze-passive-build";

const snapshotDirectory = developmentPassiveTreeSnapshotDirectory;
const realDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../packages/data-sources/src/pob2/fixtures/real",
);

function realCode(caseId: string): string {
  return readFileSync(
    path.join(realDirectory, `${caseId}.code.txt`),
    "utf8",
  ).trim();
}

function analyzePob2(code: string) {
  return runPassiveAnalysis({
    fixtureId: "witch-offensive.json",
    fixtureJson: "",
    objective: "offensive",
    pointBudget: "5",
    snapshotDirectory,
    importSource: "pob2",
    pob2Code: code,
  });
}

describe("character context integration", () => {
  it("keeps the witch score and does not guess the fixture skill as primary", () => {
    const result = runPassiveAnalysis({
      fixtureId: "witch-offensive.json",
      fixtureJson: "",
      objective: "offensive",
      pointBudget: "5",
      snapshotDirectory,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recommendation.rankedCompleteCandidates[0]).toMatchObject({
      nodeIds: [1755, 41965],
      heuristicScore: 32,
    });
    expect(result.recommendation.profileVersion).toBe(1);
    expect(result.gear.gearNormalizationVersion).toBe(
      GEAR_NORMALIZATION_VERSION,
    );
    expect(GEAR_NORMALIZATION_VERSION).toBe(3);
    expect(POB2_NORMALIZATION_VERSION).toBe(3);
    expect(result.context.characterContextVersion).toBe(
      CHARACTER_CONTEXT_VERSION,
    );
    expect(CHARACTER_CONTEXT_VERSION).toBe(1);
    expect(result.context.source).toBe("fixture");
    expect(result.context.primarySkill).toMatchObject({
      status: "unresolved",
      name: null,
    });
    expect(result.context.skillGroups[0]?.activeSkillNames).toEqual([
      "Fixture Spell",
    ]);
    expect(result.context.skillGroups[0]?.role).toBe("unresolved");
    const spell = result.context.offense.find(
      (entry) => entry.mechanic === "spell",
    );
    expect(spell?.relevance).toBe("relevant");
    expect(
      spell?.evidence.every((entry) => entry.sourceType === "passive"),
    ).toBe(true);
    expect(JSON.stringify(result.context)).not.toContain("scoreEquipment");
    expect(JSON.stringify(result.context)).not.toContain("findWorstItem");
  });

  it("keeps fixture B's primary skill and support without attack evidence", () => {
    const result = analyzePob2(realCode("B"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.context.primarySkill).toMatchObject({
      status: "resolved",
      name: "Fireball",
      groupId: "2",
    });
    expect(result.context.skillGroups).toHaveLength(2);
    expect(result.context.skillGroups.map((group) => group.role)).toEqual([
      "unresolved",
      "primary",
    ]);
    expect(
      result.context.skillGroups.flatMap((group) => group.supportNames),
    ).toContain("Rapid Attacks III");
    expect(
      result.context.offense.find((entry) => entry.mechanic === "attack")
        ?.relevance,
    ).toBe("no-evidence");
    expect(result.context.ascendancy.name).toBe("Infernalist");
    expect(result.context.ascendancy.passiveIds).toContain(32699);
    expect(result.recommendation.profileVersion).toBe(1);
    expect(result.allocatedNodeIds).not.toContain(32699);
  });

  it("stores fixture E configuration without treating it as fire evidence", () => {
    const result = analyzePob2(realCode("E"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.context.preservedConfiguration).toEqual(
      expect.arrayContaining([
        { key: "customMods", value: "Added fire damage" },
      ]),
    );
    expect(
      result.context.offense.find((entry) => entry.mechanic === "fire")
        ?.relevance,
    ).toBe("no-evidence");
    expect(
      result.context.offense
        .flatMap((entry) => entry.evidence)
        .some((entry) => entry.rawLabel.includes("Added fire damage")),
    ).toBe(false);
    expect(result.context.readiness.warnings.join(" ")).toContain(
      "not used as relevance evidence",
    );
    expect(result.gear.gearNormalizationVersion).toBe(3);
  });
});
