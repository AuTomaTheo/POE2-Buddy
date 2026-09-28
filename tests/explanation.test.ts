import { developmentPassiveTreeSnapshotDirectory } from "@poe2-helper/data-sources";
import { describe, expect, it } from "vitest";
import { runPassiveAnalysis } from "../apps/web/src/server/analyze-passive-build";
import { attachAnalysisExplanation } from "../apps/web/src/server/explanation-from-analysis";

const snapshotDirectory = developmentPassiveTreeSnapshotDirectory;

function witch() {
  const result = runPassiveAnalysis({
    fixtureId: "witch-offensive.json",
    fixtureJson: "",
    objective: "offensive",
    pointBudget: "5",
    snapshotDirectory,
  });
  if (!result.ok) throw new Error("expected the witch fixture to analyze");
  return result;
}

describe("analysis explanation", () => {
  it("adds a deterministic explanation without changing the witch ranking", () => {
    const result = witch();
    const explained = attachAnalysisExplanation(result, "deterministic");
    expect(explained.explanation.status).toBe("ready");
    if (explained.explanation.status !== "ready") return;
    const text = explained.explanation.document.sections
      .flatMap((section) => section.paragraphs)
      .join("\n");
    expect(explained.explanation.document.provider.providerId).toBe(
      "deterministic-fallback",
    );
    expect(explained.explanation.document.provider.providerKind).toBe(
      "local-template",
    );
    expect(text).toContain("heuristic");
    expect(text).toContain("unresolved");
    expect(text).not.toContain("DPS");
    expect(explained.recommendation.rankedCompleteCandidates[0]).toMatchObject({
      nodeIds: [1755, 41965],
      heuristicScore: 32,
      pointCost: 2,
    });
    expect(
      explained.recommendation.rankedCompleteCandidates.map(
        (candidate) => candidate.heuristicScore,
      ),
    ).toEqual(
      result.recommendation.rankedCompleteCandidates.map(
        (candidate) => candidate.heuristicScore,
      ),
    );
  });

  it("keeps the analysis when explanation is disabled", () => {
    const explained = attachAnalysisExplanation(witch(), "disabled");
    expect(explained.explanation.status).toBe("disabled");
    expect(explained.recommendation.rankedCompleteCandidates[0]).toMatchObject({
      nodeIds: [1755, 41965],
      heuristicScore: 32,
    });
  });

  it("keeps the analysis when explanation rendering throws", () => {
    const explained = attachAnalysisExplanation(
      witch(),
      "deterministic",
      () => {
        throw new Error("renderer failed");
      },
    );
    expect(explained.explanation).toEqual({
      status: "error",
      message:
        "The explanation could not be rendered. The analysis result is unchanged.",
    });
    expect(explained.recommendation.pointBudget).toBe(5);
    expect(
      explained.recommendation.rankedCompleteCandidates[0]?.nodeIds,
    ).toEqual([1755, 41965]);
  });
});
