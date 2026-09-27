import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseBuildFixture } from "@poe2-helper/domain";
import { describe, expect, it } from "vitest";
import {
  developmentPassiveTreeSnapshotDirectory,
  loadPinnedPassiveTreeSnapshot,
} from "../passive-tree/load-pinned-snapshot";
import {
  loadBuildFixture,
  reportBuildFixtureAgainstSnapshot,
} from "./load-build-fixture";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const fixtureDirectory = path.join(packageRoot, "fixtures/builds");

const snapshot = loadPinnedPassiveTreeSnapshot({
  snapshotDirectory: developmentPassiveTreeSnapshotDirectory,
  logger: () => undefined,
});

function loadNamed(name: string) {
  return loadBuildFixture({
    filePath: path.join(fixtureDirectory, name),
    snapshot,
  });
}

describe("build fixtures", () => {
  it("loads the Witch and Warrior fixtures against the pinned tree", () => {
    const witch = loadNamed("witch-offensive.json");
    const warrior = loadNamed("warrior-defensive.json");

    expect(witch.unknownAllocatedIds).toEqual([]);
    expect(witch.unknownWeaponSetIds).toEqual([]);
    expect(witch.unknownClassName).toBeNull();
    expect(warrior.unknownAllocatedIds).toEqual([]);
    expect(warrior.unknownWeaponSetIds).toEqual([]);
    expect(warrior.unknownClassName).toBeNull();

    expect(witch.fixture.character.className).toBe("Witch");
    expect(witch.fixture.character.ascendancy).toBe("Infernalist");
    expect(witch.fixture.goals).toEqual({
      objective: "offensive",
      pointBudget: 5,
    });
    expect(warrior.fixture.character.className).toBe("Warrior");
    expect(warrior.fixture.character.ascendancy).toBeUndefined();
    expect(warrior.fixture.goals).toEqual({
      objective: "defensive",
      pointBudget: 3,
    });

    expect(nodeName(54447)).toBe("WITCH");
    expect(nodeName(4739)).toBe("Spell Damage");
    expect(nodeName(18845)).toBe("Spell Damage");
    expect(witch.fixture.character.allocatedPassiveIds).toEqual([
      54447, 4739, 18845,
    ]);

    expect(nodeName(47175)).toBe("MARAUDER");
    expect(nodeName(38646)).toBe("Armour");
    expect(nodeName(1913)).toBe("Armour");
    expect(warrior.fixture.character.allocatedPassiveIds).toEqual([
      47175, 38646, 1913,
    ]);

    expect(witch.fixture.character.sourceVersion.commit).toBe(
      snapshot.version.commit,
    );
    expect(warrior.fixture.character.sourceVersion.commit).toBe(
      snapshot.version.commit,
    );
  });

  it("loads the same file to the same result", () => {
    const first = loadNamed("witch-offensive.json");
    const second = loadNamed("witch-offensive.json");

    expect(second).toEqual(first);
    expect(first.fixture.character.allocatedPassiveIds).toEqual([
      54447, 4739, 18845,
    ]);
  });

  it("reports unknown passive ids and an unknown class without removing them", () => {
    const loaded = loadNamed("warrior-defensive.json");
    const broken = parseBuildFixture({
      ...loaded.fixture,
      character: {
        ...loaded.fixture.character,
        className: "NotAClass",
        allocatedPassiveIds: [47175, 999999999, 999999999],
        weaponSetSpecialisations: {
          set1: [42],
          set2: [],
          set3: [999999999],
        },
      },
    });

    const report = reportBuildFixtureAgainstSnapshot(broken, snapshot);

    expect(report.fixture.character.allocatedPassiveIds).toEqual([
      47175, 999999999, 999999999,
    ]);
    expect(report.unknownAllocatedIds).toEqual([999999999, 999999999]);
    expect(report.unknownWeaponSetIds).toEqual([
      { set: "set1", nodeId: 42 },
      { set: "set3", nodeId: 999999999 },
    ]);
    expect(report.unknownClassName).toBe("NotAClass");
    expect(snapshot.nodes.some((node) => node.id === 42)).toBe(false);
  });
});

describe("data-sources package boundary", () => {
  it("does not depend on the passive engine or the web app", () => {
    const packageJson = JSON.parse(
      readFileSync(path.join(packageRoot, "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };

    expect(packageJson.dependencies).toEqual({
      "@poe2-helper/domain": "0.1.0",
      zod: "^3.25.76",
    });
  });
});

function nodeName(id: number): string | undefined {
  return snapshot.nodes.find((node) => node.id === id)?.name;
}
