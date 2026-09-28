import { describe, expect, it } from "vitest";
import {
  compareUpgradeCandidates,
  upgradeComparisonResultSchema,
  RANKABLE_METRIC_IDS,
  type CandidateMeasurement,
  type MeasuredMetric,
  type UpgradeCandidateInput,
} from "./index.js";

const provenance = {
  pobVersion: "0.23.1",
  pobTreeKey: "0_5",
  buddyTreeVersion: "0.5.5",
  adapterVersion: 2,
  protocolVersion: 2,
  buildChecksum: "sha256:build",
  runtimeFingerprint: "sha256:runtime",
  skillEffectId: "FireballPlayer",
};

function points(
  id: string,
  before: number,
  absoluteDelta: number,
): MeasuredMetric {
  return {
    id,
    before,
    after: before + absoluteDelta,
    absoluteDelta,
    percentDelta: null,
  };
}

function metric(
  id: string,
  before: number,
  percentDelta: number | null,
): MeasuredMetric {
  const after =
    percentDelta === null ? before : before + (before * percentDelta) / 100;
  return {
    id,
    before,
    after,
    absoluteDelta: after - before,
    percentDelta,
  };
}

function measured(
  metrics: readonly MeasuredMetric[],
  override: Partial<CandidateMeasurement & { ok: true }> = {},
): CandidateMeasurement {
  return {
    ok: true,
    metrics,
    provenance: { ...provenance, ...override.provenance },
  };
}

function candidate(
  id: string,
  price: UpgradeCandidateInput["price"],
  metrics: readonly MeasuredMetric[],
  slot = "helmet",
): UpgradeCandidateInput {
  return {
    id,
    slot,
    label: id,
    rawChecksum: `sha256:${id}`,
    price,
    measurement: measured(metrics),
  };
}

function orderOf(input: Parameters<typeof compareUpgradeCandidates>[0]) {
  const outcome = compareUpgradeCandidates(input);
  expect(outcome.ok).toBe(true);
  if (!outcome.ok) throw new Error(outcome.message);
  return outcome.result;
}

describe("budget comparison", () => {
  it("ranks the cheaper smaller Total DPS gain ahead of the larger gain", () => {
    const result = orderOf({
      selectedMetric: "TotalDPS",
      budget: { amount: 100, currency: "chaos" },
      normalization: null,
      candidates: [
        candidate(
          "A",
          { amount: 40, currency: "chaos", source: "user-entered" },
          [metric("TotalDPS", 10, 8), metric("Life", 100, -3)],
        ),
        candidate(
          "B",
          { amount: 80, currency: "chaos", source: "user-entered" },
          [metric("TotalDPS", 10, 12), metric("Life", 100, 2)],
        ),
      ],
    });
    expect(result.ordering).toEqual(["A", "B"]);
    expect(result.readiness).toBe("ready");
    const first = result.candidates.find((row) => row.id === "A");
    expect(first?.efficiency).toEqual({
      kind: "value",
      perUnit: 0.2,
      perTen: 2,
    });
    expect(first?.price.confidence).toBe("exact-input");
    expect(first?.price.sourceLabel).toBe("User-entered price");
    expect(first?.selectedMetricDelta?.percentDelta).toBe(8);
    const life = result.candidates.find((row) => row.id === "A")?.measurement;
    expect(
      life &&
        life.ok &&
        life.metrics.find((row) => row.id === "Life")?.percentDelta,
    ).toBe(-3);
    expect("score" in result).toBe(false);
  });

  it("changes order when the selected metric changes", () => {
    const candidates = [
      candidate(
        "A",
        { amount: 40, currency: "chaos", source: "user-entered" },
        [metric("TotalDPS", 10, 10), metric("Life", 100, -10)],
      ),
      candidate(
        "B",
        { amount: 40, currency: "chaos", source: "user-entered" },
        [metric("TotalDPS", 10, 7), metric("Life", 100, 5)],
      ),
    ];
    const dps = orderOf({
      selectedMetric: "TotalDPS",
      budget: { amount: 100, currency: "chaos" },
      normalization: null,
      candidates,
    });
    const life = orderOf({
      selectedMetric: "Life",
      budget: { amount: 100, currency: "chaos" },
      normalization: null,
      candidates,
    });
    expect(dps.ordering).toEqual(["A", "B"]);
    expect(life.ordering).toEqual(["B", "A"]);
    expect(
      life.candidates.find((row) => row.id === "A")?.efficiency,
    ).toMatchObject({
      kind: "value",
      perUnit: -0.25,
    });
  });

  it("treats the budget boundary as included and keeps over-budget items visible", () => {
    const result = orderOf({
      selectedMetric: "Life",
      budget: { amount: 50, currency: "chaos" },
      normalization: null,
      candidates: [
        candidate(
          "edge",
          { amount: 50, currency: "chaos", source: "fixture" },
          [metric("Life", 100, 4)],
        ),
        candidate(
          "over",
          { amount: 51, currency: "chaos", source: "fixture" },
          [metric("Life", 100, 20)],
        ),
      ],
    });
    expect(
      result.candidates.find((row) => row.id === "edge")?.budgetStatus,
    ).toBe("within-budget");
    expect(
      result.candidates.find((row) => row.id === "over")?.budgetStatus,
    ).toBe("over-budget");
    expect(result.ordering).toEqual(["edge", "over"]);
    expect(
      result.candidates.find((row) => row.id === "edge")?.price.sourceLabel,
    ).toBe("Fixture price");
  });

  it("does not treat a missing price, a zero price, or a missing percent as zero cost", () => {
    const result = orderOf({
      selectedMetric: "TotalDPS",
      budget: { amount: 100, currency: "chaos" },
      normalization: null,
      candidates: [
        candidate(
          "priced",
          { amount: 10, currency: "chaos", source: "user-entered" },
          [metric("TotalDPS", 10, 5)],
        ),
        candidate("missing-price", null, [metric("TotalDPS", 10, 50)]),
        candidate(
          "zero",
          { amount: 0, currency: "chaos", source: "user-entered" },
          [metric("TotalDPS", 10, 50)],
        ),
        candidate(
          "no-percent",
          { amount: 10, currency: "chaos", source: "user-entered" },
          [metric("TotalDPS", 0, null)],
        ),
      ],
    });
    expect(result.ordering[0]).toBe("priced");
    expect(result.readiness).toBe("partial");
    for (const id of ["missing-price", "zero", "no-percent"]) {
      const row = result.candidates.find((candidate) => candidate.id === id);
      expect(row?.rankability).toBe("not-rankable");
      expect(row?.efficiency).toEqual({ kind: "not-applicable" });
    }
    expect(
      result.candidates.find((row) => row.id === "missing-price")?.budgetStatus,
    ).toBe("price-unavailable");
    expect(
      result.candidates.find((row) => row.id === "zero")?.budgetStatus,
    ).toBe("within-budget");
  });

  it("rejects a negative price without dropping the other candidate", () => {
    const result = orderOf({
      selectedMetric: "Life",
      budget: { amount: 100, currency: "chaos" },
      normalization: null,
      candidates: [
        candidate(
          "ok",
          { amount: 10, currency: "chaos", source: "user-entered" },
          [metric("Life", 100, 1)],
        ),
        candidate(
          "bad",
          { amount: -5, currency: "chaos", source: "user-entered" },
          [metric("Life", 100, 9)],
        ),
      ],
    });
    expect(result.candidates.find((row) => row.id === "bad")?.rankability).toBe(
      "not-rankable",
    );
    expect(
      result.candidates.find((row) => row.id === "bad")?.warnings,
    ).toContain("Negative price is not accepted.");
    expect(result.ordering[0]).toBe("ok");
  });

  it("keeps a zero delta at zero efficiency and a negative delta negative", () => {
    const result = orderOf({
      selectedMetric: "Armour",
      budget: { amount: 30, currency: "chaos" },
      normalization: null,
      candidates: [
        candidate(
          "flat",
          { amount: 10, currency: "chaos", source: "user-entered" },
          [metric("Armour", 100, 0)],
        ),
        candidate(
          "loss",
          { amount: 10, currency: "chaos", source: "user-entered" },
          [metric("Armour", 100, -4)],
        ),
      ],
    });
    expect(
      result.candidates.find((row) => row.id === "flat")?.efficiency,
    ).toEqual({
      kind: "value",
      perUnit: 0,
      perTen: 0,
    });
    expect(
      result.candidates.find((row) => row.id === "loss")?.efficiency,
    ).toMatchObject({
      kind: "value",
      perUnit: -0.4,
    });
    expect(result.ordering).toEqual(["flat", "loss"]);
    expect(result.readiness).toBe("ready");
  });

  it("converts 1 divine into chaos and does not invert the rate", () => {
    const result = orderOf({
      selectedMetric: "TotalEHP",
      budget: { amount: 100, currency: "chaos" },
      normalization: {
        comparisonCurrency: "chaos",
        rates: [{ currency: "divine", chaosPerUnit: 150 }],
        source: "fixture",
        fetchedAt: "2026-09-27T00:00:00.000Z",
        leagueId: "Standard",
      },
      candidates: [
        candidate(
          "chaos",
          { amount: 60, currency: "chaos", source: "user-entered" },
          [metric("TotalEHP", 100, 6)],
        ),
        candidate(
          "divine",
          { amount: 1, currency: "divine", source: "user-entered" },
          [metric("TotalEHP", 100, 15)],
        ),
      ],
    });
    const divine = result.candidates.find((row) => row.id === "divine");
    expect(divine?.price.normalizedAmount).toBe(150);
    expect(divine?.price.conversionRate).toBe(150);
    expect(divine?.price.confidence).toBe("normalized");
    expect(divine?.price.inputAmount).toBe(1);
    expect(divine?.budgetStatus).toBe("over-budget");
    expect(result.comparisonCurrency).toBe("chaos");
    expect(result.economySnapshot?.source).toBe("fixture");
    expect(result.ordering[0]).toBe("chaos");
  });

  it("does not cross-rank when the divine rate is missing", () => {
    const result = orderOf({
      selectedMetric: "TotalDPS",
      budget: { amount: 100, currency: "chaos" },
      normalization: null,
      candidates: [
        candidate(
          "chaos-a",
          { amount: 20, currency: "chaos", source: "user-entered" },
          [metric("TotalDPS", 10, 4)],
        ),
        candidate(
          "chaos-b",
          { amount: 40, currency: "chaos", source: "user-entered" },
          [metric("TotalDPS", 10, 4)],
        ),
        candidate(
          "divine",
          { amount: 1, currency: "divine", source: "user-entered" },
          [metric("TotalDPS", 10, 40)],
        ),
      ],
    });
    expect(result.warnings).toContain(
      "Cross-currency budget comparison is unavailable.",
    );
    expect(result.economyReadiness).toBe("partial");
    expect(result.ordering.slice(0, 2)).toEqual(["chaos-a", "chaos-b"]);
    expect(
      result.candidates.find((row) => row.id === "divine")?.rankability,
    ).toBe("not-rankable");
    expect(result.readiness).toBe("partial");
  });

  it("breaks ties by higher gain, then candidate id", () => {
    const result = orderOf({
      selectedMetric: "Evasion",
      budget: { amount: 100, currency: "chaos" },
      normalization: null,
      candidates: [
        candidate(
          "b",
          { amount: 20, currency: "chaos", source: "user-entered" },
          [metric("Evasion", 100, 4)],
        ),
        candidate(
          "a",
          { amount: 10, currency: "chaos", source: "user-entered" },
          [metric("Evasion", 100, 2)],
        ),
        candidate(
          "c",
          { amount: 10, currency: "chaos", source: "user-entered" },
          [metric("Evasion", 100, 4)],
        ),
        candidate(
          "zeta",
          { amount: 10, currency: "chaos", source: "user-entered" },
          [metric("Evasion", 100, 1)],
        ),
        candidate(
          "alpha",
          { amount: 10, currency: "chaos", source: "user-entered" },
          [metric("Evasion", 100, 1)],
        ),
      ],
    });
    expect(result.ordering).toEqual(["c", "b", "a", "alpha", "zeta"]);
  });

  it("leaves a calculator failure and a different baseline out of the ranking", () => {
    const failed = orderOf({
      selectedMetric: "Life",
      budget: { amount: 100, currency: "chaos" },
      normalization: null,
      candidates: [
        candidate(
          "ok",
          { amount: 10, currency: "chaos", source: "user-entered" },
          [metric("Life", 100, 2)],
        ),
        {
          id: "failed",
          slot: "helmet",
          label: "failed",
          rawChecksum: "sha256:failed",
          price: { amount: 10, currency: "chaos", source: "user-entered" },
          measurement: {
            ok: false,
            code: "item-invalid",
            message: "The item text was not accepted.",
          },
        },
      ],
    });
    expect(
      failed.candidates.find((row) => row.id === "failed")?.rankability,
    ).toBe("not-rankable");
    expect(failed.readiness).toBe("partial");

    const mismatched = candidate(
      "other",
      { amount: 10, currency: "chaos", source: "user-entered" },
      [metric("Life", 100, 9)],
    );
    if (mismatched.measurement.ok) {
      mismatched.measurement = {
        ok: true,
        metrics: mismatched.measurement.metrics,
        provenance: {
          ...mismatched.measurement.provenance,
          buildChecksum: "sha256:other",
        },
      };
    }
    const invalidBaseline = orderOf({
      selectedMetric: "Life",
      budget: { amount: 100, currency: "chaos" },
      normalization: null,
      candidates: [
        candidate(
          "same",
          { amount: 10, currency: "chaos", source: "user-entered" },
          [metric("Life", 100, 2)],
        ),
        mismatched,
      ],
    });
    expect(invalidBaseline.readiness).toBe("insufficient");
    expect(invalidBaseline.warnings).toContain("comparison-invalid");
    expect(
      invalidBaseline.candidates.every(
        (row) => row.rankability === "not-rankable",
      ),
    ).toBe(true);
  });

  it("warns that cross-slot replacements are not a combined loadout", () => {
    const result = orderOf({
      selectedMetric: "Life",
      budget: { amount: 100, currency: "chaos" },
      normalization: null,
      candidates: [
        candidate(
          "helm",
          { amount: 10, currency: "chaos", source: "user-entered" },
          [metric("Life", 100, 2)],
        ),
        candidate(
          "boots",
          { amount: 10, currency: "chaos", source: "user-entered" },
          [metric("Life", 100, 1)],
          "boots",
        ),
      ],
    });
    expect(result.warnings).toContain(
      "These are one-at-a-time replacement effects, not combined effects.",
    );
  });

  it("keeps a resistance loss visible without using it to rank", () => {
    const result = orderOf({
      selectedMetric: "Life",
      budget: { amount: 100, currency: "chaos" },
      normalization: null,
      candidates: [
        candidate(
          "A",
          { amount: 40, currency: "chaos", source: "user-entered" },
          [metric("Life", 100, 20), points("FireResist", 75, -30)],
        ),
        candidate(
          "B",
          { amount: 40, currency: "chaos", source: "user-entered" },
          [metric("Life", 100, 10), points("FireResist", 75, 0)],
        ),
      ],
    });
    expect(result.ordering).toEqual(["A", "B"]);
    expect(result.summaryState).toBe("positive-within-budget");
    expect(result.winnerCandidateId).toBe("A");
    const fire = result.candidates
      .find((row) => row.id === "A")
      ?.displayMetricDeltas.find((row) => row.metricId === "FireResist");
    expect(fire?.absoluteDelta).toBe(-30);
    expect(fire?.unit).toBe("percent-points");
    expect(fire?.isRankingMetric).toBe(false);
    expect(fire?.direction).toBe("decreased");
    expect(
      result.candidates
        .find((row) => row.id === "B")
        ?.displayMetricDeltas.some((row) => row.metricId === "FireResist"),
    ).toBe(false);
    expect(RANKABLE_METRIC_IDS).not.toContain("FireResist");
  });

  it("shows chance and resource changes without changing Life order", () => {
    const result = orderOf({
      selectedMetric: "Life",
      budget: { amount: 100, currency: "chaos" },
      normalization: null,
      candidates: [
        candidate(
          "A",
          { amount: 40, currency: "chaos", source: "user-entered" },
          [
            metric("Life", 100, 8),
            points("CritChance", 7, -2),
            points("Mana", 174, -2),
            points("Spirit", 100, 10),
            points("DeflectChance", 20, -5),
          ],
        ),
        candidate(
          "B",
          { amount: 80, currency: "chaos", source: "user-entered" },
          [metric("Life", 100, 12)],
        ),
      ],
    });
    expect(result.ordering).toEqual(["A", "B"]);
    const shown = result.candidates
      .find((row) => row.id === "A")
      ?.displayMetricDeltas.map((row) => row.metricId);
    expect(shown).toEqual(
      expect.arrayContaining(["CritChance", "Mana", "Spirit", "DeflectChance"]),
    );
    expect(result.winnerCandidateId).toBe("A");
  });

  it("does not name a winner when the only positive candidate is over budget", () => {
    const result = orderOf({
      selectedMetric: "TotalDPS",
      budget: { amount: 100, currency: "chaos" },
      normalization: null,
      candidates: [
        candidate(
          "A",
          { amount: 200, currency: "chaos", source: "user-entered" },
          [metric("TotalDPS", 10, 15)],
        ),
        candidate(
          "B",
          { amount: 50, currency: "chaos", source: "user-entered" },
          [metric("TotalDPS", 10, -2)],
        ),
      ],
    });
    expect(result.ordering[0]).toBe("B");
    expect(result.summaryState).toBe("no-positive-within-budget");
    expect(result.winnerCandidateId).toBeNull();
    expect(result.summaryLines[0]).toBe(
      "No supplied candidate provides a positive Total-DPS improvement within this budget.",
    );
    expect(result.summaryLines).toContain(
      "A improves Total DPS but is over budget.",
    );
    expect(result.summaryLines.join(" ")).not.toContain("highest");
  });

  it("does not call a zero Life change the highest gain", () => {
    const result = orderOf({
      selectedMetric: "Life",
      budget: { amount: 100, currency: "chaos" },
      normalization: null,
      candidates: [
        candidate(
          "A",
          { amount: 40, currency: "chaos", source: "user-entered" },
          [metric("Life", 100, 0)],
        ),
      ],
    });
    expect(result.summaryState).toBe("no-positive-within-budget");
    expect(result.winnerCandidateId).toBeNull();
    expect(result.summaryLines.join(" ")).not.toContain("highest");
    expect(
      result.candidates[0]?.displayMetricDeltas.some(
        (row) => row.metricId === "Life" && row.direction === "unchanged",
      ),
    ).toBe(true);
  });

  it("does not rank candidates that lack a price, a metric, or a measurement", () => {
    const failed: UpgradeCandidateInput = {
      ...candidate(
        "c",
        { amount: 10, currency: "chaos", source: "user-entered" },
        [metric("Life", 100, 5)],
      ),
      measurement: {
        ok: false,
        code: "calculation-failed",
        message: "unavailable",
      },
    };
    const result = orderOf({
      selectedMetric: "Life",
      budget: { amount: 100, currency: "chaos" },
      normalization: null,
      candidates: [
        candidate("a", null, [metric("Life", 100, 5)]),
        candidate(
          "b",
          { amount: 10, currency: "chaos", source: "user-entered" },
          [metric("Armour", 100, 5)],
        ),
        failed,
      ],
    });
    expect(result.summaryState).toBe("no-rankable-candidates");
    expect(result.winnerCandidateId).toBeNull();
    expect(result.rankedCandidateCount).toBe(0);
    expect(result.summaryLines[0]).toBe(
      "These candidates cannot be ranked for the selected metric with the available measurements and prices.",
    );
    expect(
      result.candidates.find((row) => row.id === "c")?.displayMetricDeltas,
    ).toEqual([]);
  });

  it("limits a partial headline to the candidates that could be ranked", () => {
    const result = orderOf({
      selectedMetric: "TotalEHP",
      budget: { amount: 100, currency: "chaos" },
      normalization: null,
      candidates: [
        candidate(
          "A",
          { amount: 40, currency: "chaos", source: "user-entered" },
          [metric("TotalEHP", 100, 8)],
        ),
        candidate(
          "B",
          { amount: 80, currency: "chaos", source: "user-entered" },
          [metric("TotalEHP", 100, 4)],
        ),
        candidate("C", null, [metric("TotalEHP", 100, 20)]),
      ],
    });
    expect(result.readiness).toBe("partial");
    expect(result.rankedCandidateCount).toBe(2);
    expect(result.summaryState).toBe("positive-within-budget");
    expect(result.winnerCandidateId).toBe("A");
    expect(result.summaryLines).toContain(
      "2 of 3 supplied candidates could be ranked for Total EHP efficiency.",
    );
    expect(result.summaryLines.join(" ")).not.toContain("C has the highest");
  });

  it("keeps the cheaper Total DPS candidate first after adding non-rankable losses", () => {
    const result = orderOf({
      selectedMetric: "TotalDPS",
      budget: { amount: 100, currency: "chaos" },
      normalization: null,
      candidates: [
        candidate(
          "A",
          { amount: 40, currency: "chaos", source: "user-entered" },
          [
            metric("TotalDPS", 10, 8),
            points("FireResist", 75, -30),
            points("Mana", 174, -20),
          ],
        ),
        candidate(
          "B",
          { amount: 80, currency: "chaos", source: "user-entered" },
          [
            metric("TotalDPS", 10, 12),
            points("FireResist", 75, 10),
            points("Mana", 174, 20),
          ],
        ),
      ],
    });
    expect(result.ordering).toEqual(["A", "B"]);
    expect(result.upgradeEngineVersion).toBe(2);
    expect(upgradeComparisonResultSchema.safeParse(result).success).toBe(true);
    expect(
      upgradeComparisonResultSchema.safeParse({
        ...result,
        upgradeEngineVersion: 1,
        candidates: result.candidates.map((row) => ({
          ...row,
          displayMetricDeltas: undefined,
        })),
      }).success,
    ).toBe(false);
  });

  it("keeps a tiny non-zero delta that would round to zero on display", () => {
    const result = orderOf({
      selectedMetric: "Life",
      budget: { amount: 100, currency: "chaos" },
      normalization: null,
      candidates: [
        candidate(
          "A",
          { amount: 40, currency: "chaos", source: "user-entered" },
          [metric("Life", 100, 5), points("Mana", 100, 0.00001)],
        ),
        candidate(
          "B",
          { amount: 80, currency: "chaos", source: "user-entered" },
          [metric("Life", 100, 1)],
        ),
      ],
    });
    expect(
      result.candidates
        .find((row) => row.id === "A")
        ?.displayMetricDeltas.some((row) => row.metricId === "Mana"),
    ).toBe(true);
  });

  it("rejects a negative budget and an unsupported ranking metric", () => {
    expect(
      compareUpgradeCandidates({
        selectedMetric: "FireResist",
        budget: { amount: 10, currency: "chaos" },
        normalization: null,
        candidates: [],
      }).ok,
    ).toBe(false);
    expect(
      compareUpgradeCandidates({
        selectedMetric: "Life",
        budget: { amount: -1, currency: "chaos" },
        normalization: null,
        candidates: [
          candidate(
            "a",
            { amount: 1, currency: "chaos", source: "user-entered" },
            [metric("Life", 100, 1)],
          ),
        ],
      }).ok,
    ).toBe(false);
  });
});
