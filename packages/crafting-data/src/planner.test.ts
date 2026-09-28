import { describe, expect, it } from "vitest";
import {
  assessPlannerReadiness,
  buildCraftingCompatibilityReport,
  evaluateCapabilityChecks,
  indexCraftingSnapshot,
  normalizeCraftingSource,
  presentModifier,
  type CompatibilityCheck,
  type CraftingCompatibilityReport,
} from "./index.js";

function check(
  partial: Partial<CompatibilityCheck> &
    Pick<CompatibilityCheck, "id" | "capability" | "result">,
): CompatibilityCheck {
  return {
    required: true,
    subject: partial.id,
    expected: "expected",
    actual: partial.result === "match" ? "expected" : "other",
    evidenceSource: "unit",
    ...partial,
  };
}

function requiredMatches(): CompatibilityCheck[] {
  return [
    "baseIdentity",
    "modifierIdentity",
    "statRanges",
    "requiredItemLevel",
    "generationType",
    "sourcePoolEligibility",
    "translationFallback",
  ].map((capability) => check({ id: capability, capability, result: "match" }));
}

describe("planner readiness", () => {
  it("stays unknown when a required check is missing", () => {
    const evaluated = evaluateCapabilityChecks(
      requiredMatches().filter((entry) => entry.capability !== "statRanges"),
    );
    expect(evaluated.capabilities.statRanges).toBe("unknown");
    expect(evaluated.conclusion).toBe("unknown");
  });

  it("is incompatible when a required check mismatches", () => {
    const checks = requiredMatches().map((entry) =>
      entry.capability === "requiredItemLevel"
        ? check({
            id: "requiredItemLevel",
            capability: "requiredItemLevel",
            result: "mismatch",
          })
        : entry,
    );
    const evaluated = evaluateCapabilityChecks(checks);
    expect(evaluated.capabilities.requiredItemLevel).toBe("incompatible");
    expect(evaluated.conclusion).toBe("incompatible");
  });

  it("is compatible when every required check matches", () => {
    const evaluated = evaluateCapabilityChecks(requiredMatches());
    expect(evaluated.conclusion).toBe("compatible");
  });

  it("blocks planner use when a required capability is unknown", () => {
    const { snapshot } = synthetic();
    const report = buildCraftingCompatibilityReport(snapshot);
    report.conclusion = "unknown";
    report.capabilities.statRanges = "unknown";
    const readiness = assessPlannerReadiness(snapshot, report);
    expect(readiness.ok).toBe(true);
    if (!readiness.ok) {
      return;
    }
    expect(readiness.value.status).toBe("blocked");
    expect(readiness.value.blockedCapabilities).toContain("statRanges");
  });

  it("can stay ready when presentation is partial and distribution is blocked", () => {
    const { snapshot, indexed } = synthetic();
    const report = readyReport(snapshot);
    const readiness = assessPlannerReadiness(snapshot, report);
    expect(readiness.ok).toBe(true);
    if (!readiness.ok) {
      return;
    }
    expect(readiness.value.plannerReadiness).toBe("ready");
    expect(readiness.value.presentationReadiness).toBe("partial");
    expect(readiness.value.distributionReadiness).toBe("blocked");
    expect(readiness.value.status).toBe("ready");
    const fallback = presentModifier(indexed, "SynthLife");
    expect(fallback.ok && fallback.value.presentation).toBe("fallback");
    if (fallback.ok) {
      expect(fallback.value.text).toBe(
        "Synthetic Life\nSynthLife\nstat:\n  synth_life: 190–199\ntranslation unresolved",
      );
      expect(fallback.value.text).not.toContain("maximum Life");
    }
  });

  it("blocks planner development when local preparation is not explicit", () => {
    const { snapshot } = synthetic();
    const report = readyReport(snapshot);
    report.localDevelopmentOnly = false;
    const readiness = assessPlannerReadiness(snapshot, report);
    expect(readiness.ok).toBe(true);
    if (readiness.ok) {
      expect(readiness.value.status).toBe("blocked");
    }
  });

  it("fails closed when the compatibility report belongs to another snapshot", () => {
    const { snapshot } = synthetic();
    const report = readyReport(snapshot);
    report.snapshotChecksum = `sha256:${"ab".repeat(32)}`;
    const readiness = assessPlannerReadiness(snapshot, report);
    expect(readiness.ok).toBe(false);
    if (!readiness.ok) {
      expect(readiness.error.code).toBe("snapshot-incompatible");
    }
  });

  it("does not show source text as a translation", () => {
    const { indexed } = synthetic();
    const presented = presentModifier(indexed, "SynthStrength");
    expect(presented.ok && presented.value.presentation).toBe("resolved");
    if (presented.ok) {
      expect(presented.value.text).toBe("{0} synthetic strength");
      expect(presented.value.text).not.toContain("UPSTREAM TEXT");
    }
  });
});

function synthetic() {
  const normalized = normalizeCraftingSource({
    commit: "synthetic",
    sourceVersion: "synthetic",
    fetchedAt: null,
    files: [],
    bases: {
      "synth/body": {
        name: "Synthetic Cuirass",
        item_class: "Body Armour",
        domain: "item",
        tags: ["str_armour", "body_armour", "default"],
        drop_level: 1,
        requirements: null,
      },
    },
    mods: {
      SynthStrength: {
        domain: "item",
        generation_type: "suffix",
        groups: ["Strength"],
        required_level: 1,
        spawn_weights: [{ tag: "str_armour", weight: 1 }],
        generation_weights: [],
        stats: [{ id: "synth_strength", min: 5, max: 8 }],
        text: "UPSTREAM TEXT SHOULD NOT APPEAR",
        name: "Synthetic Brute",
      },
      SynthLife: {
        domain: "item",
        generation_type: "prefix",
        groups: ["SyntheticLife"],
        required_level: 75,
        spawn_weights: [{ tag: "body_armour", weight: 1 }],
        generation_weights: [],
        stats: [{ id: "synth_life", min: 190, max: 199 }],
        text: "UPSTREAM LIFE TEXT",
        name: "Synthetic Life",
      },
    },
    translations: [
      {
        ids: ["synth_strength"],
        English: [
          {
            condition: [{ min: null, max: null, negated: null }],
            string: "{0} synthetic strength",
          },
        ],
      },
    ],
  });
  if (!normalized.ok) {
    throw new Error(normalized.error.message);
  }
  return {
    snapshot: normalized.value,
    indexed: indexCraftingSnapshot(normalized.value),
  };
}

function readyReport(
  snapshot: ReturnType<typeof synthetic>["snapshot"],
): CraftingCompatibilityReport {
  const report = buildCraftingCompatibilityReport(snapshot);
  report.conclusion = "compatible";
  for (const capability of [
    "baseIdentity",
    "modifierIdentity",
    "statRanges",
    "requiredItemLevel",
    "generationType",
    "sourcePoolEligibility",
    "translationFallback",
  ]) {
    report.capabilities[capability] = "compatible";
  }
  report.localDevelopmentOnly = true;
  return report;
}
