import { describe, expect, it } from "vitest";
import {
  buildCraftingCompatibilityReport,
  normalizeCraftingSource,
  type CraftingCompatibilityReport,
  type CraftingSnapshot,
} from "@poe2-helper/crafting-data";
import {
  addRandomExplicitDefinition,
  buildAddRandomExplicitPool,
  craftingStateFromKnownFields,
  explainAddRandomExplicitSelection,
  explainWeightModel,
  validateAddRandomExplicit,
  type CraftingItemState,
} from "./index.js";

const magicBody: CraftingItemState = {
  baseId: "synth/body",
  itemLevel: 10,
  rarity: "magic",
  explicitModifierIds: [],
};

describe("Orb of Augmentation semantics", () => {
  it("accepts a magic item with no explicit modifiers", () => {
    const { snapshot, report } = synthetic();
    const pool = buildAddRandomExplicitPool(snapshot, report, magicBody);
    expect(pool.ok).toBe(true);
    if (!pool.ok) {
      return;
    }
    expect(pool.stateTransitionStatus).toBe("ready");
    expect(pool.transition.rarityAfter).toBe("magic");
    expect(pool.transition.explicitCountAfter).toBe(1);
    expect(pool.transition.addedModifierId).toBeNull();
    expect(pool.transition.removedModifierIds).toEqual([]);
    expect(pool.probabilityStatus).toBe("blocked");
    expect(pool.finalMechanicCandidateIds).toEqual([]);
    expect(pool.poolStatus).toBe("partial");
    expect(pool.provenance.semanticsVersion).toBe(1);
    expect(pool.provenance.snapshotChecksum).toBe(snapshot.checksum);
  });

  it("rejects a rare item", () => {
    const { snapshot, report } = synthetic();
    const result = validateAddRandomExplicit(snapshot, report, {
      ...magicBody,
      rarity: "rare",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("unsupported-rarity");
    }
  });

  it("rejects a full magic item without claiming the currency is consumed", () => {
    const { snapshot, report } = synthetic();
    const result = validateAddRandomExplicit(snapshot, report, {
      ...magicBody,
      explicitModifierIds: ["OpenPrefix", "SecondPrefix"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("no-open-affix-slot");
      expect(result.message).toContain("up to two random modifiers");
      expect(result.message).not.toContain("consumes the currency");
    }
  });

  it("blocks an existing explicit modifier instead of ignoring the group", () => {
    const { snapshot, report } = synthetic();
    const result = validateAddRandomExplicit(snapshot, report, {
      ...magicBody,
      explicitModifierIds: ["OpenPrefix"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("conflict-model-unavailable");
    }
  });

  it("does not accept an unknown modifier id", () => {
    const { snapshot, report } = synthetic();
    const result = validateAddRandomExplicit(snapshot, report, {
      ...magicBody,
      explicitModifierIds: ["MissingMod"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("modifier-identity-unresolved");
    }
  });

  it("lists one source-pool id on a ring and does not call it the mechanic pool", () => {
    const { snapshot, report } = synthetic();
    const pool = buildAddRandomExplicitPool(snapshot, report, {
      baseId: "synth/ring",
      itemLevel: 10,
      rarity: "magic",
      explicitModifierIds: [],
    });
    expect(pool.ok).toBe(true);
    if (!pool.ok) {
      return;
    }
    expect(pool.sourcePoolEligibleIds).toEqual(["RingSuffix"]);
    expect(pool.finalMechanicCandidateIds).toEqual([]);
    expect(pool.poolNote).toContain("not a proven");
  });

  it("lists multiple source-pool ids in modifier-id order", () => {
    const { snapshot, report } = synthetic();
    const reversed: CraftingSnapshot = {
      ...snapshot,
      modifiers: [...snapshot.modifiers].reverse(),
    };
    const first = buildAddRandomExplicitPool(snapshot, report, magicBody);
    const second = buildAddRandomExplicitPool(reversed, report, magicBody);
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.sourcePoolEligibleIds).toEqual([
        "OpenPrefix",
        "SecondPrefix",
      ]);
      expect(second.sourcePoolEligibleIds).toEqual(first.sourcePoolEligibleIds);
    }
  });

  it("excludes a zero spawn weight from the inspection eligible list", () => {
    const { snapshot, report } = synthetic();
    const pool = buildAddRandomExplicitPool(snapshot, report, magicBody);
    expect(pool.ok).toBe(true);
    if (!pool.ok) {
      return;
    }
    expect(pool.sourcePoolEligibleIds).not.toContain("ZeroPrefix");
    expect(pool.finalMechanicCandidateIds).not.toContain("ZeroPrefix");
    expect(
      pool.excluded.find((entry) => entry.modifierId === "ZeroPrefix")?.reason,
    ).toContain("weight is zero");
  });

  it("excludes a special generation type with a visible reason", () => {
    const { snapshot, report } = synthetic();
    const pool = buildAddRandomExplicitPool(snapshot, report, magicBody);
    expect(pool.ok).toBe(true);
    if (!pool.ok) {
      return;
    }
    const special = pool.excluded.find(
      (entry) => entry.modifierId === "SpecialUnique",
    );
    expect(special?.reason).toContain("Special generation type");
    expect(pool.sourcePoolEligibleIds).not.toContain("SpecialUnique");
  });

  it("leaves an essence-only modifier unresolved", () => {
    const { snapshot, report } = synthetic();
    const pool = buildAddRandomExplicitPool(snapshot, report, magicBody);
    expect(pool.ok).toBe(true);
    if (!pool.ok) {
      return;
    }
    const essence = pool.unresolved.find(
      (entry) => entry.modifierId === "EssencePrefix",
    );
    expect(essence?.reason).toContain("essence-only");
    expect(pool.sourcePoolEligibleIds).not.toContain("EssencePrefix");
    expect(
      pool.excluded.some((entry) => entry.modifierId === "EssencePrefix"),
    ).toBe(false);
  });

  it("does not treat a generation weight of zero as a multiplier", () => {
    const { snapshot, report } = synthetic();
    const pool = buildAddRandomExplicitPool(snapshot, report, magicBody);
    expect(pool.ok).toBe(true);
    if (!pool.ok) {
      return;
    }
    expect(pool.sourcePoolEligibleIds).not.toContain("GenPrefix");
    expect(
      pool.unresolved.find((entry) => entry.modifierId === "GenPrefix")?.reason,
    ).toContain("Generation-weight");
    expect(pool.weightStatus).toBe("unknown");
  });

  it("refuses Warstaff", () => {
    const { snapshot, report } = synthetic();
    const result = validateAddRandomExplicit(snapshot, report, {
      ...magicBody,
      baseId: "synth/warstaff",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("unsupported-item-state");
      expect(result.message).toContain("Warstaff");
    }
  });

  it("fails closed when the compatibility report is stale", () => {
    const { snapshot, report } = synthetic();
    report.snapshotChecksum = `sha256:${"ab".repeat(32)}`;
    const result = validateAddRandomExplicit(snapshot, report, magicBody);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("mechanic-not-ready");
      expect(result.message).toContain("does not match");
    }
  });

  it("has no probability value and no expected cost", () => {
    const { snapshot, report } = synthetic();
    const pool = buildAddRandomExplicitPool(snapshot, report, magicBody);
    const weight = explainWeightModel();
    expect(weight.code).toBe("weight-model-unavailable");
    const keys = keysOf(pool);
    expect(keys).not.toContain("probability");
    expect(keys).not.toContain("expectedCost");
    expect(pool.ok && pool.probabilityStatus).toBe("blocked");
  });

  it("keeps an item-level gate on the inspection list", () => {
    const { snapshot, report } = synthetic();
    const low = buildAddRandomExplicitPool(snapshot, report, magicBody);
    const high = buildAddRandomExplicitPool(snapshot, report, {
      ...magicBody,
      itemLevel: 80,
    });
    expect(low.ok && low.sourcePoolEligibleIds).not.toContain("HighPrefix");
    expect(high.ok && high.sourcePoolEligibleIds).toContain("HighPrefix");
  });

  it("does not invent a crafting state from missing gear identity", () => {
    const unresolved = craftingStateFromKnownFields({
      baseId: "synth/body",
      itemLevel: 10,
      rarity: "magic",
      explicitModifierIds: null,
    });
    expect(unresolved.ok).toBe(false);
    if (!unresolved.ok) {
      expect(unresolved.code).toBe("state-unresolved");
      expect(unresolved.missing).toContain("explicitModifierIds");
    }
  });

  it("records the selected currency and leaves the greater orb out", () => {
    expect(addRandomExplicitDefinition.id).toBe("add-random-explicit");
    expect(addRandomExplicitDefinition.currencyRecordId).toBe(
      "Metadata/Items/Currency/CurrencyAddModToMagic",
    );
    expect(addRandomExplicitDefinition.unsupportedRules.greaterOrb).not.toBe(
      addRandomExplicitDefinition.currencyRecordId,
    );
    expect(addRandomExplicitDefinition.outcomeRules.probabilityStatus).toBe(
      "blocked",
    );
    expect(addRandomExplicitDefinition.closure.candidatePoolStatus).toBe(
      "partial",
    );
    expect(addRandomExplicitDefinition.closure.slotRuleStatus).toBe("unproven");
    expect(addRandomExplicitDefinition.semanticsVersion).toBe(1);
  });

  it("keeps inspection ids separate from an empty final pool", () => {
    const { snapshot, report } = synthetic();
    const pool = buildAddRandomExplicitPool(snapshot, report, magicBody);
    expect(pool.ok).toBe(true);
    if (!pool.ok) {
      return;
    }
    expect(pool.inspectionCandidateIds).toEqual(pool.sourcePoolEligibleIds);
    expect(pool.inspectionCandidateIds.length).toBeGreaterThan(0);
    expect(pool.finalMechanicCandidateIds).toEqual([]);
    expect(pool.candidatePoolStatus).toBe("partial");
    expect(pool.selectionRuleStatus).toBe("unproven");
  });

  it("blocks a magic item that already has a prefix", () => {
    const { snapshot, report } = synthetic();
    const result = buildAddRandomExplicitPool(snapshot, report, {
      ...magicBody,
      explicitModifierIds: ["OpenPrefix"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("conflict-model-unavailable");
      expect(keysOf(result)).not.toContain("probability");
    }
  });

  it("blocks a magic item that already has a suffix", () => {
    const { snapshot, report } = synthetic();
    const result = buildAddRandomExplicitPool(snapshot, report, {
      baseId: "synth/ring",
      itemLevel: 10,
      rarity: "magic",
      explicitModifierIds: ["RingSuffix"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("conflict-model-unavailable");
    }
  });

  it("does not roll the same id or the same group while conflicts are unproven", () => {
    const { snapshot, report } = synthetic();
    const result = validateAddRandomExplicit(snapshot, report, {
      ...magicBody,
      explicitModifierIds: ["OpenPrefix"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("conflict-model-unavailable");
      expect(result.message).toContain("Mod-group exclusivity is not approved");
    }
  });

  it("does not treat an empty inspection list as a known failure", () => {
    const { snapshot, report } = synthetic();
    const pool = buildAddRandomExplicitPool(snapshot, report, {
      baseId: "synth/focus",
      itemLevel: 10,
      rarity: "magic",
      explicitModifierIds: [],
    });
    expect(pool.ok).toBe(true);
    if (!pool.ok) {
      return;
    }
    expect(pool.inspectionCandidateIds).toEqual([]);
    expect(pool.finalMechanicCandidateIds).toEqual([]);
    expect(pool.emptyPoolBehavior).toBe("unknown");
    expect(pool.probabilityStatus).toBe("blocked");
    expect(keysOf(pool)).not.toContain("probability");
  });

  it("keeps exclusion reasons stable when modifier order changes", () => {
    const { snapshot, report } = synthetic();
    const reversed: CraftingSnapshot = {
      ...snapshot,
      modifiers: [...snapshot.modifiers].reverse(),
    };
    const first = buildAddRandomExplicitPool(snapshot, report, magicBody);
    const second = buildAddRandomExplicitPool(reversed, report, magicBody);
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.excluded).toEqual(first.excluded);
      expect(second.unresolved).toEqual(first.unresolved);
      expect(
        first.excluded.find((entry) => entry.modifierId === "ZeroPrefix")?.code,
      ).toBe("zero-weight");
      expect(
        first.excluded.find((entry) => entry.modifierId === "SpecialUnique")
          ?.code,
      ).toBe("wrong-generation-type");
      expect(
        first.unresolved.find((entry) => entry.modifierId === "EssencePrefix")
          ?.code,
      ).toBe("essence-only-unresolved");
      expect(
        first.unresolved.find((entry) => entry.modifierId === "GenPrefix")
          ?.code,
      ).toBe("generation-weight-unresolved");
    }
  });

  it("explains selection without a probability", () => {
    const { snapshot, report } = synthetic();
    const explained = explainAddRandomExplicitSelection();
    expect(explained.probabilityStatus).toBe("blocked");
    expect(explained.selectionRuleStatus).toBe("unproven");
    expect(keysOf(explained)).not.toContain("probability");
    expect(keysOf(explained)).not.toContain("expectedCost");
    const occupied = validateAddRandomExplicit(snapshot, report, {
      ...magicBody,
      explicitModifierIds: ["OpenPrefix"],
    });
    expect(occupied.ok).toBe(false);
  });
});

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
      "synth/body": base("Synthetic Cuirass", "Body Armour", [
        "body_armour",
        "default",
      ]),
      "synth/ring": base("Synthetic Ring", "Ring", ["ring", "default"]),
      "synth/focus": base("Synthetic Focus", "Focus", ["focus", "default"]),
      "synth/warstaff": base("Synthetic Quarterstaff", "Warstaff", [
        "staff",
        "default",
      ]),
    },
    mods: {
      OpenPrefix: mod("prefix", 1, "body_armour", 1, "open_life"),
      SecondPrefix: mod("prefix", 1, "body_armour", 1, "open_mana"),
      ZeroPrefix: mod("prefix", 1, "body_armour", 0, "open_zero"),
      HighPrefix: mod("prefix", 80, "body_armour", 1, "open_high"),
      EssencePrefix: {
        ...mod("prefix", 1, "body_armour", 1, "open_essence"),
        is_essence_only: true,
      },
      SpecialUnique: mod("unique", 1, "body_armour", 1, "open_unique"),
      GenPrefix: {
        ...mod("prefix", 1, "body_armour", 1, "open_gen"),
        generation_weights: [{ tag: "body_armour", weight: 0 }],
      },
      RingSuffix: mod("suffix", 1, "ring", 1, "open_strength"),
    },
    translations: [],
  });
  if (!normalized.ok) {
    throw new Error(normalized.error.message);
  }
  return { snapshot: normalized.value, report: readyReport(normalized.value) };
}

function base(name: string, itemClass: string, tags: string[]) {
  return {
    name,
    item_class: itemClass,
    domain: "item",
    tags,
    drop_level: 1,
    requirements: null,
  };
}

function mod(
  generationType: string,
  requiredLevel: number,
  tag: string,
  weight: number,
  statId: string,
) {
  return {
    domain: "item",
    generation_type: generationType,
    groups: ["SyntheticGroup"],
    required_level: requiredLevel,
    spawn_weights: [{ tag, weight }],
    generation_weights: [] as { tag: string; weight: number }[],
    stats: [{ id: statId, min: 1, max: 2 }],
    name: "Synthetic",
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
