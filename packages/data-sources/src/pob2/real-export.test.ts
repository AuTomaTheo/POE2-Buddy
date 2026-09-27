import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runPassiveAnalysis } from "../../../../apps/web/src/server/analyze-passive-build";
import {
  developmentPassiveTreeSnapshotDirectory,
  loadPinnedPassiveTreeSnapshot,
} from "../passive-tree/load-pinned-snapshot";
import { decodePob2Export } from "./decode";
import {
  importPob2Build,
  POB2_NORMALIZATION_VERSION,
  pob2AscendancyNodeIds,
  type Pob2ImportSuccess,
  type Pob2TreePin,
} from "./import-build";

/**
 * These four codes were produced by Path of Building (PoE2) 0.23.1's Generate
 * action on fresh local test builds. They are not handwritten XML, and they
 * are not a player or community build. The truth files record what that
 * process showed before this importer ran.
 */

const fixtureDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/real",
);
const now = new Date("2026-09-27T00:00:00.000Z");

type TruthGem = {
  name: string;
  skillId: string;
  support: boolean;
};

type TruthDisplay = {
  index: number;
  name: string;
  skillId: string;
  sourceGemIndex: number;
};

type TruthGroup = {
  id: string;
  mainActiveSkill: number;
  selectedName: string;
  selectedSkillId: string;
  display: TruthDisplay[];
  gems: TruthGem[];
};

type Truth = {
  root: string;
  targetVersion: string;
  treeVersion: string;
  className: string;
  ascendancy: string;
  level: number;
  mainSocketGroup: number;
  activeSkillSetId: string;
  groups: TruthGroup[];
  sharedPassiveIds: number[];
  weaponSet1: number[];
  weaponSet2: number[];
  weaponSet3: number[];
};

const snapshot = loadPinnedPassiveTreeSnapshot({
  snapshotDirectory: developmentPassiveTreeSnapshotDirectory,
  logger: () => undefined,
});
const pin: Pob2TreePin = {
  nodeIds: new Set(snapshot.nodes.map((node) => node.id)),
  ascendancyNodeIds: pob2AscendancyNodeIds(snapshot.nodes),
  source: snapshot.version.source,
  version: snapshot.version.version,
  commit: snapshot.version.commit,
};

function loadCase(caseId: string): { code: string; truth: Truth } {
  const code = readFileSync(
    path.join(fixtureDirectory, `${caseId}.code.txt`),
    "utf8",
  ).trim();
  const truth = JSON.parse(
    readFileSync(path.join(fixtureDirectory, `${caseId}.truth.json`), "utf8"),
  ) as Truth;
  return { code, truth };
}

function sorted(ids: readonly number[]): number[] {
  return [...ids].sort((left, right) => left - right);
}

function imported(code: string): Pob2ImportSuccess {
  const result = importPob2Build(code, pin, now);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result;
}

describe("real Path of Building 2 exports", () => {
  for (const caseId of ["A", "B", "C", "D"] as const) {
    it(`imports fixture ${caseId} through the production decode path`, () => {
      const { code, truth } = loadCase(caseId);
      expect(code.startsWith("<")).toBe(false);
      const decoded = decodePob2Export(code);
      expect(decoded.xml).toContain(`<${truth.root}>`);
      expect(decoded.xml).not.toContain("<!DOCTYPE");
      expect(decoded.xml).not.toContain("<!ENTITY");

      const result = imported(code);
      const again = imported(code);
      expect(result.checksum).toBe(decoded.checksum);
      expect(again.checksum).toBe(result.checksum);
      expect(result.normalizationVersion).toBe(POB2_NORMALIZATION_VERSION);
      expect(result.normalizationVersion).toBe(3);
      expect(result.source).toBe("pob2");
      expect(result.document.treeVersion).toBe(truth.treeVersion);
      expect(result.document.formatVersion).toBe(truth.targetVersion);
      expect(result.document.className).toBe(truth.className);
      expect(result.document.ascendancy).toBe(truth.ascendancy);
      expect(result.document.level).toBe(truth.level);
      expect(result.document.mainSocketGroup).toBe(truth.mainSocketGroup);
      expect(result.document.activeSkillSetId).toBe(truth.activeSkillSetId);
      expect(result.document.buildName).toBeNull();
      expect(result.unavailable).toContain("build name");
      expect(result.document.items).toEqual([]);
      expect(result.document.configuration).toEqual([]);
      expect(result.unsupported).toContain(
        "mainActiveSkillCalcs interpretation",
      );
      expect(result.warnings).toEqual([]);
      expect(result.treeProvenance).toMatchObject({
        pobTreeVersion: truth.treeVersion,
        activeGggTreeVersion: pin.version,
        versionRelationship: {
          namespace: "different",
          comparedDirectly: false,
        },
        passiveIdsRecognized: true,
      });

      const main = truth.groups[truth.mainSocketGroup - 1];
      if (!main) throw new Error(`${caseId} has no main group`);
      const selected = main.display.find(
        (entry) => entry.index === main.mainActiveSkill,
      );
      expect(result.document.mainSkill).toMatchObject({
        resolved: true,
        groupId: String(truth.mainSocketGroup),
        name: main.selectedName,
        skillId: main.selectedSkillId,
        sourceGemIndex: selected?.sourceGemIndex ?? null,
        reason: null,
      });

      expect(result.document.skillGroups).toHaveLength(truth.groups.length);
      for (const [index, expected] of truth.groups.entries()) {
        const group = result.document.skillGroups[index];
        expect(group?.activeSkills.map((skill) => skill.name)).toEqual(
          expected.display.map((entry) => entry.name),
        );
        expect(group?.activeSkills.map((skill) => skill.skillId)).toEqual(
          expected.display.map((entry) => entry.skillId),
        );
        expect(group?.rawGems.map((gem) => gem.role)).toEqual(
          expected.gems.map((gem) => (gem.support ? "support" : "active")),
        );
        expect(
          group?.rawGems.some(
            (gem) =>
              gem.role === "support" &&
              gem.skillId === expected.selectedSkillId,
          ),
        ).toBe(false);
      }

      const ascendancy = pin.ascendancyNodeIds ?? new Set<number>();
      expect(sorted(result.document.sharedPassiveIds)).toEqual(
        sorted(truth.sharedPassiveIds.filter((id) => !ascendancy.has(id))),
      );
      expect(sorted(result.document.ascendancyPassiveIds)).toEqual(
        sorted(truth.sharedPassiveIds.filter((id) => ascendancy.has(id))),
      );
      expect(sorted(result.document.weaponSetPassiveIds.set1)).toEqual(
        truth.weaponSet1,
      );
      expect(sorted(result.document.weaponSetPassiveIds.set2)).toEqual(
        truth.weaponSet2,
      );
      expect(sorted(result.document.weaponSetPassiveIds.set3)).toEqual(
        truth.weaponSet3,
      );
      const shared = new Set(result.document.sharedPassiveIds);
      for (const id of [
        ...result.document.weaponSetPassiveIds.set1,
        ...result.document.weaponSetPassiveIds.set2,
        ...result.document.weaponSetPassiveIds.set3,
      ]) {
        expect(shared.has(id)).toBe(false);
      }

      const unknown = [
        ...result.document.sharedPassiveIds,
        ...result.document.ascendancyPassiveIds,
        ...result.document.weaponSetPassiveIds.set1,
        ...result.document.weaponSetPassiveIds.set2,
        ...result.document.weaponSetPassiveIds.set3,
      ].filter((id) => !pin.nodeIds.has(id));
      expect(sorted(result.unknownPassiveIds)).toEqual(sorted(unknown));
      expect(result.status).toBe(
        unknown.length > 0 ? "incompatible" : "partial",
      );
      expect(result.character?.allocatedPassiveIds).toEqual(
        result.document.sharedPassiveIds,
      );
    }, 30_000);
  }

  it("scores the real tree without using skills or supports", () => {
    const { code } = loadCase("A");
    const result = imported(code);
    expect(result.status).toBe("partial");
    expect(result.character).not.toBeNull();
    if (!result.character) return;

    const analysis = runPassiveAnalysis({
      fixtureId: "witch-offensive.json",
      fixtureJson: "",
      objective: "offensive",
      pointBudget: "5",
      snapshotDirectory: developmentPassiveTreeSnapshotDirectory,
      importSource: "pob2",
      pob2Code: code,
    });
    expect(analysis.ok).toBe(true);
    if (!analysis.ok) return;
    expect(analysis.pob2?.mainSkillName).toBe("Fireball");
    expect(analysis.pob2?.supportCount).toBe(2);
    expect(analysis.pob2?.unresolvedRoleGemCount).toBe(0);
    expect(analysis.pob2?.treeVersion).toBe("0_5");
    expect(analysis.pob2?.activeTreeVersion).toBe("0.5.5");
    expect(analysis.pob2?.ascendancyPassiveIds).toEqual([32699]);
    expect(analysis.pob2?.warnings).toEqual([]);
    expect(analysis.recommendation.profileVersion).toBe(1);
    expect(analysis.allocatedNodeIds).toEqual([54447]);
    expect(analysis.allocatedNodeIds).not.toContain(32699);

    const treeOnly = runPassiveAnalysis({
      fixtureId: "witch-offensive.json",
      fixtureJson: JSON.stringify({
        character: {
          ...result.character,
          skills: [],
          equipment: [],
        },
        goals: { objective: "offensive", pointBudget: 5 },
      }),
      objective: "offensive",
      pointBudget: "5",
      snapshotDirectory: developmentPassiveTreeSnapshotDirectory,
      importSource: "fixture",
    });
    expect(treeOnly.ok).toBe(true);
    if (!treeOnly.ok) return;
    expect(treeOnly.recommendation.rankedCompleteCandidates).toEqual(
      analysis.recommendation.rankedCompleteCandidates,
    );
    expect(treeOnly.recommendation.incompleteCandidates).toEqual(
      analysis.recommendation.incompleteCandidates,
    );
    expect(
      analysis.recommendation.rankedCompleteCandidates[0]?.heuristicScore,
    ).toBe(treeOnly.recommendation.rankedCompleteCandidates[0]?.heuristicScore);
    expect(analysis.recommendation.rankedCompleteCandidates[0]).toMatchObject({
      nodeIds: [4739, 18845, 1755, 41965],
      heuristicScore: 72,
    });
    expect(analysis.recommendation.profileVersion).toBe(1);

    const fixtureD = loadCase("D");
    const importedD = imported(fixtureD.code);
    const analysisD = runPassiveAnalysis({
      fixtureId: "witch-offensive.json",
      fixtureJson: "",
      objective: "offensive",
      pointBudget: "5",
      snapshotDirectory: developmentPassiveTreeSnapshotDirectory,
      importSource: "pob2",
      pob2Code: fixtureD.code,
    });
    expect(analysisD.ok).toBe(true);
    if (!analysisD.ok) return;
    expect(importedD.document.sharedPassiveIds).toEqual(
      importedD.character?.allocatedPassiveIds,
    );
    expect(importedD.document.ascendancyPassiveIds).toEqual([32699]);
    expect(importedD.character?.allocatedPassiveIds).not.toContain(32699);
    expect(analysisD.allocatedNodeIds).not.toContain(32699);
    expect(analysisD.recommendation.rankedCompleteCandidates).toEqual([]);
    expect(analysisD.recommendation.profileVersion).toBe(1);
    expect(importedD.character?.allocatedPassiveIds).not.toContain(1755);
    expect(importedD.document.weaponSetPassiveIds.set1).toEqual([1755]);
    const treeOnlyD = runPassiveAnalysis({
      fixtureId: "witch-offensive.json",
      fixtureJson: JSON.stringify({
        character: {
          ...importedD.character,
          skills: [],
          equipment: [],
        },
        goals: { objective: "offensive", pointBudget: 5 },
      }),
      objective: "offensive",
      pointBudget: "5",
      snapshotDirectory: developmentPassiveTreeSnapshotDirectory,
      importSource: "fixture",
    });
    expect(treeOnlyD.ok).toBe(true);
    if (!treeOnlyD.ok) return;
    expect(treeOnlyD.recommendation.rankedCompleteCandidates).toEqual(
      analysisD.recommendation.rankedCompleteCandidates,
    );
    expect(treeOnlyD.recommendation.incompleteCandidates).toEqual(
      analysisD.recommendation.incompleteCandidates,
    );
    expect(analysisD.recommendation.profileVersion).toBe(1);
  }, 30_000);

  it("imports the real ConfigSet export without counting placeholders", () => {
    const code = readFileSync(
      path.join(fixtureDirectory, "E.code.txt"),
      "utf8",
    ).trim();
    const truth = JSON.parse(
      readFileSync(path.join(fixtureDirectory, "E.truth.json"), "utf8"),
    ) as {
      treeVersion: string;
      activeConfigSetId: string;
      configSets: Array<{
        id: string;
        title: string;
        placeholderCount: number;
        inputs: Array<{ name: string; kind: string; value: string }>;
      }>;
      sharedPassiveIds: number[];
    };
    const decoded = decodePob2Export(code);
    const result = imported(code);
    expect(result.checksum).toBe(decoded.checksum);
    expect(result.normalizationVersion).toBe(3);
    expect(result.document.treeVersion).toBe(truth.treeVersion);
    expect(result.activeTreeVersion).toBe("0.5.5");
    expect(result.warnings).toEqual([]);
    expect(result.unavailable).not.toContain("configuration");
    expect(result.unavailable).not.toContain("tree version");
    expect(result.status).toBe("partial");
    expect(result.document.configurationSelection).toBe("active-set");
    expect(result.document.activeConfigSetId).toBe(truth.activeConfigSetId);
    expect(result.document.configurationSets).toHaveLength(
      truth.configSets.length,
    );
    const active = truth.configSets.find(
      (set) => set.id === truth.activeConfigSetId,
    );
    if (!active) throw new Error("active config set missing from truth");
    expect(
      result.document.configuration
        .map((entry) => ({
          key: entry.key,
          value: entry.value,
          valueKind: entry.valueKind,
          configSetId: entry.configSetId,
        }))
        .sort((left, right) => left.key.localeCompare(right.key)),
    ).toEqual(
      active.inputs
        .map((input) => ({
          key: input.name,
          value: input.value,
          valueKind: input.kind,
          configSetId: truth.activeConfigSetId,
        }))
        .sort((left, right) => left.key.localeCompare(right.key)),
    );
    for (const [index, expected] of truth.configSets.entries()) {
      expect(result.document.configurationSets[index]?.placeholderCount).toBe(
        expected.placeholderCount,
      );
      expect(
        result.document.configurationSets[index]?.inputs.map(
          (input) => input.key,
        ),
      ).not.toEqual(expect.arrayContaining(["enemyFireResist"]));
    }
    const placeholderNames = ["enemyFireResist", "enemyLevel", "enemyArmour"];
    for (const name of placeholderNames) {
      expect(
        result.document.configuration.map((entry) => entry.key),
      ).not.toContain(name);
    }
    expect(result.document.ascendancyPassiveIds).toContain(32699);
    expect(result.character?.allocatedPassiveIds).not.toContain(32699);

    const analysis = runPassiveAnalysis({
      fixtureId: "witch-offensive.json",
      fixtureJson: "",
      objective: "offensive",
      pointBudget: "5",
      snapshotDirectory: developmentPassiveTreeSnapshotDirectory,
      importSource: "pob2",
      pob2Code: code,
    });
    expect(analysis.ok).toBe(true);
    if (!analysis.ok || !result.character) return;
    const treeOnly = runPassiveAnalysis({
      fixtureId: "witch-offensive.json",
      fixtureJson: JSON.stringify({
        character: {
          ...result.character,
          skills: [],
          equipment: [],
        },
        goals: { objective: "offensive", pointBudget: 5 },
      }),
      objective: "offensive",
      pointBudget: "5",
      snapshotDirectory: developmentPassiveTreeSnapshotDirectory,
      importSource: "fixture",
    });
    expect(treeOnly.ok).toBe(true);
    if (!treeOnly.ok) return;
    expect(treeOnly.recommendation.rankedCompleteCandidates).toEqual(
      analysis.recommendation.rankedCompleteCandidates,
    );
  }, 30_000);
});
