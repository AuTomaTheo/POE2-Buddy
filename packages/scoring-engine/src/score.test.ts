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
  scoringProfile,
  selectScoredCandidates,
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

describe("heuristic scoring guardrails", () => {
  it("returns reliability context with the heuristic score", () => {
    const scored = score(["10% increased [Spell] Damage"], "offensive");
    expect(scored.heuristicScore).toBe(20);
    expect(scored.scorePerPoint).toBe(20);
    expect(scored.semanticConfidence).toBe("complete");
    expect(scored.searchCompleteness).toBe("exhaustive");
    expect(scored.pathSemanticCoverage.totalStatLines).toBe(1);
    expect(scored.contributions).toEqual([
      expect.objectContaining({
        label: "spell-damage",
        amount: 10,
        weight: 2,
        contribution: 20,
        supported: true,
      }),
    ]);
    expect(scored).not.toHaveProperty("dps");
  });

  it("does not treat an unsupported line as a zero-value effect", () => {
    const known = score(["10% increased [Spell] Damage"], "offensive");
    const withUnknown = score(
      ["10% increased [Spell] Damage", "8% increased [Attack] and Cast Speed"],
      "offensive",
    );
    expect(withUnknown.heuristicScore).toBe(known.heuristicScore);
    expect(withUnknown.unsupportedRawLines).toEqual([
      "8% increased [Attack] and Cast Speed",
    ]);
    expect(withUnknown.semanticConfidence).not.toBe("complete");
    expect(withUnknown.valuationComplete).toBe(false);
    expect(
      withUnknown.contributions.some(
        (contribution) => contribution.amount === 0,
      ),
    ).toBe(false);
  });

  it("does not call a higher partial score definitively better", () => {
    const complete = score(["10% increased [Spell] Damage"], "offensive", {
      nodeIds: [1],
    });
    const partial = score(
      ["20% increased [Spell] Damage", "8% increased [Attack] and Cast Speed"],
      "offensive",
      { nodeIds: [2] },
    );
    expect(partial.heuristicScore).toBeGreaterThan(complete.heuristicScore);
    expect(partial.semanticConfidence).not.toBe("complete");
    const comparison = compareScoredCandidates(complete, partial);
    expect(comparison.definitive).toBe(false);
    expect(comparison.claim).toBe("not-definitive");
    expect(comparison.preferred).toBeNull();
    expect(comparison.higherHeuristicScore?.nodeIds).toEqual([2]);
  });

  it("compares two complete exhaustive paths by heuristic score", () => {
    const lower = score(["10% increased [Spell] Damage"], "offensive", {
      nodeIds: [1],
    });
    const higher = score(["20% increased [Spell] Damage"], "offensive", {
      nodeIds: [2],
    });
    const comparison = compareScoredCandidates(lower, higher);
    expect(comparison.definitive).toBe(true);
    expect(comparison.claim).toBe(
      "highest-scoring-path-among-enumerated-candidates",
    );
    expect(comparison.preferred?.nodeIds).toEqual([2]);
  });

  it("does not call a truncated search the global optimum", () => {
    const scored = score(["10% increased [Spell] Damage"], "offensive", {
      searchCompleteness: "truncated",
    });
    const selection = selectScoredCandidates([scored]);
    expect(selection.definitive).toBe(false);
    expect(selection.claim).toBe("best-path-found-within-search-limits");
    expect(selection.claim).not.toMatch(/global|optimum|exhaustive/);
    expect(scored.searchCompleteness).toBe("truncated");
    expect(scored.semanticConfidence).toBe("complete");
  });

  it("changes with the objective profile and with an edited weight", () => {
    const lines = [
      "10% increased [Spell] Damage",
      "10% increased [Evasion|Evasion Rating]",
    ];
    const offensive = score(lines, "offensive");
    const defensive = score(lines, "defensive");
    expect(offensive.heuristicScore).not.toBe(defensive.heuristicScore);
    expect(offensive.profileId).toBe("offensive");
    expect(defensive.profileId).toBe("defensive");

    const edited = {
      ...scoringProfile("offensive"),
      weights: {
        ...scoringProfile("offensive").weights,
        "spell-damage": { increased: 4, reduced: -4, added: 0.25 },
      },
    };
    const rescored = scorePassivePath({
      nodes: [{ id: 1, rawStats: ["10% increased [Spell] Damage"] }],
      nodeIds: [1],
      pointCost: 1,
      profile: edited,
      searchCompleteness: "exhaustive",
    });
    expect(rescored.heuristicScore).toBe(40);
  });

  it("leaves more, conditionals, and derived deflection unscored", () => {
    const more = score(["20% more Damage"], "offensive");
    expect(more.heuristicScore).toBe(0);
    expect(more.contributions[0]).toMatchObject({
      label: "damage",
      amount: 20,
      supported: false,
      contribution: 0,
    });
    expect(more.valuationComplete).toBe(false);

    const conditional = score(
      ["40% increased [Attack] Damage while on Full Life"],
      "offensive",
    );
    expect(conditional.heuristicScore).toBe(0);
    expect(conditional.contributions[0]?.supported).toBe(false);

    const derived = score(
      [
        "Gain [Deflect|Deflection Rating] equal to 4% of [Evasion|Evasion Rating]",
      ],
      "defensive",
    );
    expect(derived.heuristicScore).toBe(0);
    expect(derived.contributions[0]).toMatchObject({
      label: "deflection-from-evasion",
      amount: 4,
      supported: false,
    });
    expect(derived.contributions[0]?.label).not.toBe("deflection");
  });

  it("breaks equal heuristic scores by point cost and then node ids", () => {
    const cheaper = score(["10% increased [Spell] Damage"], "offensive", {
      nodeIds: [4],
      pointCost: 1,
    });
    const costlier = score(["10% increased [Spell] Damage"], "offensive", {
      nodeIds: [2],
      pointCost: 2,
    });
    expect(cheaper.heuristicScore).toBe(costlier.heuristicScore);
    expect(
      compareScoredCandidates(costlier, cheaper).preferred?.nodeIds,
    ).toEqual([4]);

    const higherId = score(["10% increased [Spell] Damage"], "offensive", {
      nodeIds: [9],
      pointCost: 1,
    });
    const lowerId = score(["10% increased [Spell] Damage"], "offensive", {
      nodeIds: [3],
      pointCost: 1,
    });
    expect(
      compareScoredCandidates(higherId, lowerId).preferred?.nodeIds,
    ).toEqual([3]);
  });

  it("scores an empty path without dividing by zero", () => {
    const empty = scorePassivePath({
      nodes: [],
      nodeIds: [],
      pointCost: 0,
      profile: scoringProfile("balanced"),
      searchCompleteness: "exhaustive",
    });
    expect(empty.heuristicScore).toBe(0);
    expect(empty.scorePerPoint).toBe(0);
    expect(empty.semanticConfidence).toBe("complete");
    expect(empty.unsupportedRawLines).toEqual([]);
    expect(selectScoredCandidates([]).claim).toBe("no-candidates");
  });

  it("keeps search completeness separate on a pinned Witch path", () => {
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
    const scored = scorePassivePath({
      nodes: candidate.nodeIds.map((id) => {
        const node = graph.node(id);
        return { id: node.id, rawStats: node.rawStats };
      }),
      nodeIds: candidate.nodeIds,
      pointCost: candidate.pointCost,
      profile: scoringProfile("offensive"),
      searchCompleteness: search.searchCompleteness,
    });
    expect(scored.searchCompleteness).toBe(search.searchCompleteness);
    expect(scored.semanticConfidence).not.toBe(scored.searchCompleteness);
    expect(scored.pathSemanticCoverage.nodeCount).toBe(
      candidate.nodeIds.length,
    );
    expect(Number.isFinite(scored.heuristicScore)).toBe(true);
    expect(scored.heuristicScore).toBe(16);
    expect(scored.pointCost).toBe(1);
  });
});
