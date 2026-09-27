import { describe, expect, it } from "vitest";
import {
  calculateBaseline,
  calculatorError,
  checkCompatibility,
  claimedPointCostMatches,
  computeMetricDeltas,
  evaluateItemReplacement,
  evaluatePassiveCandidate,
  formatAbsoluteDelta,
  formatPercentDelta,
  isCalculatorErrorCode,
  parseWorkerResponse,
  type CalculatorTransport,
  type SkillIdentity,
} from "./index.js";

const skill: SkillIdentity = {
  name: "Fireball",
  effectId: "FireballPlayer",
  sourceGem: "Fireball",
  skillTypes: ["Spell"],
  baseFlags: ["spell"],
};

const baseInput = {
  xml: "<PathOfBuilding></PathOfBuilding>",
  buildChecksum: "sha256:build",
  pobTreeKey: "0_5",
  gggVersion: "0.5.5",
  pobVersion: "0.23.1",
  buddyTreeCommit: "bd87e6512c92b868542eddfb1ba4ea8b6dc2da36",
  buddyTreeChecksum:
    "sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642",
  runtimeChecksum: "sha256:runtime",
  runtimeFingerprint: "sha256:" + "a".repeat(64),
  candidate: {
    nodeIds: [4739],
    allocationMode: "shared" as const,
    verifiedPointCost: 1,
  },
};

function transport(
  response: unknown,
): CalculatorTransport & { discarded: boolean } {
  return {
    discarded: false,
    runtimeFingerprint: "sha256:" + "a".repeat(64),
    request: () => Promise.resolve(response),
    discard() {
      this.discarded = true;
    },
  };
}

function workerOk(
  before: Record<string, number>,
  after: Record<string, number> = before,
  restore: Record<string, number> = before,
) {
  return {
    ok: true,
    requestId: "req-1",
    protocolVersion: 2 as const,
    pobVersion: "0.23.1",
    treeKey: "0_5",
    baseline: { metrics: before, skill },
    candidate: {
      metrics: after,
      skill,
      allocatedNodeIds: [4739],
      allocationMode: "shared",
    },
    restoreMetrics: restore,
    weaponSetNodes: [{ id: 1755, allocMode: 1 }],
  };
}

describe("compatibility", () => {
  it("accepts the pinned 0_5 / 0.5.5 / 0.23.1 triple only", () => {
    expect(
      checkCompatibility({
        pobTreeKey: "0_5",
        gggVersion: "0.5.5",
        pobVersion: "0.23.1",
      }).ok,
    ).toBe(true);
    expect(
      checkCompatibility({
        pobTreeKey: "0.5.5",
        gggVersion: "0.5.5",
        pobVersion: "0.23.1",
      }).ok,
    ).toBe(false);
    expect(
      checkCompatibility({
        pobTreeKey: "0_5",
        gggVersion: "0.5.6",
        pobVersion: "0.23.1",
      }).ok,
    ).toBe(false);
  });
});

describe("delta math", () => {
  it("emits a percent only for an approved metric with a positive baseline", () => {
    const computed = computeMetricDeltas(
      {
        TotalDPS: 4.458333333,
        FireResist: -50,
        EnergyShield: 0,
        CritChance: 7,
      },
      {
        TotalDPS: 4.904166667,
        FireResist: -40,
        EnergyShield: 10,
        CritChance: 7,
      },
    );
    const dps = computed.metrics.find((metric) => metric.id === "TotalDPS");
    const fire = computed.metrics.find((metric) => metric.id === "FireResist");
    const energy = computed.metrics.find(
      (metric) => metric.id === "EnergyShield",
    );
    const crit = computed.metrics.find((metric) => metric.id === "CritChance");
    expect(dps?.percentDelta).toBeCloseTo(10, 5);
    expect(fire?.percentDelta).toBeNull();
    expect(fire?.absoluteDelta).toBe(10);
    expect(formatAbsoluteDelta(fire!)).toBe("+10 percentage points");
    expect(energy?.percentDelta).toBeNull();
    expect(crit?.percentDelta).toBeNull();
    expect(formatAbsoluteDelta(crit!)).toBe("0 percentage points");
    expect(formatPercentDelta(dps!)).toBe("+10.0%");
  });

  it("does not turn a missing metric into zero and keeps catalog order", () => {
    const computed = computeMetricDeltas(
      { Life: 254, Mystery: 3 },
      { Life: 254, Mystery: 4 },
    );
    expect(computed.metrics.map((metric) => metric.id)).toEqual(["Life"]);
    expect(computed.unsupportedFields).toEqual(["Mystery"]);
    expect(formatAbsoluteDelta(computed.metrics[0]!)).toBe("no change");
  });
});

describe("protocol", () => {
  it("rejects a response that adds a field", () => {
    expect(
      parseWorkerResponse({ ...workerOk({ Life: 1 }), extra: true }),
    ).toBeNull();
  });

  it("names every structured error", () => {
    expect(isCalculatorErrorCode("restore-failed")).toBe(true);
    expect(calculatorError("timeout").message).toContain(
      "Character-aware calculation unavailable",
    );
  });
});

describe("evaluatePassiveCandidate", () => {
  it("returns named deltas and keeps the weapon-set nodes that were already allocated", async () => {
    const fake = transport(
      workerOk(
        { Life: 254, TotalDPS: 4.458333333, AverageHit: 5.35 },
        { Life: 254, TotalDPS: 4.904166667, AverageHit: 5.885 },
      ),
    );
    const outcome = await evaluatePassiveCandidate({
      ...baseInput,
      requestId: "req-1",
      transport: fake,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.restoreVerified).toBe(true);
    expect(outcome.result.readiness).toBe("ready");
    expect(outcome.result.weaponSetNodes).toEqual([{ id: 1755, allocMode: 1 }]);
    expect(outcome.result.candidate.verifiedPointCost).toBe(1);
    expect(outcome.result.candidate.actuallyAllocatedNodeIds).toEqual([4739]);
    expect(outcome.result.provenance.runtimeFingerprint).toBe(
      "sha256:" + "a".repeat(64),
    );
    expect(outcome.result.provenance.protocolVersion).toBe(2);
    const dps = outcome.result.metrics.find(
      (metric) => metric.id === "TotalDPS",
    );
    expect(dps?.before).toBe(4.458333333);
    expect(dps?.after).toBe(4.904166667);
    expect(fake.discarded).toBe(false);
  });

  it("marks an unnamed skill partial and warns", async () => {
    const body = workerOk({ Life: 10 }, { Life: 11 });
    body.baseline.skill = { ...skill, name: null };
    const outcome = await evaluatePassiveCandidate({
      ...baseInput,
      requestId: "req-1",
      transport: transport(body),
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.readiness).toBe("partial");
    expect(outcome.result.warnings).toContain("selected skill unresolved");
  });

  it("warns for an unsupported metric and does not score it", async () => {
    const outcome = await evaluatePassiveCandidate({
      ...baseInput,
      requestId: "req-1",
      transport: transport(
        workerOk({ Life: 1, FullDPS: 9 }, { Life: 2, FullDPS: 10 }),
      ),
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.metrics.map((metric) => metric.id)).toEqual(["Life"]);
    expect(outcome.result.warnings).toContain("unsupported metric");
    expect("score" in outcome.result).toBe(false);
  });

  it("fails closed on an unknown mapping before calling the worker", async () => {
    let called = false;
    const outcome = await evaluatePassiveCandidate({
      ...baseInput,
      pobTreeKey: "0_4",
      transport: {
        request: () => {
          called = true;
          return Promise.resolve(null);
        },
        discard() {},
      },
    });
    expect(called).toBe(false);
    expect(outcome).toEqual({
      ok: false,
      error: calculatorError("version-incompatible"),
    });
  });

  it("discards the worker when restore metrics differ", async () => {
    const fake = transport(
      workerOk({ Life: 254 }, { Life: 260 }, { Life: 250 }),
    );
    const outcome = await evaluatePassiveCandidate({
      ...baseInput,
      requestId: "req-1",
      transport: fake,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error.code).toBe("restore-failed");
    expect(fake.discarded).toBe(true);
  });

  it("discards the worker on timeout, crash, and invalid JSON", async () => {
    const timeout = transport(null);
    timeout.request = () => Promise.reject(new Error("timeout"));
    const crashed = transport(null);
    crashed.request = () => Promise.reject(new Error("worker-crashed"));
    const invalid = transport("not-json");
    const mismatch = transport({
      ...workerOk({ Life: 1 }),
      pobVersion: "0.0.1",
    });

    const cases = [
      [timeout, "timeout"],
      [crashed, "worker-crashed"],
      [invalid, "protocol-invalid"],
      [mismatch, "version-incompatible"],
    ] as const;
    for (const [fake, code] of cases) {
      const outcome = await evaluatePassiveCandidate({
        ...baseInput,
        requestId: "req-1",
        transport: fake,
      });
      expect(outcome.ok).toBe(false);
      if (outcome.ok) continue;
      expect(outcome.error.code).toBe(code);
      expect(fake.discarded).toBe(true);
    }
  });

  it("rejects an empty or duplicate candidate without a calculation", async () => {
    const outcome = await evaluatePassiveCandidate({
      ...baseInput,
      candidate: {
        nodeIds: [4739, 4739],
        allocationMode: "shared",
        verifiedPointCost: 1,
      },
      transport: transport(null),
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error.code).toBe("candidate-invalid");
  });
});

describe("calculateBaseline", () => {
  it("returns the baseline and weapon-set allocation without a candidate", async () => {
    const outcome = await calculateBaseline({
      ...baseInput,
      requestId: "base-1",
      transport: transport({
        ok: true,
        requestId: "base-1",
        protocolVersion: 2 as const,
        pobVersion: "0.23.1",
        treeKey: "0_5",
        baseline: { metrics: { Life: 254 }, skill },
        weaponSetNodes: [{ id: 1755, allocMode: 1 }],
      }),
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.weaponSetNodes).toEqual([{ id: 1755, allocMode: 1 }]);
    expect(outcome.result.skill.name).toBe("Fireball");
    expect(
      outcome.result.provenance.runtimeFingerprint.startsWith("sha256:"),
    ).toBe(true);
  });
});

describe("passive allocation identity", () => {
  it("rejects an extra auto-path node and does not return a delta", async () => {
    const body = workerOk({ Life: 1 }, { Life: 2 });
    body.candidate.allocatedNodeIds = [4739, 18845];
    const fake = transport(body);
    const outcome = await evaluatePassiveCandidate({
      ...baseInput,
      requestId: "req-1",
      transport: fake,
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error.code).toBe("candidate-allocation-mismatch");
    expect(outcome.allocation?.unexpectedNodeIds).toEqual([18845]);
    expect(fake.discarded).toBe(false);
  });

  it("rejects a worker report that missed a requested node", async () => {
    const body = workerOk({ Life: 1 }, { Life: 2 });
    body.candidate.allocatedNodeIds = [];
    const outcome = await evaluatePassiveCandidate({
      ...baseInput,
      requestId: "req-1",
      transport: transport(body),
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error.code).toBe("candidate-allocation-mismatch");
    expect(outcome.allocation?.missingNodeIds).toEqual([4739]);
  });

  it("keeps a mismatch when restore succeeded and discards the worker when it did not", async () => {
    const restored = transport({
      ok: false,
      requestId: "req-1",
      protocolVersion: 2,
      error: { code: "candidate-allocation-mismatch" },
      baseline: { metrics: { Life: 1 }, skill },
      restoreMetrics: { Life: 1 },
      allocation: {
        requestedNodeIds: [4739],
        expectedNodeIds: [4739],
        actuallyAllocatedNodeIds: [],
        unexpectedNodeIds: [],
        missingNodeIds: [4739],
        allocationMode: "shared",
      },
    });
    const broken = transport({
      ok: false,
      requestId: "req-1",
      protocolVersion: 2,
      error: { code: "candidate-allocation-mismatch" },
      baseline: { metrics: { Life: 1 }, skill },
      restoreMetrics: { Life: 9 },
    });
    const kept = await evaluatePassiveCandidate({
      ...baseInput,
      requestId: "req-1",
      transport: restored,
    });
    const discarded = await evaluatePassiveCandidate({
      ...baseInput,
      requestId: "req-1",
      transport: broken,
    });
    expect(kept.ok).toBe(false);
    if (!kept.ok) expect(kept.error.code).toBe("candidate-allocation-mismatch");
    expect(restored.discarded).toBe(false);
    expect(discarded.ok).toBe(false);
    if (!discarded.ok) expect(discarded.error.code).toBe("restore-failed");
    expect(broken.discarded).toBe(true);
  });

  it("rejects a point cost that is not a verified integer before calling the worker", async () => {
    let called = false;
    const outcome = await evaluatePassiveCandidate({
      ...baseInput,
      candidate: {
        nodeIds: [4739],
        allocationMode: "shared",
        verifiedPointCost: 1.5,
      },
      transport: {
        request: () => {
          called = true;
          return Promise.resolve(null);
        },
        discard() {},
      },
    });
    expect(called).toBe(false);
    expect(outcome.ok).toBe(false);
  });

  it("rejects a claimed point cost that is not the verified cost", () => {
    expect(claimedPointCostMatches(1, 1)).toBe(true);
    expect(claimedPointCostMatches(4, 1)).toBe(false);
    expect(claimedPointCostMatches(null, 1)).toBe(false);
  });
});

const helm =
  "Rarity: RARE\nSpike Helm\nWrapped Greathelm\nArmour: 40\n+80 to maximum Life\n";

describe("item replacement", () => {
  it("returns named deltas and no score for a valid replacement", async () => {
    const outcome = await evaluateItemReplacement({
      ...baseInput,
      requestId: "item-1",
      item: { slot: "helmet", rawItemText: helm, label: "Test Greathelm" },
      transport: transport({
        ok: true,
        requestId: "item-1",
        protocolVersion: 2,
        pobVersion: "0.23.1",
        treeKey: "0_5",
        baseline: { metrics: { Life: 382, Armour: 194 }, skill },
        item: {
          slot: "Helmet",
          metrics: { Life: 464, Armour: 144 },
          skill,
          baselineItemId: 5,
          baselineItemRaw: "Rarity: NORMAL\nOld Helm\n",
          restoredItemId: 5,
        },
        restoreMetrics: { Life: 382, Armour: 194 },
      }),
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const life = outcome.result.metrics.find((metric) => metric.id === "Life");
    expect(life?.absoluteDelta).toBe(82);
    expect(life?.percentDelta).not.toBeNull();
    expect(outcome.result.baselineItem.id).toBe(5);
    expect(outcome.result.candidateItem.label).toBe("Test Greathelm");
    expect(
      outcome.result.candidateItem.rawChecksum?.startsWith("sha256:"),
    ).toBe(true);
    expect("score" in outcome.result).toBe(false);
    expect("recommendation" in outcome.result).toBe(false);
  });

  it("rejects a malformed item and an unsupported slot before the worker", async () => {
    let called = false;
    const fake: CalculatorTransport = {
      request: () => {
        called = true;
        return Promise.resolve(null);
      },
      discard() {},
    };
    const malformed = await evaluateItemReplacement({
      ...baseInput,
      item: { slot: "helmet", rawItemText: "hello" },
      transport: fake,
    });
    const unsupported = await evaluateItemReplacement({
      ...baseInput,
      item: { slot: "jewel", rawItemText: helm },
      transport: fake,
    });
    expect(malformed.ok).toBe(false);
    if (!malformed.ok) expect(malformed.error.code).toBe("item-invalid");
    expect(unsupported.ok).toBe(false);
    if (!unsupported.ok) {
      expect(unsupported.error.code).toBe("item-slot-unsupported");
    }
    expect(called).toBe(false);
  });

  it("returns the worker's parser and equip failures, and discards a bad restore", async () => {
    const invalid = await evaluateItemReplacement({
      ...baseInput,
      requestId: "item-1",
      item: { slot: "helmet", rawItemText: helm },
      transport: transport({
        ok: false,
        requestId: "item-1",
        protocolVersion: 2,
        error: { code: "item-invalid" },
      }),
    });
    const failed = await evaluateItemReplacement({
      ...baseInput,
      requestId: "item-1",
      item: { slot: "helmet", rawItemText: helm },
      transport: transport({
        ok: false,
        requestId: "item-1",
        protocolVersion: 2,
        error: { code: "item-replacement-failed" },
      }),
    });
    const fake = transport({
      ok: true,
      requestId: "item-1",
      protocolVersion: 2,
      pobVersion: "0.23.1",
      treeKey: "0_5",
      baseline: { metrics: { Life: 1 }, skill },
      item: {
        slot: "Helmet",
        metrics: { Life: 2 },
        skill,
        baselineItemId: 5,
        baselineItemRaw: null,
        restoredItemId: 0,
      },
      restoreMetrics: { Life: 1 },
    });
    const restored = await evaluateItemReplacement({
      ...baseInput,
      requestId: "item-1",
      item: { slot: "helmet", rawItemText: helm },
      transport: fake,
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.error.code).toBe("item-invalid");
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.error.code).toBe("item-replacement-failed");
    expect(restored.ok).toBe(false);
    if (!restored.ok) expect(restored.error.code).toBe("restore-failed");
    expect(fake.discarded).toBe(true);
  });
});
