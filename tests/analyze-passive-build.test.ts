import { developmentPassiveTreeSnapshotDirectory } from "@poe2-helper/data-sources";
import { describe, expect, it } from "vitest";
import {
  readBundledFixture,
  runPassiveAnalysis,
} from "../apps/web/src/server/analyze-passive-build";

const snapshotDirectory = developmentPassiveTreeSnapshotDirectory;

function analyze(overrides: Partial<Parameters<typeof runPassiveAnalysis>[0]>) {
  return runPassiveAnalysis({
    fixtureId: "witch-offensive.json",
    fixtureJson: "",
    objective: "offensive",
    pointBudget: "5",
    snapshotDirectory,
    ...overrides,
  });
}

describe("passive analysis screen request", () => {
  it("rejects a bad objective, budget, fixture, and import before ranking", () => {
    expect(analyze({ objective: "speed" })).toEqual({
      ok: false,
      message: "Choose an offensive, defensive, or balanced objective.",
    });
    expect(analyze({ pointBudget: "-1" }).ok).toBe(false);
    expect(analyze({ pointBudget: "1.5" })).toMatchObject({
      ok: false,
      message: "Point budget must be a whole number, 0 or greater.",
    });
    expect(
      analyze({ fixtureId: "../secret.json", fixtureJson: "" }),
    ).toMatchObject({
      ok: false,
      message: "Choose a known fixture or paste fixture JSON.",
    });
    expect(analyze({ fixtureJson: "{" })).toMatchObject({
      ok: false,
      message: "The fixture is not valid JSON.",
    });
    expect(analyze({ fixtureJson: '{"goals":{}}' }).ok).toBe(false);
  });

  it("scores the Witch fixture with the form objective and budget", () => {
    const result = analyze({});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.characterName).toBe("Fixture Witch");
    expect(result.recommendation.profileId).toBe("offensive");
    expect(result.recommendation.profileVersion).toBe(1);
    expect(result.recommendation.pointBudget).toBe(5);
    expect(result.recommendation.k).toBe(5);
    expect(result.recommendation.dataVersion.version).toBe("0.5.5");
    expect(result.recommendation.selectionClaim).toBe(
      "not-definitive-incomplete-valuation",
    );
    expect(result.recommendation.definitive).toBe(false);
    expect(result.recommendation.rankedCompleteCandidates[0]).toMatchObject({
      nodeIds: [1755, 41965],
      pointCost: 2,
      heuristicScore: 32,
      fullValueUnknown: false,
    });
    const first = result.nodes.find((node) => node.id === 1755);
    const second = result.nodes.find((node) => node.id === 41965);
    expect(first?.name.trim().length).toBeGreaterThan(0);
    expect(second?.name.trim().length).toBeGreaterThan(0);
    expect(first?.x).not.toBeNull();
    expect(result.allocatedNodeIds).toEqual([54447, 4739, 18845]);
    expect(result.entryNodeIds["1755,41965"]).toBe(18845);
    expect(result.recommendation.incompleteCandidates.length).toBeGreaterThan(
      0,
    );
    expect(
      result.recommendation.rankedCompleteCandidates.some(
        (candidate) => candidate.fullValueUnknown,
      ),
    ).toBe(false);
  });

  it("keeps the Warrior defensive result free of fully valued paths", () => {
    const result = analyze({
      fixtureId: "warrior-defensive.json",
      objective: "defensive",
      pointBudget: "3",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recommendation.selectionClaim).toBe("no-complete-candidate");
    expect(result.recommendation.rankedCompleteCandidates).toEqual([]);
    expect(result.recommendation.incompleteCandidates.length).toBeGreaterThan(
      0,
    );
    expect(
      result.recommendation.incompleteCandidates[0]?.fullValueUnknown,
    ).toBe(true);
  });

  it("uses pasted fixture JSON and reports a budget above the search limit", () => {
    const pasted = analyze({
      fixtureId: "warrior-defensive.json",
      fixtureJson: readBundledFixture("witch-offensive.json"),
      objective: "offensive",
      pointBudget: "5",
    });
    expect(pasted.ok).toBe(true);
    if (!pasted.ok) return;
    expect(pasted.characterName).toBe("Fixture Witch");

    const limited = analyze({ pointBudget: "6" });
    expect(limited.ok).toBe(false);
    if (limited.ok) return;
    expect(limited.message).toMatch(/exceeds the path search limit/);
  });
});
