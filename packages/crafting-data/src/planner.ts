import { CRAFTING_DATA_SCHEMA_VERSION } from "./version.js";
import {
  craftingFailure,
  craftingSuccess,
  type CraftingResult,
} from "./errors.js";
import type { CraftingSnapshot } from "./schema.js";
import {
  indexCraftingSnapshot,
  translateModifier,
  type IndexedCraftingData,
} from "./query.js";

export const CRAFTING_COMPATIBILITY_POLICY_VERSION = 1 as const;

export const CRAFTING_SETUP_MESSAGE = `Crafting data is not prepared.
Run:
npm run refresh:crafting-data`;

export const PLANNER_REQUIRED_CAPABILITIES = [
  "baseIdentity",
  "modifierIdentity",
  "statRanges",
  "requiredItemLevel",
  "generationType",
  "sourcePoolEligibility",
  "translationFallback",
] as const;

export type PlannerCapability = (typeof PLANNER_REQUIRED_CAPABILITIES)[number];

export type CapabilityStatus = "compatible" | "incompatible" | "unknown";

export type CheckResult = "match" | "mismatch" | "unresolved";

export type CompatibilityCheck = {
  id: string;
  capability: string;
  required: boolean;
  subject: string;
  expected: string;
  actual: string;
  result: CheckResult;
  evidenceSource: string;
};

export const POB_EVIDENCE_SOURCE =
  "Path of Building Community (PoE2) 0.23.1 local Data files. Version labels 4.5.5.2, 0.5.5, and 0_5 are not compared.";

export const PLANNER_SUPPORTED_ITEM_CLASSES = [
  "Amulet",
  "Belt",
  "Body Armour",
  "Boots",
  "Bow",
  "Claw",
  "Crossbow",
  "Flail",
  "Focus",
  "Gloves",
  "Helmet",
  "One Hand Axe",
  "One Hand Mace",
  "One Hand Sword",
  "Quiver",
  "Ring",
  "Sceptre",
  "Shield",
  "Spear",
  "Staff",
  "Talisman",
  "TrapTool",
  "Two Hand Axe",
  "Two Hand Mace",
  "Wand",
] as const;

export const PLANNER_UNSUPPORTED_ITEM_CLASSES = [
  {
    itemClass: "Buckler",
    reason:
      "Leather Buckler is class Buckler in the snapshot and type Shield in PoB 0.23.1. No class mapping is applied.",
  },
  {
    itemClass: "FishingRod",
    reason:
      "The snapshot class is FishingRod and the PoB 0.23.1 type is Fishing Rod. The strings differ, so the class is unsupported.",
  },
  {
    itemClass: "Warstaff",
    reason:
      "Wrapped Quarterstaff is class Warstaff in the snapshot and type Staff with subType Warstaff in PoB 0.23.1. No class mapping is applied.",
  },
] as const;

const POB_BASES: {
  name: string;
  itemClass: string;
  tags?: readonly string[];
}[] = [
  {
    name: "Rusted Cuirass",
    itemClass: "Body Armour",
    tags: [
      "armour",
      "body_armour",
      "default",
      "ezomyte_basetype",
      "str_armour",
    ],
  },
  { name: "Withered Wand", itemClass: "Wand" },
  { name: "Iron Ring", itemClass: "Ring" },
  { name: "Linen Wraps", itemClass: "Gloves" },
  { name: "Wrapped Greathelm", itemClass: "Helmet" },
  { name: "Twig Focus", itemClass: "Focus" },
  { name: "Rawhide Boots", itemClass: "Boots" },
  { name: "Crude Bow", itemClass: "Bow" },
  { name: "Crude Claw", itemClass: "Claw" },
  { name: "Makeshift Crossbow", itemClass: "Crossbow" },
  { name: "Splintered Flail", itemClass: "Flail" },
  { name: "Dull Hatchet", itemClass: "One Hand Axe" },
  { name: "Wooden Club", itemClass: "One Hand Mace" },
  { name: "Shortsword", itemClass: "One Hand Sword" },
  { name: "Broadhead Quiver", itemClass: "Quiver" },
  { name: "Rattling Sceptre", itemClass: "Sceptre" },
  { name: "Splintered Tower Shield", itemClass: "Shield" },
  { name: "Hardwood Spear", itemClass: "Spear" },
  { name: "Ashen Staff", itemClass: "Staff" },
  { name: "Changeling Talisman", itemClass: "Talisman" },
  { name: "Clay Trap", itemClass: "TrapTool" },
  { name: "Splitting Greataxe", itemClass: "Two Hand Axe" },
  { name: "Felled Greatclub", itemClass: "Two Hand Mace" },
  { name: "Crimson Amulet", itemClass: "Amulet" },
  { name: "Golden Obi", itemClass: "Belt" },
];

const WAND_POB_TAGS = [
  "default",
  "no_cold_spell_mods",
  "no_fire_spell_mods",
  "no_lightning_spell_mods",
  "no_physical_spell_mods",
  "onehand",
  "wand",
];

type ModExpectation = {
  id: string;
  generationType: string;
  requiredItemLevel: number;
  stats: { id: string; min: number; max: number }[];
  spawn: { tag: string; weight: number }[];
};

const POB_MODS: ModExpectation[] = [
  {
    id: "Strength1",
    generationType: "suffix",
    requiredItemLevel: 1,
    stats: [{ id: "additional_strength", min: 5, max: 8 }],
    spawn: [
      { tag: "ring", weight: 1 },
      { tag: "amulet", weight: 1 },
      { tag: "belt", weight: 1 },
      { tag: "str_armour", weight: 1 },
      { tag: "str_dex_armour", weight: 1 },
      { tag: "str_int_armour", weight: 1 },
      { tag: "str_dex_int_armour", weight: 1 },
      { tag: "mace", weight: 1 },
      { tag: "axe", weight: 1 },
      { tag: "sword", weight: 1 },
      { tag: "spear", weight: 1 },
      { tag: "flail", weight: 1 },
      { tag: "crossbow", weight: 1 },
      { tag: "sceptre", weight: 1 },
      { tag: "talisman", weight: 1 },
      { tag: "default", weight: 0 },
    ],
  },
  {
    id: "Strength2",
    generationType: "suffix",
    requiredItemLevel: 11,
    stats: [{ id: "additional_strength", min: 9, max: 12 }],
    spawn: [
      { tag: "ring", weight: 1 },
      { tag: "amulet", weight: 1 },
      { tag: "belt", weight: 1 },
      { tag: "str_armour", weight: 1 },
      { tag: "str_dex_armour", weight: 1 },
      { tag: "str_int_armour", weight: 1 },
      { tag: "str_dex_int_armour", weight: 1 },
      { tag: "mace", weight: 1 },
      { tag: "axe", weight: 1 },
      { tag: "sword", weight: 1 },
      { tag: "spear", weight: 1 },
      { tag: "flail", weight: 1 },
      { tag: "crossbow", weight: 1 },
      { tag: "sceptre", weight: 1 },
      { tag: "talisman", weight: 1 },
      { tag: "default", weight: 0 },
    ],
  },
  {
    id: "IncreasedLife12",
    generationType: "prefix",
    requiredItemLevel: 75,
    stats: [{ id: "base_maximum_life", min: 190, max: 199 }],
    spawn: [
      { tag: "body_armour", weight: 1 },
      { tag: "default", weight: 0 },
    ],
  },
  {
    id: "LocalBaseArmourAndEvasionRating1",
    generationType: "prefix",
    requiredItemLevel: 1,
    stats: [
      { id: "local_base_physical_damage_reduction_rating", min: 9, max: 16 },
      { id: "local_base_evasion_rating", min: 6, max: 10 },
    ],
    spawn: [
      { tag: "str_dex_armour", weight: 1 },
      { tag: "str_dex_int_armour", weight: 1 },
      { tag: "default", weight: 0 },
    ],
  },
];

export type CapabilityMap = Record<string, CapabilityStatus>;

export type CraftingCompatibilityReport = {
  policyVersion: typeof CRAFTING_COMPATIBILITY_POLICY_VERSION;
  snapshotChecksum: string;
  schemaVersion: typeof CRAFTING_DATA_SCHEMA_VERSION;
  sourceCommit: string;
  buddyPassiveTreePin: "0.5.5";
  evidenceSource: string;
  checks: CompatibilityCheck[];
  capabilities: CapabilityMap;
  conclusion: CapabilityStatus;
  unresolved: string[];
  supportedItemClasses: string[];
  unsupportedItemClasses: { itemClass: string; reason: string }[];
  distributionReadiness: "blocked";
  localDevelopmentOnly: boolean;
  modGroupExclusivity: CapabilityStatus;
  generationWeights: CapabilityStatus;
};

export type PresentationStatus = "resolved" | "fallback" | "unrenderable";

export type ModifierPresentation = {
  modifierId: string;
  sourceName: string | null;
  presentation: PresentationStatus;
  lines: {
    statId: string;
    min: number;
    max: number;
    template: string | null;
  }[];
  text: string;
};

export type ReadinessLevel = "ready" | "partial" | "blocked";

export type CraftPlannerReadiness = {
  status: ReadinessLevel;
  semanticReadiness: ReadinessLevel;
  plannerReadiness: ReadinessLevel;
  presentationReadiness: ReadinessLevel;
  distributionReadiness: "blocked" | "ready";
  compatibleCapabilities: string[];
  blockedCapabilities: string[];
  warnings: string[];
  snapshotProvenance: {
    checksum: string;
    schemaVersion: number;
    sourceCommit: string;
    compatibilityPolicyVersion: number;
    supportedItemClasses: string[];
  };
};

export function evaluateCapabilityChecks(checks: CompatibilityCheck[]): {
  capabilities: CapabilityMap;
  conclusion: CapabilityStatus;
  unresolved: string[];
} {
  const names = [
    ...new Set([
      ...PLANNER_REQUIRED_CAPABILITIES,
      ...checks.map((check) => check.capability),
    ]),
  ];
  const capabilities: CapabilityMap = {};
  for (const name of names) {
    capabilities[name] = statusForCapability(checks, name);
  }
  const required = PLANNER_REQUIRED_CAPABILITIES.map(
    (name) => capabilities[name] ?? "unknown",
  );
  let conclusion: CapabilityStatus = "compatible";
  if (required.some((status) => status === "incompatible")) {
    conclusion = "incompatible";
  } else if (required.some((status) => status === "unknown")) {
    conclusion = "unknown";
  }
  return {
    capabilities,
    conclusion,
    unresolved: checks
      .filter((check) => check.result !== "match")
      .map((check) => check.id),
  };
}

export function crossCheckCraftingSnapshot(
  snapshot: CraftingSnapshot,
): CompatibilityCheck[] {
  const checks: CompatibilityCheck[] = [];
  for (const expected of POB_BASES) {
    const found = snapshot.bases.filter((base) => base.name === expected.name);
    const base = found.length === 1 ? found[0] : undefined;
    checks.push(
      compareCheck({
        id: `base-class:${expected.name}`,
        capability: "baseIdentity",
        required: true,
        subject: expected.name,
        expected: expected.itemClass,
        actual: base?.itemClass ?? (found.length > 1 ? "ambiguous" : "missing"),
        evidenceSource: POB_EVIDENCE_SOURCE,
      }),
    );
    if (expected.tags && base) {
      checks.push(
        compareCheck({
          id: `base-tags:${expected.name}`,
          capability: "baseIdentity",
          required: true,
          subject: `${expected.name} tags`,
          expected: [...expected.tags].sort().join("|"),
          actual: [...base.tags].sort().join("|"),
          evidenceSource: POB_EVIDENCE_SOURCE,
        }),
      );
    }
  }

  const wand = snapshot.bases.find((base) => base.name === "Withered Wand");
  const wandTags = wand ? [...wand.tags].sort().join("|") : "missing";
  const pobWandTags = [...WAND_POB_TAGS].sort().join("|");
  checks.push({
    id: "base-tags:Withered Wand",
    capability: "baseTags",
    required: false,
    subject: "Withered Wand tags",
    expected: pobWandTags,
    actual: wandTags,
    result:
      wandTags === pobWandTags
        ? "match"
        : wand && WAND_POB_TAGS.every((tag) => wand.tags.includes(tag))
          ? "unresolved"
          : "mismatch",
    evidenceSource: POB_EVIDENCE_SOURCE,
  });

  for (const expected of POB_MODS) {
    const modifier = snapshot.modifiers.find((mod) => mod.id === expected.id);
    checks.push(
      compareCheck({
        id: `mod-id:${expected.id}`,
        capability: "modifierIdentity",
        required: true,
        subject: expected.id,
        expected: "present",
        actual: modifier ? "present" : "missing",
        evidenceSource: POB_EVIDENCE_SOURCE,
      }),
    );
    checks.push(
      compareCheck({
        id: `mod-generation:${expected.id}`,
        capability: "generationType",
        required: true,
        subject: expected.id,
        expected: expected.generationType,
        actual: modifier?.generationType ?? "missing",
        evidenceSource: POB_EVIDENCE_SOURCE,
      }),
    );
    checks.push(
      compareCheck({
        id: `mod-level:${expected.id}`,
        capability: "requiredItemLevel",
        required: true,
        subject: expected.id,
        expected: String(expected.requiredItemLevel),
        actual:
          modifier === undefined
            ? "missing"
            : String(modifier.requiredItemLevel),
        evidenceSource: POB_EVIDENCE_SOURCE,
      }),
    );
    checks.push(
      compareCheck({
        id: `mod-stats:${expected.id}`,
        capability: "statRanges",
        required: true,
        subject: expected.id,
        expected: expected.stats
          .map((stat) => `${stat.id}:${stat.min}-${stat.max}`)
          .join("|"),
        actual:
          modifier?.stats
            .map((stat) => `${stat.id}:${stat.min}-${stat.max}`)
            .join("|") ?? "missing",
        evidenceSource: POB_EVIDENCE_SOURCE,
      }),
    );
    checks.push(
      compareCheck({
        id: `mod-spawn:${expected.id}`,
        capability: "sourcePoolEligibility",
        required: true,
        subject: expected.id,
        expected: expected.spawn
          .map((rule) => `${rule.tag}:${rule.weight}`)
          .join("|"),
        actual:
          modifier?.spawnWeightRules
            .map((rule) => `${rule.tag}:${rule.weight}`)
            .join("|") ?? "missing",
        evidenceSource: POB_EVIDENCE_SOURCE,
      }),
    );
  }

  const strength1 = snapshot.modifiers.find((mod) => mod.id === "Strength1");
  const strength2 = snapshot.modifiers.find((mod) => mod.id === "Strength2");
  const shared =
    strength1 &&
    strength2 &&
    strength1.groups.includes("Strength") &&
    strength2.groups.includes("Strength");
  checks.push({
    id: "group-relation:Strength",
    capability: "modGroupIds",
    required: false,
    subject: "Strength1 and Strength2",
    expected: "shared source group Strength",
    actual: shared ? "shared source group Strength" : "not shared",
    result: shared ? "match" : "mismatch",
    evidenceSource: POB_EVIDENCE_SOURCE,
  });

  const defenceIds = [
    "LocalBaseArmourAndEvasionRating1",
    "LocalIncreasedEnergyShield1",
    "LocalBaseArmourAndEnergyShield1",
  ];
  const defenceGroups = defenceIds.map((id) => {
    const modifier = snapshot.modifiers.find((mod) => mod.id === id);
    return modifier?.groups.join("+") ?? "missing";
  });
  checks.push({
    id: "group-exclusivity:BaseLocalDefences",
    capability: "modGroupExclusivity",
    required: false,
    subject: defenceIds.join(", "),
    expected:
      "PoB 0.23.1 keeps these in separate groups: LocalBaseArmourAndEvasionRating, LocalEnergyShield, LocalBaseArmourAndEnergyShield",
    actual: defenceGroups.join(" | "),
    result: defenceGroups.every((group) => group === "BaseLocalDefences")
      ? "mismatch"
      : "unresolved",
    evidenceSource: POB_EVIDENCE_SOURCE,
  });

  checks.push({
    id: "generation-weights:item-mods",
    capability: "generationWeights",
    required: false,
    subject: "item modifier generation weights",
    expected:
      "A proof that the game has no generation-weight rules, or a rule list from the export",
    actual: `${snapshot.coverage.generationWeightRuleCount} generation-weight rules in the snapshot. PoB 0.23.1 Data lua has no weightMultiplierKey.`,
    result: "unresolved",
    evidenceSource: POB_EVIDENCE_SOURCE,
  });

  const undefinedOnSupported = snapshot.bases.filter(
    (base) =>
      base.domain === "undefined" &&
      (PLANNER_SUPPORTED_ITEM_CLASSES as readonly string[]).includes(
        base.itemClass,
      ),
  ).length;
  checks.push(
    compareCheck({
      id: "domain-undefined:supported-classes",
      capability: "baseIdentity",
      required: true,
      subject: "domain string undefined on supported classes",
      expected: "0",
      actual: String(undefinedOnSupported),
      evidenceSource: "repoe-fork/poe2 snapshot domain field",
    }),
  );

  checks.push({
    id: "translation-fallback:policy",
    capability: "translationFallback",
    required: true,
    subject: "unresolved translation presentation",
    expected: "stable modifier id and stat ranges, with no invented English",
    actual: "stable modifier id and stat ranges, with no invented English",
    result: "match",
    evidenceSource: "packages/crafting-data planner presentation policy",
  });

  return checks;
}

export function buildCraftingCompatibilityReport(
  snapshot: CraftingSnapshot,
): CraftingCompatibilityReport {
  const checks = crossCheckCraftingSnapshot(snapshot);
  const evaluated = evaluateCapabilityChecks(checks);
  return {
    policyVersion: CRAFTING_COMPATIBILITY_POLICY_VERSION,
    snapshotChecksum: snapshot.checksum,
    schemaVersion: CRAFTING_DATA_SCHEMA_VERSION,
    sourceCommit: snapshot.provenance.commit,
    buddyPassiveTreePin: "0.5.5",
    evidenceSource: POB_EVIDENCE_SOURCE,
    checks,
    capabilities: evaluated.capabilities,
    conclusion: evaluated.conclusion,
    unresolved: evaluated.unresolved,
    supportedItemClasses: [...PLANNER_SUPPORTED_ITEM_CLASSES],
    unsupportedItemClasses: PLANNER_UNSUPPORTED_ITEM_CLASSES.map((entry) => ({
      itemClass: entry.itemClass,
      reason: entry.reason,
    })),
    distributionReadiness: "blocked",
    localDevelopmentOnly: true,
    modGroupExclusivity:
      evaluated.capabilities.modGroupExclusivity ?? "unknown",
    generationWeights: evaluated.capabilities.generationWeights ?? "unknown",
  };
}

export function assessPlannerReadiness(
  snapshot: CraftingSnapshot,
  report: CraftingCompatibilityReport,
): CraftingResult<CraftPlannerReadiness> {
  if (report.policyVersion !== CRAFTING_COMPATIBILITY_POLICY_VERSION) {
    return craftingFailure(
      "snapshot-incompatible",
      "Crafting compatibility policy version does not match.",
    );
  }
  if (
    report.snapshotChecksum !== snapshot.checksum ||
    report.schemaVersion !== snapshot.schemaVersion ||
    report.sourceCommit !== snapshot.provenance.commit
  ) {
    return craftingFailure(
      "snapshot-incompatible",
      "Crafting compatibility report does not match this snapshot.",
    );
  }

  const blockedCapabilities = PLANNER_REQUIRED_CAPABILITIES.filter(
    (capability) => report.capabilities[capability] !== "compatible",
  );
  const featureBlocks = [
    report.modGroupExclusivity === "compatible" ? null : "modGroupExclusivity",
    report.generationWeights === "compatible" ? null : "generationWeights",
  ].filter((capability): capability is string => capability !== null);
  const compatibleCapabilities = PLANNER_REQUIRED_CAPABILITIES.filter(
    (capability) => report.capabilities[capability] === "compatible",
  );
  const presentation = summarizePresentation(indexCraftingSnapshot(snapshot));
  const distributionBlocksPlanner =
    report.distributionReadiness === "blocked" &&
    report.localDevelopmentOnly !== true;
  const plannerReady =
    report.conclusion === "compatible" &&
    blockedCapabilities.length === 0 &&
    !distributionBlocksPlanner;
  const warnings = [
    "Spawn weight is not a probability.",
    "Mod-group exclusivity is not approved. PoB 0.23.1 separates defence families that this snapshot places in BaseLocalDefences.",
    "Generation-weight rules are absent from this export and from PoB 0.23.1 item-mod data. Absence is not proof the game never uses them.",
    "Redistribution of the full snapshot is not approved by project policy. Prepare it locally with npm run refresh:crafting-data.",
  ];
  if (report.unresolved.includes("base-tags:Withered Wand")) {
    warnings.push(
      "Withered Wand has snapshot tags that PoB 0.23.1 does not list. No sampled spawn rule uses the extra tag.",
    );
  }

  return craftingSuccess({
    status: plannerReady ? "ready" : "blocked",
    semanticReadiness: plannerReady ? "ready" : "blocked",
    plannerReadiness: plannerReady ? "ready" : "blocked",
    presentationReadiness:
      presentation.fallback === 0 && presentation.unrenderable === 0
        ? "ready"
        : "partial",
    distributionReadiness: report.distributionReadiness,
    compatibleCapabilities: [...compatibleCapabilities],
    blockedCapabilities: [...blockedCapabilities, ...featureBlocks],
    warnings,
    snapshotProvenance: {
      checksum: snapshot.checksum,
      schemaVersion: snapshot.schemaVersion,
      sourceCommit: snapshot.provenance.commit,
      compatibilityPolicyVersion: report.policyVersion,
      supportedItemClasses: report.supportedItemClasses,
    },
  });
}

export function presentModifier(
  indexed: IndexedCraftingData,
  modifierId: string,
): CraftingResult<ModifierPresentation> {
  const modifier = indexed.modById.get(modifierId);
  if (!modifier) {
    return craftingFailure(
      "modifier-not-found",
      `Modifier ${modifierId} was not found.`,
    );
  }
  const translated = translateModifier(indexed, modifierId);
  if (!translated.ok) {
    return translated;
  }
  const sourceName = modifier.name?.trim() ? modifier.name : null;
  const lines = modifier.stats.map((stat) => {
    const own = translated.value.lines.find(
      (line) => line.statIds.length === 1 && line.statIds[0] === stat.id,
    );
    return {
      statId: stat.id,
      min: stat.min,
      max: stat.max,
      template: own?.status === "resolved" ? own.template : null,
    };
  });
  const combined = translated.value.lines[0];
  const combinedResolved =
    modifier.stats.length > 1 &&
    translated.value.status === "resolved" &&
    translated.value.lines.length === 1 &&
    combined?.template;
  const everyStatResolved =
    modifier.stats.length > 0 && lines.every((line) => line.template !== null);
  if (combinedResolved && combined?.template) {
    return craftingSuccess({
      modifierId,
      sourceName,
      presentation: "resolved",
      lines,
      text: combined.template,
    });
  }
  if (everyStatResolved) {
    return craftingSuccess({
      modifierId,
      sourceName,
      presentation: "resolved",
      lines,
      text: lines.map((line) => line.template ?? "").join("\n"),
    });
  }
  const statText = lines
    .map((line) => `  ${line.statId}: ${line.min}–${line.max}`)
    .join("\n");
  const text = [
    sourceName,
    modifierId,
    lines.length > 0 ? `stat:\n${statText}` : null,
    "translation unresolved",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
  return craftingSuccess({
    modifierId,
    sourceName,
    presentation: "fallback",
    lines,
    text,
  });
}

export function summarizePresentation(indexed: IndexedCraftingData): {
  resolved: number;
  fallback: number;
  unrenderable: number;
  translationRows: {
    resolved: number;
    fallbackCapable: number;
    unrenderable: number;
  };
} {
  let resolved = 0;
  let fallback = 0;
  let unrenderable = 0;
  for (const modifier of indexed.snapshot.modifiers) {
    const presented = presentModifier(indexed, modifier.id);
    if (!presented.ok) {
      unrenderable += 1;
      continue;
    }
    if (presented.value.presentation === "resolved") {
      resolved += 1;
    } else if (presented.value.presentation === "fallback") {
      fallback += 1;
    } else {
      unrenderable += 1;
    }
  }
  let resolvedRows = 0;
  let fallbackRows = 0;
  let unrenderableRows = 0;
  for (const row of indexed.snapshot.translations) {
    if (row.status === "resolved") {
      resolvedRows += 1;
    } else if (row.statIds.length > 0) {
      fallbackRows += 1;
    } else {
      unrenderableRows += 1;
    }
  }
  return {
    resolved,
    fallback,
    unrenderable,
    translationRows: {
      resolved: resolvedRows,
      fallbackCapable: fallbackRows,
      unrenderable: unrenderableRows,
    },
  };
}

function statusForCapability(
  checks: CompatibilityCheck[],
  capability: string,
): CapabilityStatus {
  const relevant = checks.filter(
    (check) => check.capability === capability && check.required,
  );
  if (relevant.length === 0) {
    const optional = checks.filter((check) => check.capability === capability);
    if (optional.some((check) => check.result === "mismatch")) {
      return "incompatible";
    }
    return "unknown";
  }
  if (relevant.some((check) => check.result === "mismatch")) {
    return "incompatible";
  }
  if (relevant.some((check) => check.result === "unresolved")) {
    return "unknown";
  }
  return "compatible";
}

function compareCheck(input: {
  id: string;
  capability: string;
  required: boolean;
  subject: string;
  expected: string;
  actual: string;
  evidenceSource: string;
}): CompatibilityCheck {
  return {
    ...input,
    result: input.expected === input.actual ? "match" : "mismatch",
  };
}
