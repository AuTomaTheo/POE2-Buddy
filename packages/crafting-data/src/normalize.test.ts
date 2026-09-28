import { describe, expect, it } from "vitest";
import {
  diffCraftingSnapshots,
  evaluateSourcePool,
  indexCraftingSnapshot,
  normalizeCraftingSource,
  parseCraftingSnapshot,
  querySourcePool,
  requirePlannerCompatibility,
  resolveBase,
  resolveGearBase,
  shareModifierGroup,
  translateModifier,
  type RawCraftingSource,
} from "./index.js";

const CUIRASS = "synth/body";
const WAND = "synth/wand";

type Draft = {
  commit: string;
  sourceVersion: string;
  bases: Record<string, unknown>;
  mods: Record<string, unknown>;
  translations: unknown[];
};

function base(
  name: string,
  itemClass: string,
  tags: string[],
  domain: string | null = "item",
) {
  return {
    name,
    item_class: itemClass,
    domain,
    tags,
    drop_level: 1,
    requirements: { level: 1, strength: 0, dexterity: 0, intelligence: 0 },
  };
}

function syntheticDraft(): Draft {
  return {
    commit: "synthetic",
    sourceVersion: "synthetic",
    bases: {
      [CUIRASS]: base("Synthetic Cuirass", "Body Armour", [
        "str_armour",
        "body_armour",
        "default",
      ]),
      [WAND]: base("Synthetic Wand", "Wand", ["wand", "default"]),
      "synth/ring": base("Synthetic Ring", "Ring", ["ring", "default"]),
      "synth/coin-a": base(
        "Synthetic Coin",
        "StackableCurrency",
        [],
        "undefined",
      ),
      "synth/coin-b": base("Synthetic Coin", "QuestItem", [], "undefined"),
    },
    mods: {
      SynthStrength: {
        domain: "item",
        generation_type: "suffix",
        groups: ["Strength"],
        required_level: 1,
        spawn_weights: [
          { tag: "ring", weight: 1 },
          { tag: "str_armour", weight: 1 },
          { tag: "default", weight: 0 },
        ],
        generation_weights: [],
        stats: [{ id: "synth_strength", min: 5, max: 8 }],
        text: "UPSTREAM TEXT SHOULD NOT APPEAR",
        name: "Synthetic Brute",
        implicit_tags: [],
        is_essence_only: false,
      },
      SynthStrengthHigh: {
        domain: "item",
        generation_type: "suffix",
        groups: ["Strength"],
        required_level: 11,
        spawn_weights: [
          { tag: "str_armour", weight: 1 },
          { tag: "default", weight: 0 },
        ],
        generation_weights: [],
        stats: [{ id: "synth_strength", min: 9, max: 12 }],
        text: null,
        name: "Synthetic Wrestler",
        implicit_tags: [],
        is_essence_only: false,
      },
      SynthLocal: {
        domain: "item",
        generation_type: "prefix",
        groups: ["SyntheticDefences"],
        required_level: 1,
        spawn_weights: [
          { tag: "str_dex_armour", weight: 1 },
          { tag: "str_dex_int_armour", weight: 1 },
          { tag: "default", weight: 0 },
        ],
        generation_weights: [],
        stats: [
          { id: "synth_armour", min: 9, max: 16 },
          { id: "synth_evasion", min: 6, max: 10 },
        ],
        text: null,
        name: "Synthetic Supple",
        implicit_tags: [],
        is_essence_only: false,
      },
      SynthLife: {
        domain: "item",
        generation_type: "prefix",
        groups: ["SyntheticLife"],
        required_level: 75,
        spawn_weights: [
          { tag: "body_armour", weight: 1 },
          { tag: "default", weight: 0 },
        ],
        generation_weights: [],
        stats: [{ id: "synth_life", min: 190, max: 199 }],
        text: null,
        name: "Synthetic Life",
        implicit_tags: [],
        is_essence_only: false,
      },
      SynthHybrid: {
        domain: "item",
        generation_type: "unique",
        groups: ["HybridStat"],
        required_level: 20,
        spawn_weights: [],
        generation_weights: [],
        stats: [{ id: "synth_hybrid", min: 16, max: 24 }],
        text: "similar strength wording",
        name: "",
        implicit_tags: [],
        is_essence_only: false,
      },
    },
    translations: [
      english("synth_strength", "{0} synthetic strength"),
      english("synth_armour", "{0} synthetic armour"),
      english("synth_evasion", "{0} synthetic evasion"),
    ],
  };
}

function english(id: string, template: string) {
  return {
    ids: [id],
    English: [
      {
        condition: [{ min: null, max: null, negated: null }],
        string: template,
      },
    ],
  };
}

function sourceFrom(
  draft: Draft = syntheticDraft(),
  fetchedAt: string | null = "2026-09-27T00:00:00.000Z",
): RawCraftingSource {
  return {
    commit: draft.commit,
    sourceVersion: draft.sourceVersion,
    fetchedAt,
    files: [],
    bases: draft.bases,
    mods: draft.mods,
    translations: draft.translations,
  };
}

function opened(draft?: Draft) {
  const normalized = normalizeCraftingSource(sourceFrom(draft));
  if (!normalized.ok) {
    throw new Error(normalized.error.message);
  }
  return {
    snapshot: normalized.value,
    indexed: indexCraftingSnapshot(normalized.value),
  };
}

describe("crafting data ingestion", () => {
  it("normalizes a synthetic source without treating it as planner-ready", () => {
    const { snapshot } = opened();
    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.readiness.status).toBe("partial");
    expect(snapshot.compatibility.status).toBe("unknown");
    expect(snapshot.provenance.redistribution).toBe("blocked");
    const gated = requirePlannerCompatibility(snapshot);
    expect(gated.ok).toBe(false);
    if (!gated.ok) {
      expect(gated.error.code).toBe("snapshot-incompatible");
    }
  });

  it("keeps the checksum stable when key order or fetch time changes", () => {
    const first = opened();
    const reversed = syntheticDraft();
    const bases: Record<string, unknown> = {};
    for (const key of Object.keys(reversed.bases).reverse()) {
      bases[key] = reversed.bases[key];
    }
    reversed.bases = bases;
    const second = normalizeCraftingSource(
      sourceFrom(reversed, "2026-09-27T12:00:00.000Z"),
    );
    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }
    expect(second.value.checksum).toBe(first.snapshot.checksum);
    expect(second.value.provenance.fetchedAt).not.toBe(
      first.snapshot.provenance.fetchedAt,
    );
  });

  it("changes the checksum when a source weight changes", () => {
    const before = opened();
    const edited = syntheticDraft();
    const strength = edited.mods.SynthStrength as {
      spawn_weights: { weight: number }[];
    };
    const rule = strength.spawn_weights[0];
    if (!rule) {
      throw new Error("missing spawn rule");
    }
    rule.weight = 2;
    const after = opened(edited);
    expect(after.snapshot.checksum).not.toBe(before.snapshot.checksum);
  });

  it("rejects an unknown generation type instead of dropping the modifier", () => {
    const edited = syntheticDraft();
    (edited.mods.SynthStrength as { generation_type: string }).generation_type =
      "mystery";
    const result = normalizeCraftingSource(sourceFrom(edited));
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("source-schema-invalid");
    expect(result.error.message).toContain("mystery");
  });

  it("rejects an unknown domain and preserves a missing domain as null", () => {
    const unknown = syntheticDraft();
    (unknown.bases[CUIRASS] as { domain: string }).domain = "not-a-domain";
    const rejected = normalizeCraftingSource(sourceFrom(unknown));
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.error.message).toContain("not-a-domain");
    }

    const absent = syntheticDraft();
    delete (absent.bases[CUIRASS] as { domain?: string }).domain;
    const { snapshot } = opened(absent);
    expect(
      snapshot.bases.find((base) => base.id === CUIRASS)?.domain,
    ).toBeNull();
  });

  it("keeps the source string undefined distinct from a missing domain", () => {
    const edited = syntheticDraft();
    (edited.bases[CUIRASS] as { domain: string }).domain = "undefined";
    const { indexed } = opened(edited);
    expect(indexed.baseById.get(CUIRASS)?.domain).toBe("undefined");
    const result = evaluateSourcePool(indexed, {
      baseId: CUIRASS,
      modifierId: "SynthStrength",
      itemLevel: 1,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.status).toBe("unresolved");
    expect(result.value.reason).toBe("domain-not-mapped");
  });

  it("gates item level without treating a sufficient level as eligibility", () => {
    const { indexed } = opened();
    const below = evaluateSourcePool(indexed, {
      baseId: CUIRASS,
      modifierId: "SynthLife",
      itemLevel: 74,
    });
    expect(below.ok).toBe(true);
    if (below.ok) {
      expect(below.value).toMatchObject({
        status: "ineligible",
        reason: "item-level",
      });
    }
    const enough = evaluateSourcePool(indexed, {
      baseId: CUIRASS,
      modifierId: "SynthLife",
      itemLevel: 75,
    });
    expect(enough.ok && enough.value).toMatchObject({
      status: "eligible",
      matchedSpawnTag: "body_armour",
      matchedSpawnWeight: 1,
    });

    const edited = syntheticDraft();
    edited.mods.FlaskGate = {
      domain: "flask",
      generation_type: "prefix",
      groups: ["FlaskGate"],
      required_level: 1,
      spawn_weights: [{ tag: "body_armour", weight: 1 }],
      generation_weights: [],
      stats: [{ id: "flask_gate_stat", min: 1, max: 2 }],
      text: "flask gate",
      name: "Flask Gate",
      implicit_tags: [],
      is_essence_only: false,
    };
    const gated = opened(edited);
    const unresolved = evaluateSourcePool(gated.indexed, {
      baseId: CUIRASS,
      modifierId: "FlaskGate",
      itemLevel: 10,
    });
    expect(unresolved.ok).toBe(true);
    if (unresolved.ok) {
      expect(unresolved.value.reason).toBe("domain-not-mapped");
    }
  });

  it("preserves weight 0 and does not turn a missing weight into 0", () => {
    const { snapshot, indexed } = opened();
    const strength = snapshot.modifiers.find(
      (mod) => mod.id === "SynthStrength",
    );
    expect(strength?.spawnWeightRules.at(-1)).toMatchObject({
      tag: "default",
      weight: 0,
    });
    const wand = evaluateSourcePool(indexed, {
      baseId: WAND,
      modifierId: "SynthStrength",
      itemLevel: 1,
    });
    expect(wand.ok && wand.value).toMatchObject({
      status: "ineligible",
      reason: "spawn-weight-zero",
      matchedSpawnWeight: 0,
    });

    const edited = syntheticDraft();
    const rules = (
      edited.mods.SynthStrength as {
        spawn_weights: { tag: string; weight?: number }[];
      }
    ).spawn_weights;
    const armour = rules.find((rule) => rule.tag === "str_armour");
    if (!armour) {
      throw new Error("missing str_armour rule");
    }
    delete armour.weight;
    const missing = opened(edited);
    const stored = missing.snapshot.modifiers.find(
      (mod) => mod.id === "SynthStrength",
    );
    expect(
      stored?.spawnWeightRules.find((rule) => rule.tag === "str_armour")
        ?.weight,
    ).toBeNull();
    const result = evaluateSourcePool(missing.indexed, {
      baseId: CUIRASS,
      modifierId: "SynthStrength",
      itemLevel: 1,
    });
    expect(result.ok && result.value).toMatchObject({
      status: "unresolved",
      reason: "missing-spawn-weight",
      matchedSpawnWeight: null,
    });
  });

  it("keeps spawn-weight order and multi-stat lines aligned", () => {
    const { snapshot, indexed } = opened();
    const local = snapshot.modifiers.find((mod) => mod.id === "SynthLocal");
    expect(local?.spawnWeightRules.map((rule) => rule.tag)).toEqual([
      "str_dex_armour",
      "str_dex_int_armour",
      "default",
    ]);
    expect(local?.stats.map((stat) => [stat.id, stat.min, stat.max])).toEqual([
      ["synth_armour", 9, 16],
      ["synth_evasion", 6, 10],
    ]);
    const translated = translateModifier(indexed, "SynthLocal");
    expect(translated.ok).toBe(true);
    if (!translated.ok) {
      return;
    }
    expect(translated.value.status).toBe("resolved");
    expect(translated.value.lines.map((line) => line.template)).toEqual([
      "{0} synthetic armour",
      "{0} synthetic evasion",
    ]);
    expect(JSON.stringify(translated.value)).not.toContain("9");
  });

  it("uses source group ids and leaves similar text in a different group", () => {
    const { indexed } = opened();
    const same = shareModifierGroup(
      indexed,
      "SynthStrength",
      "SynthStrengthHigh",
    );
    const different = shareModifierGroup(
      indexed,
      "SynthStrength",
      "SynthHybrid",
    );
    expect(same.ok && same.value).toBe(true);
    expect(different.ok && different.value).toBe(false);
  });

  it("returns ambiguous for a duplicated exact name and does not fuzzy-match", () => {
    const { indexed } = opened();
    const ambiguous = resolveBase(indexed, { name: "Synthetic Coin" });
    expect(ambiguous.ok && ambiguous.value.status).toBe("ambiguous");
    if (ambiguous.ok && ambiguous.value.status === "ambiguous") {
      expect(ambiguous.value.candidateIds).toHaveLength(2);
    }
    const byId = resolveBase(indexed, { id: "synth/coin-a" });
    expect(byId.ok && byId.value.status).toBe("resolved");
    const fuzzy = resolveBase(indexed, { name: "Synthetic" });
    expect(fuzzy.ok && fuzzy.value.status).toBe("not-found");
    const wrongClass = resolveBase(indexed, {
      name: "Synthetic Cuirass",
      itemClass: "Wand",
    });
    expect(wrongClass.ok && wrongClass.value.status).toBe("not-found");
  });

  it("resolves a gear base by exact class and name", () => {
    const { indexed } = opened();
    const resolved = resolveGearBase(indexed, {
      baseName: "Synthetic Cuirass",
      itemClass: "Body Armour",
    });
    expect(resolved.ok && resolved.value.status).toBe("resolved");
  });

  it("treats an empty spawn list as no match once item level is sufficient", () => {
    const { indexed } = opened();
    const result = evaluateSourcePool(indexed, {
      baseId: CUIRASS,
      modifierId: "SynthHybrid",
      itemLevel: 20,
    });
    expect(result.ok && result.value).toMatchObject({
      status: "ineligible",
      reason: "no-matching-spawn-tag",
    });
  });

  it("stores generation weights separately and applies a zero match as ineligible", () => {
    const edited = syntheticDraft();
    (
      edited.mods.SynthStrength as {
        generation_weights: { tag: string; weight: number }[];
      }
    ).generation_weights = [{ tag: "str_armour", weight: 0 }];
    const { snapshot, indexed } = opened(edited);
    const strength = snapshot.modifiers.find(
      (mod) => mod.id === "SynthStrength",
    );
    expect(strength?.generationWeightRules).toEqual([
      { tag: "str_armour", weight: 0, sourceIndex: 0 },
    ]);
    expect(strength?.spawnWeightRules.length).toBeGreaterThan(1);
    const zeroed = evaluateSourcePool(indexed, {
      baseId: CUIRASS,
      modifierId: "SynthStrength",
      itemLevel: 1,
    });
    expect(zeroed.ok && zeroed.value).toMatchObject({
      status: "ineligible",
      reason: "generation-weight-zero",
      matchedSpawnWeight: 1,
      matchedGenerationWeight: 0,
    });

    (
      edited.mods.SynthStrength as {
        generation_weights: { tag: string; weight: number }[];
      }
    ).generation_weights = [{ tag: "wand", weight: 0 }];
    const unmatched = opened(edited);
    const still = evaluateSourcePool(unmatched.indexed, {
      baseId: CUIRASS,
      modifierId: "SynthStrength",
      itemLevel: 1,
    });
    expect(still.ok && still.value.status).toBe("eligible");
  });

  it("queries a source pool without a probability or a recommendation", () => {
    const { indexed } = opened();
    const pool = querySourcePool(indexed, {
      baseId: CUIRASS,
      itemLevel: 1,
      generationType: "suffix",
    });
    expect(pool.ok).toBe(true);
    if (!pool.ok) {
      return;
    }
    expect(pool.value.eligible).toEqual(["SynthStrength"]);
    expect(pool.value.unresolved).toEqual([]);
    expect(pool.value.excludedCount).toBeGreaterThan(0);
    expect(pool.value.warnings[0]).toBe(
      "Source-pool eligibility is not a crafting probability.",
    );
    expect(pool.value).not.toHaveProperty("probability");
    expect(pool.value).not.toHaveProperty("expectedCost");
  });

  it("leaves a dataset diff unclassified", () => {
    const before = opened();
    const edited = syntheticDraft();
    edited.bases["synth/added"] = base("Added Base", "Body Armour", [
      "default",
    ]);
    const after = opened(edited);
    const diff = diffCraftingSnapshots(before.snapshot, after.snapshot);
    expect(diff.basesAdded).toEqual(["synth/added"]);
    expect(diff.safety).toBe("unclassified");
    expect(diff.unknownValuesAdded).toEqual([]);
  });

  it("rejects a snapshot whose checksum was edited", () => {
    const { snapshot } = opened();
    const tampered = {
      ...snapshot,
      checksum: `sha256:${"0".repeat(64)}`,
    };
    const parsed = parseCraftingSnapshot(tampered);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error.code).toBe("snapshot-incompatible");
    }
  });

  it("leaves conditional English unresolved", () => {
    const edited = syntheticDraft();
    edited.translations.push({
      ids: ["flask_gate_stat"],
      English: [
        {
          condition: [{ min: 1, max: null, negated: null }],
          string: "{0} invented flask text",
        },
      ],
    });
    const { indexed } = opened(edited);
    const row = indexed.translationsByStatKey.get("flask_gate_stat");
    expect(row?.status).toBe("unresolved");
    expect(row?.template).toBeNull();
  });
});
