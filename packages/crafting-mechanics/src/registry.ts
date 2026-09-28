import { z } from "zod";

import { addRandomExplicitDefinition } from "./definition.js";
import { ADD_RANDOM_EXPLICIT_ID } from "./version.js";

export const SIMULATION_SNAPSHOT_CHECKSUM =
  "sha256:dbfd7c4286e1e340a180ef91cdab621e5b5b612faccfc8688376da2bc6b610a8" as const;

export const SIMULATION_SOURCE_COMMIT =
  "b818b843337cae43b090b272fd98bbc0fd3a34f3" as const;

export const SIMULATION_DECISION =
  "NO CRAFTING MECHANIC IS CURRENTLY SAFE TO SIMULATE" as const;

const readinessSchema = z.enum([
  "ready-for-simulation",
  "ready-for-transition-only",
  "partial",
  "blocked",
]);

const mechanicRowSchema = z
  .object({
    mechanicId: z.string(),
    displayName: z.string(),
    currencyRecordId: z.string(),
    semanticsVersion: z.number().int().nullable(),
    readiness: readinessSchema,
    transition: z.enum(["ready", "partial", "blocked"]),
    pool: z.enum(["ready", "partial", "blocked"]),
    conflict: z.enum(["ready", "blocked", "unproven", "not-required"]),
    weight: z.enum(["ready", "unproven", "unknown", "not-applicable"]),
    probabilityStatus: z.enum(["ready", "blocked", "not-required"]),
    selection: z.enum([
      "unproven",
      "deterministic",
      "deterministic-incomplete",
    ]),
    supportedScope: z.string(),
    realItemState: z.literal("blocked"),
    sourceQuality: z.string(),
    decision: z.literal("not-selected"),
  })
  .strict();

export const simulationRegistrySchema = z
  .object({
    ok: z.literal(true),
    decision: z.literal(SIMULATION_DECISION),
    selectedMechanicId: z.null(),
    step021: z.literal("BLOCKED"),
    binding: z
      .object({
        snapshotChecksum: z.literal(SIMULATION_SNAPSHOT_CHECKSUM),
        sourceCommit: z.literal(SIMULATION_SOURCE_COMMIT),
        compatibilityPolicyVersion: z.literal(1),
        observedOn: z.literal("2026-09-27"),
      })
      .strict(),
    mechanics: z.array(mechanicRowSchema).min(1),
    newEvidence: z
      .array(
        z
          .object({
            sourceName: z.string(),
            sourceType: z.string(),
            authority: z.literal("community"),
            observedOn: z.literal("2026-09-27"),
            locator: z.string(),
            addsBeyondStep0206: z.string(),
            closesAugmentationGaps: z.literal(false),
          })
          .strict(),
      )
      .min(1),
    blockers: z.array(z.string()).min(1),
  })
  .strict();

export const simulationProvenanceErrorSchema = z
  .object({
    ok: z.literal(false),
    code: z.literal("provenance-mismatch"),
    message: z.string(),
  })
  .strict();

const COMPARED_CURRENCIES = [
  {
    mechanicId: "upgrade-to-magic",
    displayName: "Orb of Transmutation",
    currencyRecordId: "Metadata/Items/Currency/CurrencyUpgradeToMagic",
    description:
      "Upgrades a [ItemRarity|Normal] item to a [ItemRarity|Magic] item with 1 modifier",
    directions:
      "Right click this item then left click a normal item to apply it.",
    readiness: "partial",
    transition: "partial",
    pool: "blocked",
    conflict: "not-required",
    weight: "unproven",
    probability: "blocked",
    selection: "unproven",
    supportedScope: "normal item; the added modifier is not named",
    sourceQuality: "pinned export item text only",
    reason:
      "The record states a normal-to-magic change and one modifier. It does not name that modifier or a selection rule.",
  },
  {
    mechanicId: "upgrade-magic-to-rare",
    displayName: "Regal Orb",
    currencyRecordId: "Metadata/Items/Currency/CurrencyUpgradeMagicToRare",
    description:
      "Upgrades a [ItemRarity|Magic] item to a [ItemRarity|Rare] item, adding 1 modifier",
    directions:
      "Right click this item then left click a magic item to apply it. Current modifiers are retained and a new one is added.",
    readiness: "partial",
    transition: "partial",
    pool: "blocked",
    conflict: "blocked",
    weight: "unproven",
    probability: "blocked",
    selection: "unproven",
    supportedScope: "magic item; existing modifiers are said to be retained",
    sourceQuality: "pinned export item text only",
    reason:
      "The rarity change and the retention sentence are stated. The added modifier's pool and the conflict rule for the retained modifiers are not.",
  },
  {
    mechanicId: "add-random-to-rare",
    displayName: "Exalted Orb",
    currencyRecordId: "Metadata/Items/Currency/CurrencyAddModToRare",
    description: "Augments a [ItemRarity|Rare] item with a new random modifier",
    directions:
      "Right click this item then left click a rare item to apply it. Rare items can have up to six random modifiers.",
    readiness: "partial",
    transition: "partial",
    pool: "blocked",
    conflict: "blocked",
    weight: "unproven",
    probability: "blocked",
    selection: "unproven",
    supportedScope: "rare item under a stated cap of six random modifiers",
    sourceQuality: "pinned export item text only",
    reason:
      "The record has the same missing pool and weight as Augmentation, with a larger cap and more existing modifiers.",
  },
  {
    mechanicId: "reroll-rare",
    displayName: "Chaos Orb",
    currencyRecordId: "Metadata/Items/Currency/CurrencyRerollRare",
    description:
      "Removes a random modifier and augments a [ItemRarity|Rare] item with a new random modifier",
    directions:
      "Right click this item then left click a rare item to apply it.",
    readiness: "blocked",
    transition: "blocked",
    pool: "blocked",
    conflict: "blocked",
    weight: "unproven",
    probability: "blocked",
    selection: "unproven",
    supportedScope: "rare item; one removal and one addition",
    sourceQuality: "pinned export item text only",
    reason:
      "The record describes two random changes. Neither the removed modifier nor the added modifier has a proven selection rule.",
  },
  {
    mechanicId: "essence-life",
    displayName: "Essence of the Body",
    currencyRecordId: "Metadata/Items/Currency/CurrencyEssenceLife",
    description:
      "Upgrades a [ItemRarity|Magic] item to a [ItemRarity|Rare] item, adding a guaranteed modifier",
    directions:
      "Right click this item then left click a Magic item to apply it.",
    readiness: "blocked",
    transition: "partial",
    pool: "blocked",
    conflict: "blocked",
    weight: "not-applicable",
    probability: "blocked",
    selection: "deterministic-incomplete",
    supportedScope: "magic item; the guaranteed modifier id is not named",
    sourceQuality: "pinned export item text; modifier name match is not unique",
    reason:
      "Four monster-domain records share the display name Essence of the Body and have no stats. The currency record does not point at one item modifier id.",
  },
  {
    mechanicId: "remove-all-modifiers",
    displayName: "Orb of Scouring",
    currencyRecordId: "Metadata/Items/Currency/CurrencyConvertToNormal",
    description: "Removes all modifiers from an item",
    directions:
      "Right click this item then left click on a magic or rare item to apply it.",
    readiness: "partial",
    transition: "partial",
    pool: "blocked",
    conflict: "not-required",
    weight: "not-applicable",
    probability: "not-required",
    selection: "deterministic-incomplete",
    supportedScope: "magic or rare item; resulting rarity is unstated",
    sourceQuality: "pinned export item text only",
    reason:
      "The record says it removes all modifiers. It does not state the resulting rarity, and it does not separate implicit modifiers from explicit modifiers. The metadata id is not a rarity rule.",
  },
  {
    mechanicId: "remove-random-modifier",
    displayName: "Orb of Annulment",
    currencyRecordId: "Metadata/Items/Currency/CurrencyRemoveMod",
    description: "Removes a random modifier from an item",
    directions:
      "Right click this item then left click on a magic or rare item to apply it.",
    readiness: "blocked",
    transition: "partial",
    pool: "blocked",
    conflict: "blocked",
    weight: "unproven",
    probability: "blocked",
    selection: "unproven",
    supportedScope: "magic or rare item; which modifier is removed is unstated",
    sourceQuality: "pinned export item text only",
    reason:
      "The record says the removed modifier is random. It does not say whether that draw is uniform, and it does not separate implicit modifiers from explicit modifiers.",
  },
  {
    mechanicId: "upgrade-to-rare",
    displayName: "Orb of Alchemy",
    currencyRecordId: "Metadata/Items/Currency/CurrencyUpgradeToRare",
    description:
      "Upgrades a [ItemRarity|Normal] or [ItemRarity|Magic] item to a [ItemRarity|Rare] item with 4 random modifiers",
    directions:
      "Right click this item then left click a normal or magic item to apply it. Current modifiers are not retained.",
    readiness: "partial",
    transition: "partial",
    pool: "blocked",
    conflict: "not-required",
    weight: "unproven",
    probability: "blocked",
    selection: "unproven",
    supportedScope:
      "normal or magic item; four random modifiers replace current modifiers",
    sourceQuality: "pinned export item text only",
    reason:
      "The rarity change, the count of four, and the removal of current modifiers are stated. The modifier pool and the selection rule are not.",
  },
] as const;

export const comparedCurrencyTexts = COMPARED_CURRENCIES.map((row) => ({
  currencyRecordId: row.currencyRecordId,
  description: row.description,
  directions: row.directions,
}));

export const essenceBodyNameRecords = [
  "MonsterLesserEssenceModLife1",
  "MonsterEssenceModLife1",
  "MonsterGreaterEssenceModLife1",
  "MonsterPerfectEssenceModLife1",
] as const;

function augmentationRow() {
  return {
    mechanicId: ADD_RANDOM_EXPLICIT_ID,
    displayName: addRandomExplicitDefinition.displayName,
    currencyRecordId: addRandomExplicitDefinition.currencyRecordId,
    semanticsVersion: addRandomExplicitDefinition.semanticsVersion,
    readiness: "ready-for-transition-only" as const,
    transition: "ready" as const,
    pool: addRandomExplicitDefinition.closure.candidatePoolStatus,
    conflict: "blocked" as const,
    weight: "unproven" as const,
    selection: "unproven" as const,
    probabilityStatus: addRandomExplicitDefinition.closure.probabilityStatus,
    supportedScope:
      "magic item with zero explicit modifier ids; transition only",
    realItemState: "blocked" as const,
    sourceQuality:
      "pinned export item text plus STEP-020.6 closure; new weight sources do not close the pool",
    decision: "not-selected" as const,
  };
}

export function assessSimulationRegistry(binding: {
  snapshotChecksum: string;
  sourceCommit: string;
}):
  | z.infer<typeof simulationRegistrySchema>
  | z.infer<typeof simulationProvenanceErrorSchema> {
  if (
    binding.snapshotChecksum !== SIMULATION_SNAPSHOT_CHECKSUM ||
    binding.sourceCommit !== SIMULATION_SOURCE_COMMIT
  ) {
    return simulationProvenanceErrorSchema.parse({
      ok: false,
      code: "provenance-mismatch",
      message:
        "The simulation registry does not match this snapshot checksum or source commit.",
    });
  }
  const mechanics = [
    augmentationRow(),
    ...COMPARED_CURRENCIES.map((row) => ({
      mechanicId: row.mechanicId,
      displayName: row.displayName,
      currencyRecordId: row.currencyRecordId,
      semanticsVersion: null,
      readiness: row.readiness,
      transition: row.transition,
      pool: row.pool,
      conflict: row.conflict,
      weight: row.weight,
      probabilityStatus: row.probability,
      selection: row.selection,
      supportedScope: row.supportedScope,
      realItemState: "blocked" as const,
      sourceQuality: row.sourceQuality,
      decision: "not-selected" as const,
    })),
  ];
  return simulationRegistrySchema.parse({
    ok: true,
    decision: SIMULATION_DECISION,
    selectedMechanicId: null,
    step021: "BLOCKED",
    binding: {
      snapshotChecksum: SIMULATION_SNAPSHOT_CHECKSUM,
      sourceCommit: SIMULATION_SOURCE_COMMIT,
      compatibilityPolicyVersion: 1,
      observedOn: "2026-09-27",
    },
    mechanics,
    newEvidence: [
      {
        sourceName: "PoE2DB weightings",
        sourceType: "community database page",
        authority: "community",
        observedOn: "2026-09-27",
        locator: "https://poe2db.tw/us/weightings",
        addsBeyondStep0206:
          "The page states that weight information cannot be obtained from the game file. Listed weights are compiled with recombinators, or from trade listings for bases that cannot be recombined.",
        closesAugmentationGaps: false,
      },
      {
        sourceName: "Craft of Exile PoE2 weightings",
        sourceType: "community crafting tool page",
        authority: "community",
        observedOn: "2026-09-27",
        locator: "https://www.craftofexile.com/weightings?game=poe2",
        addsBeyondStep0206:
          "The page states that modifier weightings are not part of the Path of Exile 2 game client. The listed method is recombinators, trade-site parsing, and a normalization script. It also says the numbers can be wrong and can change after a patch.",
        closesAugmentationGaps: false,
      },
      {
        sourceName: "pyoe2-craftpath",
        sourceType: "open-source crafting implementation",
        authority: "community",
        observedOn: "2026-09-27",
        locator:
          "https://github.com/WladHD/pyoe2-craftpath MIT; README on main; Augmentation propagator commit 8acb17c0bac048d0a16f780f71313aef4bb4a2af",
        addsBeyondStep0206:
          "The README says the tool targets PoE2 0.4.0 and fetches affix weights from Craft of Exile. Its Augmentation propagator uses minimum item levels 55 and 70 for Greater and Perfect. This export's Greater and Perfect drop levels are 46 and 72, and the item text states no tier rule. The README also says unknown desecration weights are treated as 1. None of that is adopted.",
        closesAugmentationGaps: false,
      },
    ],
    blockers: [
      "No compared mechanic has a proven candidate pool and a proven selection rule together.",
      "PoE2DB and Craft of Exile say modifier weights are not in the game files. Their extrapolated numbers are not used.",
      "pyoe2-craftpath targets PoE2 0.4.0, reads Craft of Exile weights, and applies Greater and Perfect level gates that this export's item text does not state.",
      "Essence of the Body has four monster-domain name matches and no currency-to-modifier id link.",
      "Orb of Scouring states a removal and does not state the resulting rarity.",
      "Imported gear still has no crafting modifier ids, so CraftingItemState stays manual even after a mechanic is ready.",
    ],
  });
}

export function evaluateMechanicScope(
  binding: { snapshotChecksum: string; sourceCommit: string },
  mechanicId: string,
  state: { rarity: string; explicitModifierCount: number },
):
  | {
      ok: true;
      inScope: boolean;
      readiness: z.infer<typeof readinessSchema>;
      simulatable: false;
    }
  | z.infer<typeof simulationProvenanceErrorSchema>
  | { ok: false; code: "unknown-mechanic"; message: string } {
  const registry = assessSimulationRegistry(binding);
  if (!registry.ok) {
    return registry;
  }
  const row = registry.mechanics.find(
    (mechanic) => mechanic.mechanicId === mechanicId,
  );
  if (!row) {
    return {
      ok: false,
      code: "unknown-mechanic",
      message: `Mechanic ${mechanicId} is not in the simulation registry.`,
    };
  }
  const inScope =
    mechanicId === ADD_RANDOM_EXPLICIT_ID &&
    state.rarity === "magic" &&
    state.explicitModifierCount === 0;
  return {
    ok: true,
    inScope,
    readiness: inScope ? row.readiness : "blocked",
    simulatable: false,
  };
}
