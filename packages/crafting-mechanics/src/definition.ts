import {
  ADD_RANDOM_EXPLICIT_ID,
  AUGMENTATION_DESCRIPTION,
  AUGMENTATION_DIRECTIONS,
  AUGMENTATION_RECORD_ID,
  CRAFTING_MECHANIC_SEMANTICS_VERSION,
  STATED_RANDOM_MODIFIER_CAP,
} from "./version.js";

export const addRandomExplicitDefinition = {
  id: ADD_RANDOM_EXPLICIT_ID,
  displayName: "Orb of Augmentation",
  semanticsVersion: CRAFTING_MECHANIC_SEMANTICS_VERSION,
  currencyRecordId: AUGMENTATION_RECORD_ID,
  scope: "magic item with fewer than two explicit modifier ids",
  preconditions: {
    rarity: "magic",
    explicitModifierCountBelow: STATED_RANDOM_MODIFIER_CAP,
    itemLevelAtLeast: 1,
  },
  transition: {
    addsExplicitModifiers: 1,
    removesExplicitModifiers: 0,
    rarityAfter: "magic",
    choosesModifier: false,
  },
  candidatePool: {
    status: "partial",
    relationshipToSourcePool:
      "STEP-020 source-pool eligibility is an inspection input. It is not this mechanic's candidate pool.",
    finalSelectionRule: "unproven",
  },
  closure: {
    candidatePoolStatus: "partial",
    conflictRuleStatus: "blocked",
    slotRuleStatus: "unproven",
    spawnWeightStatus: "unproven",
    generationWeightStatus: "unknown",
    selectionRuleStatus: "unproven",
    probabilityStatus: "blocked",
    sameModifierId: "unproven",
    magicAffixStructure: "total-cap-only",
    emptyPoolBehavior: "unknown",
  },
  conflictRules: {
    status: "unavailable",
    sameModifierId: "unproven",
    sameModGroup: "blocked",
    note: "A magic item that already has an explicit modifier id cannot be pooled while mod-group exclusivity is unapproved.",
  },
  weightRules: {
    spawnWeight: "unproven-for-this-currency",
    generationWeight: "unknown",
    formula: "unproven",
  },
  outcomeRules: {
    randomness: "weighted-or-uniform-unknown",
    probabilityStatus: "blocked",
    emptyPoolBehavior: "unknown",
    fullItemConsumption: "unknown",
  },
  unsupportedRules: {
    greaterOrb: "Metadata/Items/Currency/CurrencyAddModToMagic2",
    perfectOrb: "Metadata/Items/Currency/CurrencyAddModToMagic3",
    note: "Greater and Perfect use the same description and directions in this export. Their drop levels differ. No extra tier rule is stated, so they are not this mechanic.",
  },
  provenance: {
    classification: "community-export-of-game-item-text",
    provider: "repoe-fork/poe2",
    commit: "b818b843337cae43b090b272fd98bbc0fd3a34f3",
    sourceVersion: "4.5.5.2",
    file: "data/base_items.json",
    recordId: AUGMENTATION_RECORD_ID,
    description: AUGMENTATION_DESCRIPTION,
    directions: AUGMENTATION_DIRECTIONS,
    observedOn: "2026-09-27",
    pobCommunity: {
      name: "Path of Building Community (PoE2)",
      version: "0.23.1",
      finding:
        "No Augmentation action was found. ItemClass:GetModSpawnWeight walks base tags for spawn weight. That walk is not evidence that this currency samples by spawn weight. A crafted magic item with no stored prefix or suffix limit gets affixLimit 2, and the editor then walks each list for affixLimit / 2 slots. That layout is not this currency's sampler.",
    },
  },
} as const;
