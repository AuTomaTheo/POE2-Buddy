import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  developmentPassiveTreeSnapshotDirectory,
  loadBuildFixture,
  loadPinnedPassiveTreeSnapshot,
} from "@poe2-helper/data-sources";
import {
  buildPassiveGraph,
  enumerateMainTreePaths,
} from "@poe2-helper/passive-engine";
import { describe, expect, it } from "vitest";
import {
  compareScoredCandidates,
  scorePassivePath,
  SCORING_PROFILE_VERSION,
  scoringProfile,
  selectScoredCandidates,
  weightInventory,
} from "./index";

function score(
  rawStats: readonly string[],
  profileId: "offensive" | "defensive" | "balanced",
  options?: {
    nodeIds?: readonly number[];
    pointCost?: number;
    searchCompleteness?: "exhaustive" | "truncated";
  },
) {
  return scorePassivePath({
    nodes: [{ id: options?.nodeIds?.[0] ?? 1, rawStats: [...rawStats] }],
    nodeIds: options?.nodeIds ?? [1],
    pointCost: options?.pointCost ?? 1,
    profile: scoringProfile(profileId),
    searchCompleteness: options?.searchCompleteness ?? "exhaustive",
  });
}

describe("weight calibration", () => {
  it("lists every profile cell, including null operations", () => {
    const inventory = weightInventory();
    const again = weightInventory();
    expect(again).toEqual(inventory);
    expect(inventory.length).toBeGreaterThan(0);
    for (const row of inventory) {
      expect(row).toHaveProperty("offensive");
      expect(row).toHaveProperty("defensive");
      expect(row).toHaveProperty("balanced");
    }
    const crit = inventory.find(
      (row) =>
        row.semanticId === "critical-hit-chance" && row.operation === "added",
    );
    expect(crit).toMatchObject({
      offensive: 8,
      defensive: null,
      balanced: 4,
      offensivePresent: true,
      defensivePresent: false,
      balancedPresent: true,
    });
    const attackSpeed = inventory.find(
      (row) => row.semanticId === "attack-speed" && row.operation === "added",
    );
    expect(attackSpeed).toMatchObject({
      offensive: null,
      offensivePresent: true,
    });
    expect(inventory.some((row) => row.semanticId === "movement-speed")).toBe(
      false,
    );
    expect(
      inventory.some((row) => row.semanticId === "maximum-cold-resistance"),
    ).toBe(false);
  });

  it("keeps reduced as the opposite sign of increased", () => {
    for (const profile of [
      scoringProfile("offensive"),
      scoringProfile("defensive"),
      scoringProfile("balanced"),
    ]) {
      expect(profile.version).toBe(SCORING_PROFILE_VERSION);
      for (const entry of Object.values(profile.weights)) {
        if (entry.increased === null) {
          expect(entry.reduced).toBeNull();
        } else {
          expect(entry.reduced).toBe(-entry.increased);
          expect(entry.added).not.toBe(entry.increased);
        }
      }
    }
    expect(scoringProfile("offensive").weights["maximum-life"]).toBeUndefined();
    expect(scoringProfile("defensive").weights["spell-damage"]).toBeUndefined();
  });

  it("lets offense and defense choose opposite paths, and balanced ties the headlines", () => {
    const offense = (profile: "offensive" | "defensive" | "balanced") =>
      score(["10% increased [Spell] Damage"], profile, { nodeIds: [1] });
    const defense = (profile: "offensive" | "defensive" | "balanced") =>
      score(["10% increased maximum Life"], profile, { nodeIds: [2] });

    expect(offense("offensive").heuristicScore).toBeGreaterThan(
      defense("offensive").heuristicScore,
    );
    expect(defense("offensive").valuationComplete).toBe(false);

    expect(offense("defensive").heuristicScore).toBe(0);
    expect(defense("defensive").heuristicScore).toBe(20);
    expect(defense("defensive").heuristicScore).toBeGreaterThan(
      offense("defensive").heuristicScore,
    );

    expect(offense("balanced").heuristicScore).toBe(10);
    expect(defense("balanced").heuristicScore).toBe(10);
    expect(
      compareScoredCandidates(offense("balanced"), defense("balanced"))
        .preferred?.nodeIds,
    ).toEqual([1]);
  });

  it("keeps utility and flat attributes below a same-sized core stat", () => {
    const projectile = score(
      ["10% increased [Projectile] Damage"],
      "offensive",
    );
    const accuracy = score(["30% increased [Accuracy] Rating"], "offensive");
    const speed = score(["10% increased [Projectile] Speed"], "offensive");
    const movement = score(["10% increased Movement Speed"], "offensive");
    expect(projectile.heuristicScore).toBe(20);
    expect(accuracy.heuristicScore).toBe(9);
    expect(speed.heuristicScore).toBe(5);
    expect(movement.heuristicScore).toBe(0);
    expect(movement.contributions[0]?.supported).toBe(false);
    expect(accuracy.heuristicScore).toBeLessThan(projectile.heuristicScore);
    expect(speed.heuristicScore).toBeLessThan(projectile.heuristicScore);

    const life = score(["10% increased maximum Life"], "defensive");
    const strength = score(["+40 to [Strength]"], "defensive");
    const armour = score(["10% increased [Armour]"], "defensive");
    const maximumResistance = score(
      ["+1% to [MaximumResistances|Maximum Cold Resistance]"],
      "defensive",
    );
    expect(life.heuristicScore).toBe(20);
    expect(strength.heuristicScore).toBe(6);
    expect(armour.heuristicScore).toBe(14);
    expect(maximumResistance.heuristicScore).toBe(0);
    expect(maximumResistance.contributions[0]?.supported).toBe(false);
    expect(strength.heuristicScore).toBeLessThan(life.heuristicScore);
    expect(maximumResistance.heuristicScore).not.toBe(armour.heuristicScore);
  });

  it("groups projectile crit above projectile speed, and life above one resistance", () => {
    const critPackage = score(
      [
        "10% increased [Projectile] Damage",
        "10% increased [Critical|Critical Hit Chance]",
        "10% increased [CriticalDamageBonus|Critical Damage Bonus]",
      ],
      "offensive",
    );
    const speedOnly = score(["10% increased [Projectile] Speed"], "offensive", {
      nodeIds: [2],
    });
    expect(critPackage.heuristicScore).toBe(20 + 15 + 12);
    expect(speedOnly.heuristicScore).toBe(5);
    expect(
      compareScoredCandidates(critPackage, speedOnly).preferred?.nodeIds,
    ).toEqual([1]);

    const defenses = score(
      [
        "10% increased maximum Life",
        "10% increased maximum [EnergyShield|Energy Shield]",
        "10% increased [Armour]",
        "+10% to [Resistances|Fire Resistance]",
      ],
      "defensive",
    );
    expect(defenses.heuristicScore).toBe(20 + 18 + 14 + 6);
    const evasionPackage = score(
      [
        "10% increased [Evasion|Evasion Rating]",
        "10% increased [Deflect|Deflection Rating]",
      ],
      "defensive",
    );
    expect(evasionPackage.heuristicScore).toBe(16 + 14);
  });

  it("ranks by heuristic score, not score per point", () => {
    const short = score(["10% increased [Spell] Damage"], "offensive", {
      nodeIds: [1],
      pointCost: 1,
    });
    const long = score(["30% increased [Spell] Damage"], "offensive", {
      nodeIds: [2],
      pointCost: 5,
    });
    expect(short.heuristicScore).toBe(20);
    expect(short.scorePerPoint).toBe(20);
    expect(long.heuristicScore).toBe(60);
    expect(long.scorePerPoint).toBe(12);
    expect(compareScoredCandidates(short, long).preferred?.nodeIds).toEqual([
      2,
    ]);
    expect(compareScoredCandidates(short, long).claim).toBe(
      "highest-scoring-path-among-enumerated-candidates",
    );
  });

  it("does not let calibration make a partial or truncated result definitive", () => {
    const complete = score(["10% increased [Spell] Damage"], "offensive", {
      nodeIds: [1],
    });
    const partial = score(
      ["20% increased [Spell] Damage", "8% increased [Attack] and Cast Speed"],
      "offensive",
      { nodeIds: [2] },
    );
    expect(partial.heuristicScore).toBeGreaterThan(complete.heuristicScore);
    expect(compareScoredCandidates(complete, partial)).toMatchObject({
      definitive: false,
      claim: "not-definitive",
      preferred: null,
    });

    const truncated = score(["10% increased [Spell] Damage"], "offensive", {
      searchCompleteness: "truncated",
    });
    const selection = selectScoredCandidates([truncated]);
    expect(selection.definitive).toBe(false);
    expect(selection.claim).toBe("best-path-found-within-search-limits");
    expect(selection.claim).not.toMatch(/global|optimum|exhaustive/);
  });

  it("repeats the same score for the same profile version", () => {
    const first = score(["10% increased [Spell] Damage"], "offensive");
    const second = score(["10% increased [Spell] Damage"], "offensive");
    expect(second).toEqual(first);
    expect(first.profileVersion).toBe(1);
    expect(score(["20% more Damage"], "offensive").heuristicScore).toBe(0);
  });
});

describe("pinned fixture scores after calibration", () => {
  const snapshot = loadPinnedPassiveTreeSnapshot({
    snapshotDirectory: developmentPassiveTreeSnapshotDirectory,
    logger: () => undefined,
  });
  const graph = buildPassiveGraph(snapshot);

  function firstPath(fileName: string, profileId: "offensive" | "defensive") {
    const loaded = loadBuildFixture({
      filePath: path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../data-sources/fixtures/builds",
        fileName,
      ),
      snapshot,
    });
    const search = enumerateMainTreePaths(loaded.fixture, graph);
    const candidate = search.paths[0];
    expect(candidate).toBeDefined();
    if (!candidate) {
      throw new Error(`No path in ${fileName}.`);
    }
    const scored = scorePassivePath({
      nodes: candidate.nodeIds.map((id) => {
        const node = graph.node(id);
        return { id: node.id, rawStats: node.rawStats };
      }),
      nodeIds: candidate.nodeIds,
      pointCost: candidate.pointCost,
      profile: scoringProfile(profileId),
      searchCompleteness: search.searchCompleteness,
    });
    return { search, scored };
  }

  it("records the first Witch and Warrior paths", () => {
    const witch = firstPath("witch-offensive.json", "offensive");
    const warrior = firstPath("warrior-defensive.json", "defensive");

    expect(witch.scored.profileVersion).toBe(1);
    expect(witch.scored.nodeIds).toEqual([1755]);
    expect(witch.scored.heuristicScore).toBe(16);
    expect(witch.scored.pointCost).toBe(1);
    expect(witch.scored.semanticConfidence).toBe("complete");
    expect(witch.scored.searchCompleteness).toBe("exhaustive");
    expect(witch.scored.valuationComplete).toBe(true);
    expect(witch.scored.contributions).toEqual([
      expect.objectContaining({
        label: "spell-damage",
        amount: 8,
        weight: 2,
        contribution: 16,
        supported: true,
      }),
    ]);

    expect(warrior.scored.profileVersion).toBe(1);
    expect(warrior.scored.nodeIds).toEqual([3936]);
    expect(warrior.scored.heuristicScore).toBe(0);
    expect(warrior.scored.pointCost).toBe(1);
    expect(warrior.scored.semanticConfidence).toBe("complete");
    expect(warrior.scored.searchCompleteness).toBe("exhaustive");
    expect(warrior.scored.unsupportedRawLines).toEqual([]);
    expect(warrior.scored.valuationComplete).toBe(false);
    expect(warrior.scored.contributions).toEqual([
      expect.objectContaining({
        label: "melee-damage",
        amount: 10,
        weight: 0,
        contribution: 0,
        supported: false,
      }),
    ]);
  });
});
