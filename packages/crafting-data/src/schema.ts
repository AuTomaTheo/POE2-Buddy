import { z } from "zod";
import { checksumSemanticContent } from "./canonical.js";
import {
  craftingFailure,
  craftingSuccess,
  type CraftingResult,
} from "./errors.js";
import { CRAFTING_DATA_SCHEMA_VERSION } from "./version.js";

export const weightRuleSchema = z.object({
  tag: z.string(),
  weight: z.number().nullable(),
  sourceIndex: z.number().int().nonnegative(),
});

export const statRangeSchema = z.object({
  id: z.string().min(1),
  min: z.number(),
  max: z.number(),
});

export const baseItemSchema = z.object({
  id: z.string().min(1),
  sourceFile: z.literal("data/base_items.json"),
  name: z.string(),
  itemClass: z.string(),
  domain: z.string().nullable(),
  tags: z.array(z.string()),
  dropLevel: z.number().nullable(),
  requirements: z.object({
    level: z.number().nullable(),
    strength: z.number().nullable(),
    dexterity: z.number().nullable(),
    intelligence: z.number().nullable(),
  }),
});

export const modifierSchema = z.object({
  id: z.string().min(1),
  sourceFile: z.literal("data/mods.json"),
  name: z.string().nullable(),
  domain: z.string().nullable(),
  generationType: z.string(),
  affixKind: z.enum(["prefix", "suffix", "other"]),
  groups: z.array(z.string()),
  requiredItemLevel: z.number(),
  spawnWeightRules: z.array(weightRuleSchema),
  generationWeightRules: z.array(weightRuleSchema),
  stats: z.array(statRangeSchema),
  sourceText: z.string().nullable(),
  implicitTags: z.array(z.string()),
  isEssenceOnly: z.boolean().nullable(),
});

export const translationSchema = z.object({
  statIds: z.array(z.string().min(1)).min(1),
  locale: z.literal("English"),
  status: z.enum(["resolved", "unresolved"]),
  template: z.string().nullable(),
  unresolvedReason: z.string().nullable(),
  sourceFile: z.literal("data/stat_translations/stat_descriptions.json"),
});

export const coverageReportSchema = z.object({
  baseCount: numberCount(),
  modifierCount: numberCount(),
  translationCount: numberCount(),
  resolvedTranslationCount: numberCount(),
  unresolvedTranslationCount: numberCount(),
  prefixCount: numberCount(),
  suffixCount: numberCount(),
  otherGenerationCount: numberCount(),
  absentBaseDomainCount: numberCount(),
  sourceStringUndefinedDomainCount: numberCount(),
  emptyStatModifierCount: numberCount(),
  grantsEffectsNotInterpretedCount: numberCount(),
  generationWeightRuleCount: numberCount(),
});

export const craftingSnapshotSchema = z.object({
  schemaVersion: z.literal(CRAFTING_DATA_SCHEMA_VERSION),
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  provenance: z.object({
    provider: z.literal("repoe-fork/poe2"),
    classification: z.literal("community"),
    commit: z.string().min(1),
    sourceVersion: z.string().min(1),
    files: z.array(
      z.object({
        path: z.string().min(1),
        sha256: z.string().regex(/^sha256:[a-f0-9]{64}$/),
      }),
    ),
    fetchedAt: z.string().nullable(),
    redistribution: z.literal("blocked"),
  }),
  compatibility: z.object({
    status: z.enum(["compatible", "incompatible", "unknown"]),
    sourceGameVersion: z.string().min(1),
    schemaVersion: z.literal(CRAFTING_DATA_SCHEMA_VERSION),
    note: z.string().min(1),
  }),
  readiness: z.object({
    status: z.enum(["ready", "partial", "incompatible"]),
    reasons: z.array(z.string()),
  }),
  bases: z.array(baseItemSchema),
  modifiers: z.array(modifierSchema),
  translations: z.array(translationSchema),
  coverage: coverageReportSchema,
  unknownInventory: z.object({
    absentBaseDomainCount: numberCount(),
    sourceStringUndefinedDomainCount: numberCount(),
    uninterpretedFields: z.array(z.string()),
  }),
});

function numberCount() {
  return z.number().int().nonnegative();
}

export type WeightRule = z.infer<typeof weightRuleSchema>;
export type StatRange = z.infer<typeof statRangeSchema>;
export type BaseItem = z.infer<typeof baseItemSchema>;
export type ModifierRecord = z.infer<typeof modifierSchema>;
export type TranslationRecord = z.infer<typeof translationSchema>;
export type CoverageReport = z.infer<typeof coverageReportSchema>;
export type CraftingSnapshot = z.infer<typeof craftingSnapshotSchema>;

export function semanticContent(snapshot: CraftingSnapshot) {
  return {
    schemaVersion: snapshot.schemaVersion,
    bases: snapshot.bases,
    modifiers: snapshot.modifiers,
    translations: snapshot.translations,
  };
}

export function parseCraftingSnapshot(
  input: unknown,
): CraftingResult<CraftingSnapshot> {
  const parsed = craftingSnapshotSchema.safeParse(input);
  if (!parsed.success) {
    return craftingFailure(
      "source-schema-invalid",
      "Crafting snapshot does not match schema version 1.",
    );
  }
  const snapshot = parsed.data;
  const expected = checksumSemanticContent(semanticContent(snapshot));
  if (snapshot.checksum !== expected) {
    return craftingFailure(
      "snapshot-incompatible",
      "Crafting snapshot checksum does not match its records.",
    );
  }
  return craftingSuccess(snapshot);
}
