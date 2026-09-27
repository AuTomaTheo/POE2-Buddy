import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildFixtureSchema,
  buildGoalsSchema,
  characterBuildSnapshotSchema,
  parseBuildFixture,
  parseCharacterBuildSnapshot,
  parsePassiveTreeSnapshot,
  parseRecommendation,
  passiveTreeSnapshotSchema,
  recommendationSchema,
} from "./index";

const fixtureDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures",
);

function readFixture(name: string): unknown {
  const contents = readFileSync(path.join(fixtureDirectory, name), "utf8");
  return JSON.parse(contents) as unknown;
}

describe("domain fixtures", () => {
  it("parses the sample passive tree", () => {
    const tree = parsePassiveTreeSnapshot(
      readFixture("passive-tree.sample.json"),
    );

    expect(tree.nodes).toHaveLength(4);
    expect(tree.nodes.map((node) => node.id)).toEqual([101, 102, 103, 201]);
    expect(tree.version.source).toBe("fixture");
  });

  it("rejects a neighbor that is not in the tree", () => {
    const tree = readFixture("passive-tree.sample.json") as {
      nodes: Array<{ id: number; neighborIds: number[] }>;
    };
    const travel = tree.nodes.find((node) => node.id === 101);
    travel?.neighborIds.push(999);

    const result = passiveTreeSnapshotSchema.safeParse(tree);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.message.includes("999")),
      ).toBe(true);
    }
  });

  it("rejects a raw character field that is not part of the internal model", () => {
    const character = readFixture("character-witch.sample.json") as Record<
      string,
      unknown
    >;
    character.hashes = [101];

    const result = characterBuildSnapshotSchema.safeParse(character);

    expect(result.success).toBe(false);
  });

  it("keeps weapon-set nodes out of the shared allocation", () => {
    const witch = parseCharacterBuildSnapshot(
      readFixture("character-witch.sample.json"),
    );
    const warrior = parseCharacterBuildSnapshot(
      readFixture("character-warrior.sample.json"),
    );

    expect(witch.className).toBe("Witch");
    expect(witch.weaponSetSpecialisations.set2).toEqual([103]);
    expect(witch.allocatedPassiveIds).not.toContain(103);
    expect(warrior.className).toBe("Warrior");
    expect(warrior.weaponSetSpecialisations).toEqual({
      set1: [],
      set2: [],
      set3: [],
    });
  });

  it("parses a build fixture and keeps goals off the character snapshot", () => {
    const character = readFixture("character-witch.sample.json");
    const fixture = parseBuildFixture({
      character,
      goals: { objective: "balanced", pointBudget: 4 },
    });

    expect(fixture.goals).toEqual({ objective: "balanced", pointBudget: 4 });
    expect(fixture.character.className).toBe("Witch");
    expect(
      buildGoalsSchema.safeParse({ objective: "offensive", pointBudget: 3.5 })
        .success,
    ).toBe(false);
    expect(
      buildGoalsSchema.safeParse({ objective: "offensive", pointBudget: -1 })
        .success,
    ).toBe(false);
    expect(
      buildGoalsSchema.safeParse({ objective: "offensive", pointBudget: 5 })
        .success,
    ).toBe(true);
    expect(
      buildFixtureSchema.safeParse({
        character,
        goals: { objective: "offensive" },
      }).success,
    ).toBe(false);
  });

  it("parses a heuristic recommendation and rejects an over-budget path", () => {
    const recommendation = parseRecommendation(
      readFixture("recommendation.sample.json"),
    );

    expect(recommendation.scoreKind).toBe("heuristic");
    expect(recommendation.paths[0]?.pointCost).toBe(2);

    const overBudget = {
      ...recommendation,
      paths: [{ ...recommendation.paths[0], pointCost: 5 }],
    };
    const result = recommendationSchema.safeParse(overBudget);

    expect(result.success).toBe(false);
  });
});

describe("domain package boundary", () => {
  it("depends only on the schema library", () => {
    const packageJson = JSON.parse(
      readFileSync(
        path.resolve(
          path.dirname(fileURLToPath(import.meta.url)),
          "../package.json",
        ),
        "utf8",
      ),
    ) as { dependencies?: Record<string, string> };

    expect(Object.keys(packageJson.dependencies ?? {})).toEqual(["zod"]);
  });
});
