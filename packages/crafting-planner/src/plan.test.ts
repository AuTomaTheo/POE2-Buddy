import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCraftingCompatibilityReport,
  normalizeCraftingSource,
  type CraftingCompatibilityReport,
  type CraftingSnapshot,
} from "@poe2-helper/crafting-data";
import {
  loadPlannerInputs,
  planCraftTargets,
  searchCraftTargets,
} from "./index.js";

describe("craft target planner", () => {
  it("plans a supported armour base", () => {
    const plan = planFor("synth/body", 82, [
      { kind: "stat", statId: "synth_life" },
    ]);
    expect(plan.ok).toBe(true);
    if (!plan.ok) {
      return;
    }
    expect(plan.status).toBe("ready");
    expect(plan.targets[0]?.resolution).toBe(
      "resolved-with-eligible-candidates",
    );
    expect(
      plan.candidates.some((candidate) => candidate.eligibility === "eligible"),
    ).toBe(true);
    expect(plan.provenance.plannerVersion).toBe(1);
    expect(plan.combinationFeasibility).toBe("not-requested");
  });

  it("resolves a weapon base and a jewellery base", () => {
    const wand = planFor("synth/wand", 10, [
      { kind: "stat", statId: "synth_spell" },
    ]);
    const ring = planFor("synth/ring", 10, [
      { kind: "stat", statId: "synth_strength" },
    ]);
    expect(wand.ok && wand.base.itemClass).toBe("Wand");
    expect(ring.ok && ring.base.itemClass).toBe("Ring");
    if (ring.ok) {
      expect(ring.candidates[0]?.affixKind).toBe("suffix");
      expect(ring.candidates[0]?.presentationStatus).toBe("resolved");
    }
  });

  it("resolves an exact base name and item class", () => {
    const { snapshot, report } = synthetic();
    const plan = planCraftTargets(snapshot, report, {
      base: { name: "Synthetic Cuirass", itemClass: "Body Armour" },
      itemLevel: 82,
      targets: [{ kind: "stat", statId: "synth_life" }],
    });
    expect(plan.ok && plan.base.id).toBe("synth/body");
  });

  it("keeps an item-level gate in front of the source pool", () => {
    const below = planFor("synth/body", 74, [
      { kind: "modifier", modifierId: "AlphaLife" },
    ]);
    const at = planFor("synth/body", 75, [
      { kind: "modifier", modifierId: "AlphaLife" },
    ]);
    expect(below.ok && below.candidates[0]?.eligibility).toBe("ineligible");
    expect(below.ok && below.candidates[0]?.requiredItemLevelPassed).toBe(
      false,
    );
    expect(at.ok && at.candidates[0]?.eligibility).toBe("eligible");
    expect(
      at.ok &&
        at.candidates[0]?.evidence.some(
          (entry) => entry.code === "spawn-tag-matched",
        ),
    ).toBe(true);
  });

  it("keeps a zero spawn weight ineligible without a probability field", () => {
    const plan = planFor("synth/body", 82, [
      { kind: "modifier", modifierId: "ZeroLife" },
    ]);
    expect(plan.ok && plan.candidates[0]?.eligibility).toBe("ineligible");
    expect(plan.ok && plan.candidates[0]?.eligibilityLabel).toBe(
      "Source-pool ineligible",
    );
    expect(keysOf(plan)).not.toContain("probability");
  });

  it("keeps a missing spawn weight unresolved", () => {
    const plan = planFor("synth/body", 82, [
      { kind: "modifier", modifierId: "MissingWeight" },
    ]);
    expect(plan.ok && plan.candidates[0]?.eligibility).toBe("unresolved");
    expect(plan.ok && plan.candidates[0]?.eligibilityLabel).toBe(
      "Eligibility unresolved",
    );
  });

  it("falls back without guessed English", () => {
    const plan = planFor("synth/body", 82, [
      { kind: "modifier", modifierId: "AlphaLife" },
    ]);
    expect(plan.ok).toBe(true);
    if (!plan.ok) {
      return;
    }
    const candidate = plan.candidates[0];
    expect(candidate?.presentationStatus).toBe("fallback");
    expect(candidate?.presentation).toContain("AlphaLife");
    expect(candidate?.presentation).toContain("synth_life: 190–199");
    expect(candidate?.presentation).toContain("translation unresolved");
    expect(candidate?.presentation).not.toContain("maximum Life");
    expect(candidate?.presentation).not.toContain("UPSTREAM");
  });

  it("returns one row when one modifier satisfies two stats", () => {
    const plan = planFor("synth/body", 82, [
      { kind: "stat", statId: "synth_evasion" },
      { kind: "stat", statId: "synth_armour" },
    ]);
    expect(plan.ok).toBe(true);
    if (!plan.ok) {
      return;
    }
    const multi = plan.candidates.filter(
      (candidate) => candidate.modifierId === "MultiStat",
    );
    expect(multi).toHaveLength(1);
    expect(multi[0]?.targetIds).toEqual([
      "stat:synth_armour",
      "stat:synth_evasion",
    ]);
  });

  it("does not claim that two targets can coexist", () => {
    const plan = planFor("synth/body", 82, [
      { kind: "stat", statId: "synth_life" },
      { kind: "stat", statId: "synth_armour" },
    ]);
    expect(plan.ok).toBe(true);
    if (!plan.ok) {
      return;
    }
    expect(plan.combinationFeasibility).toBe("unresolved");
    expect(plan.warnings.join(" ")).toContain(
      "Targets are evaluated independently. Modifier coexistence and full craft feasibility are not validated yet.",
    );
    expect(JSON.stringify(plan)).not.toContain("can coexist");
    expect(JSON.stringify(plan)).not.toContain("conflict");
  });

  it("does not use a shared modifier group to exclude a candidate", () => {
    const plan = planFor("synth/body", 82, [
      { kind: "stat", statId: "synth_life" },
    ]);
    expect(plan.ok).toBe(true);
    if (!plan.ok) {
      return;
    }
    const ids = plan.candidates.map((candidate) => candidate.modifierId);
    expect(ids).toContain("AlphaLife");
    expect(ids).toContain("BetaLife");
  });

  it("does not let a generation weight of zero change eligibility", () => {
    const plan = planFor("synth/body", 10, [
      { kind: "modifier", modifierId: "GenWeight" },
    ]);
    expect(plan.ok && plan.candidates[0]?.eligibility).toBe("eligible");
  });

  it("shows a special generation type only when the modifier is targeted", () => {
    const byStat = planFor("synth/body", 10, [
      { kind: "stat", statId: "synth_unique" },
    ]);
    const direct = planFor("synth/body", 10, [
      { kind: "modifier", modifierId: "SpecialUnique" },
    ]);
    expect(byStat.ok && byStat.candidates).toEqual([]);
    expect(byStat.ok && byStat.targets[0]?.message).toContain(
      "Special generation types",
    );
    expect(direct.ok && direct.candidates[0]?.warnings.join(" ")).toContain(
      "Special generation type. This planner does not model how to obtain this modifier.",
    );
  });

  it("states the essence-only flag without naming a crafting action", () => {
    const plan = planFor("synth/body", 10, [
      { kind: "modifier", modifierId: "EssenceOnly" },
    ]);
    expect(plan.ok && plan.candidates[0]?.warnings.join(" ")).toContain(
      "Source marks this modifier as essence-only. The current planner does not model the mechanic that grants it.",
    );
    expect(JSON.stringify(plan)).not.toContain("Use Essence");
  });

  it("refuses Warstaff without mapping it to Staff", () => {
    const plan = planFor("synth/warstaff", 10, [
      { kind: "stat", statId: "synth_spell" },
    ]);
    expect(plan.ok).toBe(false);
    if (plan.ok) {
      return;
    }
    expect(plan.code).toBe("unsupported-item-class");
    expect(plan.itemClass).toBe("Warstaff");
    expect(plan.baseId).toBe("synth/warstaff");
    expect(plan.compatibilityPolicyVersion).toBe(1);
    expect(plan.message).not.toContain("mapped");
  });

  it("blocks a stale compatibility report", () => {
    const { snapshot, report } = synthetic();
    report.snapshotChecksum = `sha256:${"ab".repeat(32)}`;
    const plan = planCraftTargets(snapshot, report, {
      base: { id: "synth/body" },
      itemLevel: 82,
      targets: [{ kind: "stat", statId: "synth_life" }],
    });
    expect(plan.ok).toBe(false);
    if (!plan.ok) {
      expect(plan.code).toBe("planner-not-ready");
      expect(plan.message).toContain("does not match");
    }
  });

  it("reports a missing snapshot without fetching", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "craft-plan-"));
    const result = loadPlannerInputs(
      path.join(directory, "missing-snapshot.json"),
      path.join(directory, "missing-report.json"),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("snapshot-unavailable");
      expect(result.setup).toContain("npm run refresh:crafting-data");
      expect(result.setup).toContain("npm run crafting:readiness");
    }
    expect(JSON.stringify(result)).not.toContain("https://");
  });

  it("orders candidates the same way when modifier insertion order changes", () => {
    const { snapshot, report } = synthetic();
    const reversed: CraftingSnapshot = {
      ...snapshot,
      modifiers: [...snapshot.modifiers].reverse(),
    };
    const input = {
      base: { id: "synth/body" },
      itemLevel: 82,
      targets: [{ kind: "stat" as const, statId: "synth_order" }],
    };
    const first = planCraftTargets(snapshot, report, input);
    const second = planCraftTargets(reversed, report, input);
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(
        second.candidates.map((candidate) => candidate.modifierId),
      ).toEqual(first.candidates.map((candidate) => candidate.modifierId));
      expect(first.candidates.map((candidate) => candidate.modifierId)).toEqual(
        ["ZPrefix", "ASuffix"],
      );
    }
  });

  it("keeps the higher minimum when the same stat is requested twice", () => {
    const plan = planFor("synth/body", 82, [
      { kind: "stat", statId: "synth_life", minimumValue: 10 },
      { kind: "stat", statId: "synth_life", minimumValue: 195 },
    ]);
    expect(plan.ok).toBe(true);
    if (!plan.ok) {
      return;
    }
    expect(plan.targets).toHaveLength(1);
    expect(plan.targets[0]?.minimumValue).toBe(195);
    expect(plan.candidates.map((candidate) => candidate.modifierId)).toContain(
      "AlphaLife",
    );
    expect(
      plan.candidates.map((candidate) => candidate.modifierId),
    ).not.toContain("BetaLife");
    expect(JSON.stringify(plan)).toContain(
      "This modifier can roll a value that meets the target. It is not guaranteed to roll that value.",
    );
    expect(JSON.stringify(plan)).not.toContain("will meet");
  });

  it("has no cost, budget, or affordability fields", () => {
    const plan = planFor("synth/body", 82, [
      { kind: "stat", statId: "synth_life" },
    ]);
    const keys = keysOf(plan);
    expect(keys).not.toContain("expectedCost");
    expect(keys).not.toContain("budgetEfficiency");
    expect(keys).not.toContain("affordable");
    expect(keys).not.toContain("probability");
  });

  it("returns an ambiguous base instead of guessing", () => {
    const { snapshot, report } = synthetic();
    const plan = planCraftTargets(snapshot, report, {
      base: { name: "Twin Ring", itemClass: "Ring" },
      itemLevel: 10,
      targets: [{ kind: "stat", statId: "synth_strength" }],
    });
    expect(plan.ok).toBe(false);
    if (!plan.ok) {
      expect(plan.code).toBe("base-ambiguous");
    }
  });

  it("searches by exact substring and ignores a one-character query", () => {
    const { snapshot } = synthetic();
    expect(searchCraftTargets(snapshot, "s")).toEqual([]);
    const hits = searchCraftTargets(snapshot, "synth_life");
    expect(
      hits.some((hit) => hit.kind === "stat" && hit.id === "synth_life"),
    ).toBe(true);
    expect(hits.every((hit) => hit.id.includes("synth_life"))).toBe(true);
  });

  it("writes a readable load error when the report file is absent", () => {
    const { snapshot } = synthetic();
    const directory = mkdtempSync(path.join(tmpdir(), "craft-plan-"));
    const snapshotPath = path.join(directory, "snapshot.json");
    writeFileSync(snapshotPath, JSON.stringify(snapshot));
    const result = loadPlannerInputs(
      snapshotPath,
      path.join(directory, "missing-report.json"),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("planner-not-ready");
    }
  });
});

function planFor(
  baseId: string,
  itemLevel: number,
  targets: {
    kind: "stat" | "modifier";
    statId?: string;
    modifierId?: string;
    minimumValue?: number;
  }[],
) {
  const { snapshot, report } = synthetic();
  return planCraftTargets(snapshot, report, {
    base: { id: baseId },
    itemLevel,
    targets: targets.map((target) =>
      target.kind === "stat"
        ? {
            kind: "stat" as const,
            statId: target.statId ?? "",
            ...(target.minimumValue !== undefined
              ? { minimumValue: target.minimumValue }
              : {}),
          }
        : { kind: "modifier" as const, modifierId: target.modifierId ?? "" },
    ),
  });
}

function keysOf(value: unknown): string[] {
  const keys: string[] = [];
  const visit = (current: unknown) => {
    if (!current || typeof current !== "object") {
      return;
    }
    if (Array.isArray(current)) {
      for (const entry of current) {
        visit(entry);
      }
      return;
    }
    for (const [key, entry] of Object.entries(current)) {
      keys.push(key);
      visit(entry);
    }
  };
  visit(value);
  return keys;
}

function synthetic(): {
  snapshot: CraftingSnapshot;
  report: CraftingCompatibilityReport;
} {
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
      "synth/wand": {
        name: "Synthetic Wand",
        item_class: "Wand",
        domain: "item",
        tags: ["wand", "default"],
        drop_level: 1,
        requirements: null,
      },
      "synth/ring": {
        name: "Synthetic Ring",
        item_class: "Ring",
        domain: "item",
        tags: ["ring", "default"],
        drop_level: 1,
        requirements: null,
      },
      "synth/ring-a": {
        name: "Twin Ring",
        item_class: "Ring",
        domain: "item",
        tags: ["ring", "default"],
        drop_level: 1,
        requirements: null,
      },
      "synth/ring-b": {
        name: "Twin Ring",
        item_class: "Ring",
        domain: "item",
        tags: ["ring", "default"],
        drop_level: 1,
        requirements: null,
      },
      "synth/warstaff": {
        name: "Synthetic Quarterstaff",
        item_class: "Warstaff",
        domain: "item",
        tags: ["staff", "default"],
        drop_level: 1,
        requirements: null,
      },
    },
    mods: {
      AlphaLife: mod("prefix", 75, "body_armour", 1, [
        { id: "synth_life", min: 190, max: 199 },
      ]),
      BetaLife: mod("prefix", 1, "body_armour", 1, [
        { id: "synth_life", min: 10, max: 20 },
      ]),
      ZeroLife: mod("prefix", 1, "body_armour", 0, [
        { id: "synth_life", min: 1, max: 2 },
      ]),
      MissingWeight: {
        ...mod("prefix", 1, "body_armour", 1, [
          { id: "synth_life", min: 3, max: 4 },
        ]),
        spawn_weights: [{ tag: "body_armour" }],
      },
      WandSpell: mod("prefix", 1, "wand", 1, [
        { id: "synth_spell", min: 1, max: 2 },
      ]),
      RingStrength: {
        ...mod("suffix", 1, "ring", 1, [
          { id: "synth_strength", min: 5, max: 8 },
        ]),
        name: "Synthetic Brute",
      },
      MultiStat: mod("prefix", 1, "body_armour", 1, [
        { id: "synth_armour", min: 9, max: 16 },
        { id: "synth_evasion", min: 6, max: 10 },
      ]),
      GenWeight: {
        ...mod("prefix", 1, "body_armour", 1, [
          { id: "synth_gen", min: 1, max: 4 },
        ]),
        generation_weights: [{ tag: "body_armour", weight: 0 }],
      },
      SpecialUnique: mod("unique", 1, "body_armour", 1, [
        { id: "synth_unique", min: 1, max: 2 },
      ]),
      EssenceOnly: {
        ...mod("prefix", 1, "body_armour", 1, [
          { id: "synth_essence", min: 1, max: 2 },
        ]),
        is_essence_only: true,
      },
      ZPrefix: mod("prefix", 40, "body_armour", 1, [
        { id: "synth_order", min: 1, max: 2 },
      ]),
      ASuffix: mod("suffix", 1, "body_armour", 1, [
        { id: "synth_order", min: 1, max: 2 },
      ]),
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
  return { snapshot: normalized.value, report: readyReport(normalized.value) };
}

function mod(
  generationType: string,
  requiredLevel: number,
  tag: string,
  weight: number,
  stats: { id: string; min: number; max: number }[],
) {
  return {
    domain: "item",
    generation_type: generationType,
    groups: ["SyntheticGroup"],
    required_level: requiredLevel,
    spawn_weights: [{ tag, weight }],
    generation_weights: [],
    stats,
    text: "UPSTREAM TEXT SHOULD NOT APPEAR",
    name: "Synthetic Life",
  };
}

function readyReport(snapshot: CraftingSnapshot): CraftingCompatibilityReport {
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
