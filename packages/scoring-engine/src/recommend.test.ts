import path from "node:path";
import { fileURLToPath } from "node:url";
import type { GameDataVersion } from "@poe2-helper/domain";
import {
  developmentPassiveTreeSnapshotDirectory,
  loadBuildFixture,
  loadPinnedPassiveTreeSnapshot,
} from "@poe2-helper/data-sources";
import { buildPassiveGraph } from "@poe2-helper/passive-engine";
import { describe, expect, it } from "vitest";
import {
  recommendMainTreeObjectives,
  recommendMainTreePaths,
  recommendScoredCandidates,
  scorePassivePath,
  SCORING_PROFILE_VERSION,
  scoringProfile,
  weightInventory,
} from "./index";

const dataVersion: GameDataVersion = {
  source: "test",
  version: "test-1",
  fetchedAt: "2026-09-26T00:00:00.000Z",
};

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

function recommend(
  candidates: ReturnType<typeof score>[],
  k: number,
  searchCompleteness: "exhaustive" | "truncated" = "exhaustive",
  profileId: "offensive" | "defensive" | "balanced" = "offensive",
) {
  return recommendScoredCandidates({
    candidates,
    k,
    searchCompleteness,
    dataVersion,
    profileVersion: SCORING_PROFILE_VERSION,
    profileId,
    pointBudget: 5,
  });
}

describe("top-k recommendations", () => {
  it("ranks only complete candidates and keeps their reliability fields", () => {
    const low = score(["10% increased [Spell] Damage"], "offensive", {
      nodeIds: [1],
    });
    const high = score(["30% increased [Spell] Damage"], "offensive", {
      nodeIds: [2],
      pointCost: 3,
    });
    const result = recommend([low, high], 2);
    expect(result.selectionClaim).toBe(
      "highest-scoring-complete-path-among-enumerated-candidates",
    );
    expect(result.definitive).toBe(true);
    expect(result.searchCompleteness).toBe("exhaustive");
    expect(result.rankedCompleteCandidates.map((row) => row.nodeIds)).toEqual([
      [2],
      [1],
    ]);
    expect(result.incompleteCandidates).toEqual([]);
    expect(result.rankedCompleteCandidates[0]).toMatchObject({
      heuristicScore: 60,
      scorePerPoint: 20,
      semanticConfidence: "complete",
      valuationComplete: true,
      fullValueUnknown: false,
      pointCost: 3,
      searchCompleteness: "exhaustive",
    });
    expect(result.profileVersion).toBe(1);
    expect(result.dataVersion).toEqual(dataVersion);
  });

  it("does not let a higher partial score become the winner", () => {
    const complete = score(["10% increased [Spell] Damage"], "offensive", {
      nodeIds: [1],
    });
    const partial = score(
      [
        "10% increased [Spell] Damage",
        "10% increased [Spell] Damage",
        "10% increased [Spell] Damage",
        "8% increased [Attack] and Cast Speed",
      ],
      "offensive",
      { nodeIds: [2] },
    );
    expect(partial.semanticConfidence).toBe("partial");
    expect(partial.heuristicScore).toBeGreaterThan(complete.heuristicScore);
    const result = recommend([complete, partial], 2);
    expect(result.rankedCompleteCandidates.map((row) => row.nodeIds)).toEqual([
      [1],
    ]);
    expect(result.incompleteCandidates.map((row) => row.nodeIds)).toEqual([
      [2],
    ]);
    expect(result.incompleteCandidates[0]).toMatchObject({
      fullValueUnknown: true,
      heuristicScore: partial.heuristicScore,
      semanticConfidence: "partial",
      unsupportedRawLines: ["8% increased [Attack] and Cast Speed"],
    });
    expect(result.selectionClaim).toBe("not-definitive-incomplete-valuation");
    expect(result.definitive).toBe(false);
    expect(result.selectionClaim).not.toMatch(/better|global|optimum/);
  });

  it("keeps search completeness separate from semantic confidence", () => {
    const truncatedComplete = score(
      ["10% increased [Spell] Damage"],
      "offensive",
      { nodeIds: [1], searchCompleteness: "truncated" },
    );
    const truncatedPartial = score(
      [
        "10% increased [Spell] Damage",
        "10% increased [Spell] Damage",
        "10% increased [Spell] Damage",
        "8% increased [Attack] and Cast Speed",
      ],
      "offensive",
      { nodeIds: [2], searchCompleteness: "truncated" },
    );
    const result = recommend(
      [truncatedComplete, truncatedPartial],
      2,
      "truncated",
    );
    expect(result.searchCompleteness).toBe("truncated");
    expect(result.rankedCompleteCandidates[0]?.semanticConfidence).toBe(
      "complete",
    );
    expect(result.rankedCompleteCandidates[0]?.searchCompleteness).toBe(
      "truncated",
    );
    expect(result.incompleteCandidates[0]?.semanticConfidence).toBe("partial");
    expect(result.selectionClaim).toBe("not-definitive-incomplete-valuation");
    expect(result.selectionClaim).not.toMatch(/global|optimum|exhaustive/);
  });

  it("names a truncated complete set as the best found within search limits", () => {
    const result = recommend(
      [
        score(["10% increased [Spell] Damage"], "offensive", {
          nodeIds: [1],
          searchCompleteness: "truncated",
        }),
      ],
      1,
      "truncated",
    );
    expect(result.selectionClaim).toBe(
      "highest-scoring-complete-path-found-within-search-limits",
    );
    expect(result.definitive).toBe(false);
    expect(result.searchCompleteness).toBe("truncated");
    expect(result.rankedCompleteCandidates).toHaveLength(1);
    expect(result.selectionClaim).not.toMatch(/global|optimum|exhaustive/);
  });

  it("covers empty, incomplete-only, and K boundaries", () => {
    const empty = recommend([], 3);
    expect(empty.selectionClaim).toBe("no-candidates");
    expect(empty.rankedCompleteCandidates).toEqual([]);
    expect(empty.incompleteCandidates).toEqual([]);
    expect(empty.definitive).toBe(false);

    const onlyIncomplete = recommend(
      [
        score(
          [
            "10% increased [Spell] Damage",
            "8% increased [Attack] and Cast Speed",
          ],
          "offensive",
          { nodeIds: [4] },
        ),
      ],
      3,
    );
    expect(onlyIncomplete.selectionClaim).toBe("no-complete-candidate");
    expect(onlyIncomplete.rankedCompleteCandidates).toEqual([]);
    expect(onlyIncomplete.incompleteCandidates).toHaveLength(1);
    expect(onlyIncomplete.incompleteCandidates[0]?.fullValueUnknown).toBe(true);

    const complete = [
      score(["10% increased [Spell] Damage"], "offensive", { nodeIds: [1] }),
      score(["30% increased [Spell] Damage"], "offensive", { nodeIds: [2] }),
    ];
    expect(recommend(complete, 0).rankedCompleteCandidates).toEqual([]);
    expect(recommend(complete, 0).selectionClaim).toBe(
      "highest-scoring-complete-path-among-enumerated-candidates",
    );
    expect(recommend(complete, 0).definitive).toBe(false);
    expect(recommend(complete, 1).rankedCompleteCandidates).toHaveLength(1);
    expect(recommend(complete, 1).rankedCompleteCandidates[0]?.nodeIds).toEqual(
      [2],
    );
    expect(recommend(complete, 9).rankedCompleteCandidates).toHaveLength(2);

    const mixed = recommend(
      [
        ...complete,
        score(
          [
            "40% increased [Spell] Damage",
            "8% increased [Attack] and Cast Speed",
          ],
          "offensive",
          { nodeIds: [9] },
        ),
      ],
      0,
    );
    expect(mixed.rankedCompleteCandidates).toEqual([]);
    expect(mixed.incompleteCandidates).toHaveLength(1);
    expect(mixed.selectionClaim).toBe("not-definitive-incomplete-valuation");
  });

  it("breaks ties by point cost and then node id", () => {
    const costly = score(["10% increased [Spell] Damage"], "offensive", {
      nodeIds: [1],
      pointCost: 4,
    });
    const cheap = score(["10% increased [Spell] Damage"], "offensive", {
      nodeIds: [8],
      pointCost: 1,
    });
    expect(
      recommend([costly, cheap], 2).rankedCompleteCandidates.map(
        (row) => row.nodeIds,
      ),
    ).toEqual([[8], [1]]);

    const later = score(["10% increased [Spell] Damage"], "offensive", {
      nodeIds: [2],
    });
    const earlier = score(["10% increased [Spell] Damage"], "offensive", {
      nodeIds: [1],
    });
    expect(
      recommend([later, earlier], 2).rankedCompleteCandidates.map(
        (row) => row.nodeIds,
      ),
    ).toEqual([[1], [2]]);
  });

  it("repeats the same ordering and changes it when the profile changes", () => {
    const spell = score(["10% increased [Spell] Damage"], "offensive", {
      nodeIds: [1],
    });
    const other = score(["10% increased [Projectile] Damage"], "offensive", {
      nodeIds: [2],
    });
    expect(recommend([other, spell], 2)).toEqual(recommend([spell, other], 2));

    const lifeOnDefense = score(["10% increased maximum Life"], "defensive", {
      nodeIds: [2],
    });
    const spellOnDefense = score(
      ["10% increased [Spell] Damage"],
      "defensive",
      { nodeIds: [1] },
    );
    const defensive = recommendScoredCandidates({
      candidates: [spellOnDefense, lifeOnDefense],
      k: 2,
      searchCompleteness: "exhaustive",
      dataVersion,
      profileVersion: SCORING_PROFILE_VERSION,
      profileId: "defensive",
      pointBudget: 5,
    });
    expect(
      defensive.rankedCompleteCandidates.map((row) => row.nodeIds),
    ).toEqual([[2]]);
    expect(defensive.incompleteCandidates.map((row) => row.nodeIds)).toEqual([
      [1],
    ]);

    const spellOnOffense = score(
      ["10% increased [Spell] Damage"],
      "offensive",
      {
        nodeIds: [1],
      },
    );
    const lifeOnOffense = score(["10% increased maximum Life"], "offensive", {
      nodeIds: [2],
    });
    const offensive = recommend([spellOnOffense, lifeOnOffense], 2);
    expect(
      offensive.rankedCompleteCandidates.map((row) => row.nodeIds),
    ).toEqual([[1]]);
    expect(offensive.incompleteCandidates.map((row) => row.nodeIds)).toEqual([
      [2],
    ]);
    expect(offensive.profileId).not.toBe(defensive.profileId);
  });

  it("leaves maximum resistance unscored and outside the complete ranking", () => {
    expect(
      weightInventory().some(
        (row) =>
          row.semanticId.includes("resistance") &&
          row.semanticId.startsWith("maximum-"),
      ),
    ).toBe(false);
    expect(SCORING_PROFILE_VERSION).toBe(1);

    const life = score(["10% increased maximum Life"], "defensive", {
      nodeIds: [1],
    });
    const withMaximumResistance = score(
      [
        "30% increased maximum Life",
        "+1% to [MaximumResistances|Maximum Cold Resistance]",
      ],
      "defensive",
      { nodeIds: [2] },
    );
    expect(withMaximumResistance.heuristicScore).toBeGreaterThan(
      life.heuristicScore,
    );
    expect(withMaximumResistance.valuationComplete).toBe(false);
    expect(withMaximumResistance.contributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "maximum-cold-resistance",
          supported: false,
          contribution: 0,
        }),
      ]),
    );
    const result = recommendScoredCandidates({
      candidates: [life, withMaximumResistance],
      k: 2,
      searchCompleteness: "exhaustive",
      dataVersion,
      profileVersion: SCORING_PROFILE_VERSION,
      profileId: "defensive",
      pointBudget: 5,
    });
    expect(result.rankedCompleteCandidates.map((row) => row.nodeIds)).toEqual([
      [1],
    ]);
    expect(result.incompleteCandidates[0]).toMatchObject({
      nodeIds: [2],
      fullValueUnknown: true,
    });
    expect(result.selectionClaim).toBe("not-definitive-incomplete-valuation");

    const unrecognized = score(
      [
        "+2% to [MaximumResistances|Maximum Fire Resistance] if you have at least 5 Red [SupportGem|Support Gems] Socketed",
      ],
      "offensive",
    );
    expect(unrecognized.unsupportedRawLines).toEqual([
      "+2% to [MaximumResistances|Maximum Fire Resistance] if you have at least 5 Red [SupportGem|Support Gems] Socketed",
    ]);
    expect(recommend([unrecognized], 1).selectionClaim).toBe(
      "no-complete-candidate",
    );
  });

  it("keeps derived deflection valuation-incomplete", () => {
    const derived = score(
      [
        "Gain [Deflect|Deflection Rating] equal to 4% of [Evasion|Evasion Rating]",
      ],
      "defensive",
    );
    expect(derived.heuristicScore).toBe(0);
    expect(derived.contributions).toEqual([
      expect.objectContaining({
        label: "deflection-from-evasion",
        supported: false,
      }),
    ]);
    expect(derived.contributions[0]?.label).not.toBe("deflection");
    const result = recommendScoredCandidates({
      candidates: [derived],
      k: 1,
      searchCompleteness: "exhaustive",
      dataVersion,
      profileVersion: SCORING_PROFILE_VERSION,
      profileId: "defensive",
      pointBudget: 5,
    });
    expect(result.rankedCompleteCandidates).toEqual([]);
    expect(result.incompleteCandidates[0]?.fullValueUnknown).toBe(true);
    expect(result.selectionClaim).toBe("no-complete-candidate");
  });

  it("rejects a negative K", () => {
    expect(() => recommend([], -1)).toThrow(RangeError);
  });
});

describe("pinned fixture recommendations", () => {
  const snapshot = loadPinnedPassiveTreeSnapshot({
    snapshotDirectory: developmentPassiveTreeSnapshotDirectory,
    logger: () => undefined,
  });
  const graph = buildPassiveGraph(snapshot);

  function recommendFixture(fileName: string) {
    const loaded = loadBuildFixture({
      filePath: path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../data-sources/fixtures/builds",
        fileName,
      ),
      snapshot,
    });
    return recommendMainTreeObjectives({
      fixture: loaded.fixture,
      graph,
      k: 3,
    });
  }

  it("records Witch and Warrior recommendations", () => {
    const witch = recommendFixture("witch-offensive.json");
    const warrior = recommendFixture("warrior-defensive.json");
    const loaded = loadBuildFixture({
      filePath: path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../data-sources/fixtures/builds",
        "witch-offensive.json",
      ),
      snapshot,
    });
    const direct = recommendMainTreePaths({
      fixture: loaded.fixture,
      graph,
      profile: scoringProfile("offensive"),
      k: 3,
    });
    expect(direct).toEqual(witch.offensive);

    expect(witch.offensive).toMatchObject({
      selectionClaim: "not-definitive-incomplete-valuation",
      searchCompleteness: "exhaustive",
      definitive: false,
      profileVersion: 1,
      profileId: "offensive",
      pointBudget: 5,
      k: 3,
    });
    expect(witch.offensive.dataVersion.version).toBe("0.5.5");
    expect(witch.offensive.dataVersion.commit).toBe(
      "bd87e6512c92b868542eddfb1ba4ea8b6dc2da36",
    );
    expect(witch.offensive.rankedCompleteCandidates).toHaveLength(2);
    expect(witch.offensive.incompleteCandidates).toHaveLength(309);
    expect(witch.offensive.rankedCompleteCandidates[0]).toMatchObject({
      nodeIds: [1755, 41965],
      pointCost: 2,
      heuristicScore: 32,
      semanticConfidence: "complete",
      searchCompleteness: "exhaustive",
      valuationComplete: true,
      fullValueUnknown: false,
    });
    expect(witch.offensive.rankedCompleteCandidates[1]).toMatchObject({
      nodeIds: [1755],
      pointCost: 1,
      heuristicScore: 16,
    });
    expect(witch.defensive.rankedCompleteCandidates[0]).toMatchObject({
      nodeIds: [44871, 30346, 34006, 15408, 2254],
      pointCost: 5,
      heuristicScore: 112.5,
    });
    expect(witch.defensive.rankedCompleteCandidates[0]?.nodeIds).not.toEqual(
      witch.offensive.rankedCompleteCandidates[0]?.nodeIds,
    );

    expect(warrior.defensive).toMatchObject({
      selectionClaim: "no-complete-candidate",
      searchCompleteness: "exhaustive",
      definitive: false,
      profileVersion: 1,
      pointBudget: 3,
    });
    expect(warrior.defensive.rankedCompleteCandidates).toEqual([]);
    expect(warrior.defensive.incompleteCandidates).toHaveLength(41);
    expect(warrior.defensive.incompleteCandidates[0]).toMatchObject({
      nodeIds: [4665, 61534, 7721],
      pointCost: 3,
      heuristicScore: 22.5,
      semanticConfidence: "complete",
      valuationComplete: false,
      fullValueUnknown: true,
      unsupportedRawLines: [],
    });
    expect(warrior.defensive.incompleteCandidates[0]?.contributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          statId: "regeneration.plain.regeneration-maximum-life-per-second",
          supported: false,
          contribution: 0,
        }),
        expect.objectContaining({
          label: "armour",
          supported: true,
          contribution: 21,
        }),
      ]),
    );
  });
});
