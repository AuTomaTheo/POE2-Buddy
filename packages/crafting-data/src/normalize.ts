import { z } from "zod";
import { checksumSemanticContent } from "./canonical.js";
import {
  craftingFailure,
  craftingSuccess,
  type CraftingResult,
} from "./errors.js";
import {
  semanticContent,
  type BaseItem,
  type CoverageReport,
  type CraftingSnapshot,
  type ModifierRecord,
  type TranslationRecord,
  type WeightRule,
} from "./schema.js";
import {
  CRAFTING_DATA_SCHEMA_VERSION,
  KNOWN_DOMAIN_SET,
  KNOWN_GENERATION_TYPE_SET,
  PARTIAL_READINESS_REASONS,
} from "./version.js";

const rawWeightRuleSchema = z
  .object({
    tag: z.string(),
    weight: z.number().optional(),
  })
  .passthrough();

const rawStatSchema = z
  .object({
    id: z.string().min(1),
    min: z.number(),
    max: z.number(),
  })
  .passthrough();

const rawBaseSchema = z
  .object({
    name: z.string(),
    item_class: z.string(),
    domain: z.string().nullable().optional(),
    tags: z.array(z.string()),
    drop_level: z.number().nullable().optional(),
    requirements: z
      .object({
        level: z.number().nullable().optional(),
        strength: z.number().nullable().optional(),
        dexterity: z.number().nullable().optional(),
        intelligence: z.number().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

const rawModSchema = z
  .object({
    domain: z.string().nullable().optional(),
    generation_type: z.string(),
    groups: z.array(z.string()),
    required_level: z.number(),
    spawn_weights: z.array(rawWeightRuleSchema),
    generation_weights: z.array(rawWeightRuleSchema),
    stats: z.array(rawStatSchema),
    text: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    implicit_tags: z.array(z.string()).optional(),
    is_essence_only: z.boolean().nullable().optional(),
    grants_effects: z.array(z.unknown()).optional(),
  })
  .passthrough();

const rawConditionSchema = z
  .object({
    min: z.number().nullable().optional(),
    max: z.number().nullable().optional(),
    negated: z.boolean().nullable().optional(),
  })
  .passthrough();

const rawEnglishSchema = z
  .object({
    condition: z.array(rawConditionSchema).nullable().optional(),
    string: z.string().nullable().optional(),
  })
  .passthrough();

const rawTranslationSchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1),
    English: z.array(rawEnglishSchema).nullable().optional(),
  })
  .passthrough();

export type RawCraftingSource = {
  commit: string;
  sourceVersion: string;
  fetchedAt: string | null;
  files: { path: string; sha256: string }[];
  bases: Record<string, unknown>;
  mods: Record<string, unknown>;
  translations: unknown[];
};

const UNINTERPRETED_FIELDS = [
  "adds_tags",
  "gold_value",
  "grants_effects",
  "stats_by_file",
  "non-English locales",
  "translation markup and index handlers",
];

export function normalizeCraftingSource(
  source: RawCraftingSource,
): CraftingResult<CraftingSnapshot> {
  if (!source.commit || !source.sourceVersion) {
    return craftingFailure(
      "source-schema-invalid",
      "Crafting source is missing its commit or version label.",
    );
  }

  const bases: BaseItem[] = [];
  let absentBaseDomainCount = 0;
  let sourceStringUndefinedDomainCount = 0;
  for (const id of sortedKeys(source.bases)) {
    const parsed = rawBaseSchema.safeParse(source.bases[id]);
    if (!parsed.success) {
      return craftingFailure(
        "source-schema-invalid",
        `Base ${id} does not match the pinned export shape.`,
      );
    }
    const domainResult = readDomain(parsed.data.domain, `base ${id}`);
    if (!domainResult.ok) {
      return domainResult;
    }
    if (domainResult.value === null) {
      absentBaseDomainCount += 1;
    }
    if (domainResult.value === "undefined") {
      sourceStringUndefinedDomainCount += 1;
    }
    const requirements = parsed.data.requirements;
    bases.push({
      id,
      sourceFile: "data/base_items.json",
      name: parsed.data.name,
      itemClass: parsed.data.item_class,
      domain: domainResult.value,
      tags: parsed.data.tags,
      dropLevel: parsed.data.drop_level ?? null,
      requirements: {
        level: requirements?.level ?? null,
        strength: requirements?.strength ?? null,
        dexterity: requirements?.dexterity ?? null,
        intelligence: requirements?.intelligence ?? null,
      },
    });
  }

  const modifiers: ModifierRecord[] = [];
  let grantsEffectsNotInterpretedCount = 0;
  let emptyStatModifierCount = 0;
  let generationWeightRuleCount = 0;
  let prefixCount = 0;
  let suffixCount = 0;
  let otherGenerationCount = 0;
  for (const id of sortedKeys(source.mods)) {
    const parsed = rawModSchema.safeParse(source.mods[id]);
    if (!parsed.success) {
      return craftingFailure(
        "source-schema-invalid",
        `Modifier ${id} does not match the pinned export shape.`,
      );
    }
    const raw = parsed.data;
    if (!KNOWN_GENERATION_TYPE_SET.has(raw.generation_type)) {
      return craftingFailure(
        "source-schema-invalid",
        `Unknown generation type "${raw.generation_type}" on modifier ${id}. Snapshot was not produced.`,
      );
    }
    const domainResult = readDomain(raw.domain, `modifier ${id}`);
    if (!domainResult.ok) {
      return domainResult;
    }
    const affixKind = affixKindFor(raw.generation_type);
    if (affixKind === "prefix") {
      prefixCount += 1;
    } else if (affixKind === "suffix") {
      suffixCount += 1;
    } else {
      otherGenerationCount += 1;
    }
    if ((raw.grants_effects?.length ?? 0) > 0) {
      grantsEffectsNotInterpretedCount += 1;
    }
    if (raw.stats.length === 0) {
      emptyStatModifierCount += 1;
    }
    generationWeightRuleCount += raw.generation_weights.length;
    modifiers.push({
      id,
      sourceFile: "data/mods.json",
      name: raw.name ?? null,
      domain: domainResult.value,
      generationType: raw.generation_type,
      affixKind,
      groups: raw.groups,
      requiredItemLevel: raw.required_level,
      spawnWeightRules: weightRules(raw.spawn_weights),
      generationWeightRules: weightRules(raw.generation_weights),
      stats: raw.stats.map((stat) => ({
        id: stat.id,
        min: stat.min,
        max: stat.max,
      })),
      sourceText: raw.text ?? null,
      implicitTags: raw.implicit_tags ?? [],
      isEssenceOnly: raw.is_essence_only ?? null,
    });
  }

  const translations = normalizeTranslations(source.translations);
  if (!translations.ok) {
    return translations;
  }

  const coverage: CoverageReport = {
    baseCount: bases.length,
    modifierCount: modifiers.length,
    translationCount: translations.value.length,
    resolvedTranslationCount: translations.value.filter(
      (row) => row.status === "resolved",
    ).length,
    unresolvedTranslationCount: translations.value.filter(
      (row) => row.status === "unresolved",
    ).length,
    prefixCount,
    suffixCount,
    otherGenerationCount,
    absentBaseDomainCount,
    sourceStringUndefinedDomainCount,
    emptyStatModifierCount,
    grantsEffectsNotInterpretedCount,
    generationWeightRuleCount,
  };

  const snapshotWithoutChecksum: Omit<CraftingSnapshot, "checksum"> = {
    schemaVersion: CRAFTING_DATA_SCHEMA_VERSION,
    provenance: {
      provider: "repoe-fork/poe2",
      classification: "community",
      commit: source.commit,
      sourceVersion: source.sourceVersion,
      files: source.files,
      fetchedAt: source.fetchedAt,
      redistribution: "blocked",
    },
    compatibility: {
      status: "unknown",
      sourceGameVersion: source.sourceVersion,
      schemaVersion: CRAFTING_DATA_SCHEMA_VERSION,
      note: `Export label ${source.sourceVersion} is metadata only. It is not compared with passive-tree pin 0.5.5 or PoB tree key 0_5. Scoped planner approval is a separate checksum-bound report.`,
    },
    readiness: {
      status: "partial",
      reasons: [...PARTIAL_READINESS_REASONS],
    },
    bases,
    modifiers,
    translations: translations.value,
    coverage,
    unknownInventory: {
      absentBaseDomainCount,
      sourceStringUndefinedDomainCount,
      uninterpretedFields: UNINTERPRETED_FIELDS,
    },
  };

  const checksum = checksumSemanticContent({
    schemaVersion: snapshotWithoutChecksum.schemaVersion,
    bases: snapshotWithoutChecksum.bases,
    modifiers: snapshotWithoutChecksum.modifiers,
    translations: snapshotWithoutChecksum.translations,
  });

  return craftingSuccess({ ...snapshotWithoutChecksum, checksum });
}

export function spotCheckSourceRecords(
  snapshot: CraftingSnapshot,
  raw: { bases: Record<string, unknown>; mods: Record<string, unknown> },
): CraftingResult<{ checks: string[] }> {
  const checks: string[] = [];
  const cuirassId = "Metadata/Items/Armours/BodyArmours/FourBodyStr1";
  const cuirass = snapshot.bases.find((base) => base.id === cuirassId);
  const rawCuirass = rawBaseSchema.safeParse(raw.bases[cuirassId]);
  if (!cuirass || !rawCuirass.success) {
    return craftingFailure(
      "normalization-failed",
      "Spot check missing Rusted Cuirass.",
    );
  }
  if (
    cuirass.name !== rawCuirass.data.name ||
    cuirass.itemClass !== rawCuirass.data.item_class ||
    !cuirass.tags.includes("str_armour") ||
    cuirass.domain !== "item"
  ) {
    return craftingFailure(
      "normalization-failed",
      "Rusted Cuirass did not match the upstream base record.",
    );
  }
  checks.push("Rusted Cuirass identity, class, domain, and str_armour tag");

  const strength = snapshot.modifiers.find((mod) => mod.id === "Strength1");
  const rawStrength = rawModSchema.safeParse(raw.mods.Strength1);
  if (!strength || !rawStrength.success) {
    return craftingFailure(
      "normalization-failed",
      "Spot check missing Strength1.",
    );
  }
  const lastRule = strength.spawnWeightRules.at(-1);
  const stat = strength.stats[0];
  if (
    strength.requiredItemLevel !== rawStrength.data.required_level ||
    strength.affixKind !== "suffix" ||
    strength.groups.join("|") !== "Strength" ||
    lastRule?.tag !== "default" ||
    lastRule.weight !== 0 ||
    stat?.id !== "additional_strength" ||
    stat.min !== 5 ||
    stat.max !== 8
  ) {
    return craftingFailure(
      "normalization-failed",
      "Strength1 did not match the upstream modifier record.",
    );
  }
  checks.push(
    "Strength1 level, suffix kind, group, zero default weight, and range",
  );

  const local = snapshot.modifiers.find(
    (mod) => mod.id === "LocalBaseArmourAndEvasionRating1",
  );
  if (
    !local ||
    local.stats.map((entry) => entry.id).join("|") !==
      "local_base_physical_damage_reduction_rating|local_base_evasion_rating" ||
    local.stats[0]?.min !== 9 ||
    local.stats[0]?.max !== 16 ||
    local.stats[1]?.min !== 6 ||
    local.stats[1]?.max !== 10 ||
    local.spawnWeightRules
      .map((rule) => `${rule.tag}:${rule.weight}`)
      .join("|") !== "str_dex_armour:1|str_dex_int_armour:1|default:0"
  ) {
    return craftingFailure(
      "normalization-failed",
      "LocalBaseArmourAndEvasionRating1 lost stat order or spawn-weight order.",
    );
  }
  checks.push("LocalBaseArmourAndEvasionRating1 stat order and weight order");

  const life = snapshot.modifiers.find((mod) => mod.id === "IncreasedLife12");
  if (!life || life.requiredItemLevel !== 75 || life.affixKind !== "prefix") {
    return craftingFailure(
      "normalization-failed",
      "IncreasedLife12 item-level gate did not match the upstream record.",
    );
  }
  checks.push("IncreasedLife12 required item level 75");

  const hybrid = snapshot.modifiers.find((mod) => mod.id === "HybridStrDex");
  if (
    !hybrid ||
    hybrid.groups.includes("Strength") ||
    hybrid.affixKind !== "other"
  ) {
    return craftingFailure(
      "normalization-failed",
      "HybridStrDex was grouped or classified from its display text.",
    );
  }
  checks.push("HybridStrDex keeps HybridStat and affix kind other");

  const expected = checksumSemanticContent(semanticContent(snapshot));
  if (snapshot.checksum !== expected) {
    return craftingFailure(
      "normalization-failed",
      "Spot check checksum does not match the normalized records.",
    );
  }
  checks.push("checksum matches semantic records");
  return craftingSuccess({ checks });
}

function normalizeTranslations(
  rows: unknown[],
): CraftingResult<TranslationRecord[]> {
  const byKey = new Map<string, TranslationRecord>();
  for (const row of rows) {
    const parsed = rawTranslationSchema.safeParse(row);
    if (!parsed.success) {
      return craftingFailure(
        "source-schema-invalid",
        "A stat translation row does not match the pinned export shape.",
      );
    }
    const statIds = parsed.data.ids;
    const key = statIds.join("\u0000");
    if (byKey.has(key)) {
      byKey.set(key, unresolvedTranslation(statIds, "duplicate-source-rows"));
      continue;
    }
    byKey.set(key, translationFromEnglish(statIds, parsed.data.English));
  }
  return craftingSuccess(
    [...byKey.values()].sort((left, right) =>
      compareId(left.statIds.join("\u0000"), right.statIds.join("\u0000")),
    ),
  );
}

function translationFromEnglish(
  statIds: string[],
  english: z.infer<typeof rawEnglishSchema>[] | null | undefined,
): TranslationRecord {
  if (!english || english.length === 0) {
    return unresolvedTranslation(statIds, "missing-english");
  }
  const unconditional = english.filter(isUnconditionalTemplate);
  if (unconditional.length !== 1) {
    return unresolvedTranslation(statIds, "conditional-or-ambiguous-english");
  }
  const template = unconditional[0]?.string;
  if (!template) {
    return unresolvedTranslation(statIds, "missing-english-template");
  }
  return {
    statIds,
    locale: "English",
    status: "resolved",
    template,
    unresolvedReason: null,
    sourceFile: "data/stat_translations/stat_descriptions.json",
  };
}

function isUnconditionalTemplate(
  entry: z.infer<typeof rawEnglishSchema>,
): boolean {
  if (!entry.condition || !entry.string) {
    return false;
  }
  return entry.condition.every(
    (condition) =>
      (condition.min === null || condition.min === undefined) &&
      (condition.max === null || condition.max === undefined) &&
      condition.negated !== true,
  );
}

function unresolvedTranslation(
  statIds: string[],
  reason: string,
): TranslationRecord {
  return {
    statIds,
    locale: "English",
    status: "unresolved",
    template: null,
    unresolvedReason: reason,
    sourceFile: "data/stat_translations/stat_descriptions.json",
  };
}

function weightRules(
  rules: z.infer<typeof rawWeightRuleSchema>[],
): WeightRule[] {
  return rules.map((rule, sourceIndex) => ({
    tag: rule.tag,
    weight: rule.weight === undefined ? null : rule.weight,
    sourceIndex,
  }));
}

function readDomain(
  domain: string | null | undefined,
  record: string,
): CraftingResult<string | null> {
  if (domain === undefined || domain === null) {
    return craftingSuccess(null);
  }
  if (!KNOWN_DOMAIN_SET.has(domain)) {
    return craftingFailure(
      "source-schema-invalid",
      `Unknown domain "${domain}" on ${record}. Snapshot was not produced.`,
    );
  }
  return craftingSuccess(domain);
}

function affixKindFor(generationType: string): "prefix" | "suffix" | "other" {
  if (generationType === "prefix") {
    return "prefix";
  }
  if (generationType === "suffix") {
    return "suffix";
  }
  return "other";
}

function sortedKeys(record: Record<string, unknown>): string[] {
  return Object.keys(record).sort(compareId);
}

function compareId(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}
