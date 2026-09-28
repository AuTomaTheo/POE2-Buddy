import { describe, expect, it } from "vitest";
import type { EconomySnapshot } from "@poe2-helper/domain";
import type { ItemDeltaResult } from "@poe2-helper/pob2-calculator";
import {
  chaosPerDivine,
  compareSuppliedUpgrades,
  type UpgradeCandidateRequest,
} from "../apps/web/src/server/compare-upgrades";

const provenance = {
  pobVersion: "0.23.1",
  pobTreeKey: "0_5",
  buddyTreeVersion: "0.5.5",
  buddyTreeCommit: null,
  buddyTreeChecksum: null,
  adapterVersion: 2,
  protocolVersion: 2,
  buildChecksum: "sha256:" + "a".repeat(64),
  runtimeChecksum: "sha256:" + "b".repeat(64),
  runtimeFingerprint: "sha256:" + "c".repeat(64),
};

function measured(metrics: ItemDeltaResult["metrics"]): {
  ok: true;
  result: ItemDeltaResult;
} {
  return {
    ok: true,
    result: {
      readiness: "ready",
      slot: "helmet",
      baselineItem: {
        slot: "helmet",
        pobSlot: "Helmet",
        id: 1,
        rawChecksum: null,
        label: null,
      },
      candidateItem: {
        slot: "helmet",
        pobSlot: "Helmet",
        id: 2,
        rawChecksum: "sha256:" + "d".repeat(64),
        label: null,
      },
      skill: {
        name: "Fireball",
        effectId: "FireballPlayer",
        sourceGem: null,
        skillTypes: [],
        baseFlags: [],
      },
      metrics,
      restoreVerified: true,
      provenance,
      warnings: [],
    },
  };
}

function life(
  before: number,
  percent: number | null,
): ItemDeltaResult["metrics"][number] {
  const after = percent === null ? before : before * (1 + percent / 100);
  return {
    id: "Life",
    label: "Life",
    unit: "number",
    category: "defense",
    sourceField: "Life",
    before,
    after,
    absoluteDelta: after - before,
    percentDelta: percent,
  };
}

function resist(
  id: "FireResist" | "Mana",
  label: string,
  before: number,
  after: number,
): ItemDeltaResult["metrics"][number] {
  return {
    id,
    label,
    unit: id === "FireResist" ? "percent-points" : "number",
    category: id === "FireResist" ? "resistance" : "resource",
    sourceField: id,
    before,
    after,
    absoluteDelta: after - before,
    percentDelta: null,
  };
}
function request(
  candidates: UpgradeCandidateRequest[],
  extra: Partial<Parameters<typeof compareSuppliedUpgrades>[0]> = {},
) {
  return compareSuppliedUpgrades(
    {
      pob2Code: "unused",
      selectedMetric: "Life",
      budgetAmount: 100,
      budgetCurrency: "chaos",
      useEconomy: false,
      leagueId: "",
      candidates,
      ...extra,
    },
    extra.useEconomy
      ? undefined
      : { evaluate: async () => measured([life(100, 0)]) },
  );
}

describe("compareSuppliedUpgrades", () => {
  it("ranks only measured priced candidates and keeps the others visible", async () => {
    const calls: string[] = [];
    const view = await compareSuppliedUpgrades(
      {
        pob2Code: "unused",
        selectedMetric: "Life",
        budgetAmount: 100,
        budgetCurrency: "chaos",
        useEconomy: false,
        leagueId: "",
        candidates: [
          item("a", "Greater", 40, "chaos"),
          item("b", "Larger", 80, "chaos"),
          item("c", "Broken", 10, "chaos"),
          item("d", "Unmeasured", 10, "chaos"),
          item("e", "Unpriced", null, null),
        ],
      },
      {
        evaluate: (candidate) => {
          calls.push(candidate.label ?? "");
          if (candidate.label === "Broken") {
            return Promise.resolve({
              ok: false,
              error: {
                code: "calculation-failed",
                message:
                  "Character-aware calculation unavailable for this candidate.",
              },
            });
          }
          if (candidate.label === "Unmeasured")
            return Promise.resolve(measured([life(100, null)]));
          if (candidate.label === "Greater")
            return Promise.resolve(measured([life(100, 8)]));
          return Promise.resolve(measured([life(100, 12)]));
        },
      },
    );
    expect(calls).toEqual([
      "Greater",
      "Larger",
      "Broken",
      "Unmeasured",
      "Unpriced",
    ]);
    expect(view.status).toBe("partial");
    expect(view.rows.map((row) => row.id)).toEqual(["a", "b", "e", "c", "d"]);
    expect(view.rows[0]?.efficiency).toBe("2% per 10 chaos");
    expect(view.rows[1]?.efficiency).toBe("1.5% per 10 chaos");
    expect(view.rows[2]?.efficiency).toBe("not applicable");
    expect(view.rows.find((row) => row.id === "e")?.price).toBe("No price");
    expect(view.headline).toContain("Greater");
    expect(view.headline).toContain("Life");
    expect(view.message).toContain("one item");
    expect(JSON.stringify(view)).not.toContain('"score"');
  });

  it("labels a same-currency user price as user-entered", async () => {
    const view = await compareSuppliedUpgrades(
      {
        pob2Code: "unused",
        selectedMetric: "Life",
        budgetAmount: 100,
        budgetCurrency: "chaos",
        useEconomy: false,
        leagueId: "",
        candidates: [item("a", "A", 40, "chaos"), item("b", "B", 80, "chaos")],
      },
      {
        evaluate: (candidate) =>
          Promise.resolve(
            measured([life(100, candidate.label === "A" ? 8 : 12)]),
          ),
      },
    );
    expect(view.rows[0]?.priceSource).toBe("User-entered price");
    expect(view.economyNote).toBeNull();
  });

  it("converts a user-entered divine price with an explicit chaos-per-divine rate", async () => {
    let loads = 0;
    const view = await compareSuppliedUpgrades(
      {
        pob2Code: "unused",
        selectedMetric: "Life",
        budgetAmount: 100,
        budgetCurrency: "chaos",
        useEconomy: true,
        leagueId: "Standard",
        candidates: [
          item("a", "Chaos item", 40, "chaos"),
          item("b", "Divine item", 1, "divine"),
        ],
      },
      {
        evaluate: (candidate) =>
          Promise.resolve(
            measured([life(100, candidate.label === "Chaos item" ? 8 : 20)]),
          ),
        loadDivineRate: () => {
          loads += 1;
          return Promise.resolve({
            chaosPerDivine: 150,
            fetchedAt: "2026-09-27T00:00:00.000Z",
            leagueId: "Standard",
            source: "fixture",
          });
        },
      },
    );
    expect(loads).toBe(1);
    expect(view.rows.map((row) => row.id)).toEqual(["a", "b"]);
    expect(view.rows[1]?.price).toBe("1 divine (150 chaos)");
    expect(view.rows[1]?.budgetStatus).toBe("Over budget");
    expect(view.rows[1]?.priceSource).toBe("User-entered price");
    expect(view.economyNote).toContain("1 divine = 150 chaos");
  });

  it("does not fetch a rate when every price already shares the budget currency", async () => {
    let loads = 0;
    await compareSuppliedUpgrades(
      {
        pob2Code: "unused",
        selectedMetric: "Life",
        budgetAmount: 100,
        budgetCurrency: "chaos",
        useEconomy: true,
        leagueId: "Standard",
        candidates: [item("a", "A", 40, "chaos"), item("b", "B", 80, "chaos")],
      },
      {
        evaluate: () => Promise.resolve(measured([life(100, 8)])),
        loadDivineRate: () => {
          loads += 1;
          return Promise.resolve(null);
        },
      },
    );
    expect(loads).toBe(0);
  });

  it("keeps deltas when currency conversion is unavailable", async () => {
    const view = await compareSuppliedUpgrades(
      {
        pob2Code: "unused",
        selectedMetric: "Life",
        budgetAmount: 100,
        budgetCurrency: "chaos",
        useEconomy: true,
        leagueId: "Standard",
        candidates: [
          item("a", "Chaos item", 40, "chaos"),
          item("b", "Divine item", 1, "divine"),
        ],
      },
      {
        evaluate: () => Promise.resolve(measured([life(100, 8)])),
        loadDivineRate: () => Promise.resolve(null),
      },
    );
    expect(view.warnings).toContain(
      "Cross-currency budget comparison is unavailable.",
    );
    expect(view.rows.find((row) => row.id === "b")?.gain).toBe("+8%");
    expect(view.rows.find((row) => row.id === "b")?.efficiency).toBe(
      "not applicable",
    );
    expect(view.economyNote).toBeNull();
  });

  it("reads chaos per divine from a chaos-referenced snapshot and inverts a divine-referenced chaos line", () => {
    expect(
      chaosPerDivine(
        snapshot("chaos", [
          { id: "divine", name: "Divine Orb", primaryValue: 150 },
        ]),
      ),
    ).toBe(150);
    expect(
      chaosPerDivine(
        snapshot("divine", [
          { id: "divine", name: "Divine Orb", primaryValue: 1 },
          { id: "chaos", name: "Chaos Orb", primaryValue: 0.01 },
        ]),
      ),
    ).toBe(100);
    expect(
      chaosPerDivine(
        snapshot("exalted", [
          { id: "divine", name: "Divine Orb", primaryValue: 10 },
        ]),
      ),
    ).toBeNull();
  });

  it("rejects a request with fewer than two items before measuring", async () => {
    const view = await request([item("a", "A", 40, "chaos")]);
    expect(view.status).toBe("error");
    expect(view.message).toContain("two");
  });

  it("prints a resistance loss in percentage points and does not call it a ranking input", async () => {
    const view = await compareSuppliedUpgrades(
      {
        pob2Code: "unused",
        selectedMetric: "Life",
        budgetAmount: 100,
        budgetCurrency: "chaos",
        useEconomy: false,
        leagueId: "",
        candidates: [item("a", "A", 40, "chaos"), item("b", "B", 80, "chaos")],
      },
      {
        evaluate: (candidate) =>
          Promise.resolve(
            measured(
              candidate.label === "A"
                ? [
                    life(382, 21.465968586387437),
                    resist("FireResist", "Fire Resistance", 75, 45),
                  ]
                : [life(382, 4), resist("Mana", "Mana", 174, 172)],
            ),
          ),
      },
    );
    expect(view.rows[0]?.otherDeltas).toContain(
      "Fire Resistance decreased: 75% → 45% (-30 percentage points)",
    );
    expect(view.rows[0]?.otherDeltas).not.toContain(
      "Fire Resistance efficiency",
    );
    expect(view.headline).toContain("A has the highest measured Life gain");
    expect(view.rows[1]?.otherDeltas).toContain(
      "Mana decreased: 174 → 172 (-2)",
    );
  });
});

function item(
  id: string,
  label: string,
  amount: number | null,
  currency: string | null,
): UpgradeCandidateRequest {
  return {
    id,
    slot: "helmet",
    rawItemText: "Rarity: RARE\nTest\n",
    label,
    priceAmount: amount,
    priceCurrency: currency,
  };
}

function snapshot(
  referenceCurrency: string,
  lines: { id: string; name: string; primaryValue: number }[],
): EconomySnapshot {
  return {
    source: "https://poe.ninja",
    endpoint: "exchange",
    leagueId: "Standard",
    category: "Currency",
    referenceCurrency,
    fetchedAt: "2026-09-27T00:00:00.000Z",
    lines: lines.map((line) => ({
      ...line,
      category: "Currency",
      listingCount: null,
      volumePrimaryValue: null,
      kind: "exchange",
    })),
  };
}
