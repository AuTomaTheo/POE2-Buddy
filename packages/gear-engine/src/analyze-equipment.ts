import { createHash } from "node:crypto";
import type { NormalizedItem } from "@poe2-helper/domain";
import { gearItemContext } from "./item-context";
import { parseGearItemText } from "./parse-item";
import type { ParsedGearModifier } from "./parse-modifier";
import {
  canonicalGearSlot,
  gearSlotLabel,
  gearSlotOrder,
  TRACKED_GEAR_SLOTS,
  type CanonicalGearSlot,
} from "./slots";

export const GEAR_NORMALIZATION_VERSION = 3;

export type GearConfidence =
  "complete" | "high" | "partial" | "low" | "insufficient";

export type GearReadinessStatus = "ready" | "partial" | "insufficient";

export type GearDiagnosticCode =
  | "missing-equipment-slot"
  | "unknown-slot"
  | "duplicate-slot"
  | "item-missing-identity"
  | "item-text-unparseable"
  | "low-modifier-coverage"
  | "unknown-modifier-lines"
  | "unknown-locality"
  | "unknown-condition";

export type GearDiagnostic = {
  code: GearDiagnosticCode;
  slot: string | null;
  message: string;
};

export type AnalyzedGearItem = {
  sourceSlot: string;
  canonicalSlot: CanonicalGearSlot | null;
  label: string;
  name: string;
  baseType: string | null;
  rarity: string | null;
  itemLevel: number | null;
  quality: number | null;
  corrupted: boolean;
  rawText: string | null;
  rawTextChecksum: string | null;
  modifiers: readonly ParsedGearModifier[];
  totalModifierLines: number;
  parsedModifierLines: number;
  semanticallyUnderstoodLines: number;
  unsupportedLines: readonly string[];
  understoodSemanticIds: readonly string[];
  structuralCoverage: number | null;
  semanticCoverage: number | null;
  confidence: GearConfidence;
};

export type GearReadiness = {
  status: GearReadinessStatus;
  slotsSeen: readonly string[];
  missingSlots: readonly string[];
  duplicateSlots: readonly string[];
  parsedModifierCount: number;
  unsupportedModifierCount: number;
  semanticCoverage: number | null;
  warnings: readonly string[];
};

export type GearAnalysis = {
  gearNormalizationVersion: typeof GEAR_NORMALIZATION_VERSION;
  provider: string | null;
  sourceChecksum: string | null;
  items: readonly AnalyzedGearItem[];
  readiness: GearReadiness;
  diagnostics: readonly GearDiagnostic[];
};

export type GearAnalysisInput = {
  items: readonly NormalizedItem[];
  provider?: string | null;
  sourceChecksum?: string | null;
};

function ratio(part: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((part / total) * 1000) / 1000;
}

function confidenceFor(understood: number, total: number): GearConfidence {
  if (total === 0) return "insufficient";
  if (understood === total) return "complete";
  const covered = understood / total;
  if (covered >= 0.75) return "high";
  if (understood > 0) return "partial";
  return "low";
}

function checksum(text: string): string {
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

export function analyzeItem(item: NormalizedItem): AnalyzedGearItem {
  const text = parseGearItemText(
    item.rawText,
    gearItemContext(canonicalGearSlot(item.slot)),
  );
  const modifiers = text.modifiers;
  const parsed = modifiers.filter((modifier) => modifier.parsed).length;
  const understood = modifiers.filter(
    (modifier) => modifier.semanticallyUnderstood,
  ).length;
  const unsupported = modifiers
    .filter((modifier) => !modifier.parsed)
    .map((modifier) => modifier.rawText);
  const understoodSemanticIds = modifiers.flatMap((modifier) =>
    modifier.semanticallyUnderstood && modifier.semanticId
      ? [modifier.semanticId]
      : [],
  );
  return {
    sourceSlot: item.slot,
    canonicalSlot: canonicalGearSlot(item.slot),
    label: gearSlotLabel(canonicalGearSlot(item.slot), item.slot),
    name: item.name,
    baseType: item.baseType ?? null,
    rarity: item.rarity ?? text.rarity,
    itemLevel: text.itemLevel,
    quality: text.quality,
    corrupted: text.corrupted,
    rawText: item.rawText ?? null,
    rawTextChecksum: item.rawText ? checksum(item.rawText) : null,
    modifiers,
    totalModifierLines: modifiers.length,
    parsedModifierLines: parsed,
    semanticallyUnderstoodLines: understood,
    unsupportedLines: unsupported,
    understoodSemanticIds,
    structuralCoverage: ratio(parsed, modifiers.length),
    semanticCoverage: ratio(understood, modifiers.length),
    confidence: confidenceFor(understood, modifiers.length),
  };
}

function itemDiagnostics(item: AnalyzedGearItem): GearDiagnostic[] {
  const diagnostics: GearDiagnostic[] = [];
  const slot = item.canonicalSlot ?? item.sourceSlot;
  if (item.canonicalSlot === null) {
    diagnostics.push({
      code: "unknown-slot",
      slot: item.sourceSlot,
      message: `Slot "${item.sourceSlot}" is not a known equipment slot.`,
    });
  }
  if (!item.rawText && !item.rarity) {
    diagnostics.push({
      code: "item-missing-identity",
      slot,
      message: `${item.label} has no raw item text and no rarity.`,
    });
  }
  if (item.modifiers.some((modifier) => modifier.malformedMarker)) {
    diagnostics.push({
      code: "item-text-unparseable",
      slot,
      message: `${item.label} has a modifier marker that could not be read.`,
    });
  }
  if (item.confidence === "low") {
    diagnostics.push({
      code: "low-modifier-coverage",
      slot,
      message: `${item.label} parser coverage is low. That is a parser limit, not an item quality judgment.`,
    });
  }
  if (item.unsupportedLines.length > 0) {
    diagnostics.push({
      code: "unknown-modifier-lines",
      slot,
      message: `${item.label} has ${item.unsupportedLines.length} modifier line${item.unsupportedLines.length === 1 ? "" : "s"} this parser does not understand.`,
    });
  }
  if (
    item.modifiers.some(
      (modifier) => modifier.parsed && modifier.locality === "unknown",
    )
  ) {
    diagnostics.push({
      code: "unknown-locality",
      slot,
      message: `${item.label}: Parsed modifier; item/global scope unresolved.`,
    });
  }
  if (item.modifiers.some((modifier) => modifier.condition !== null)) {
    diagnostics.push({
      code: "unknown-condition",
      slot,
      message: `${item.label} has a conditional modifier. It is not treated as always active.`,
    });
  }
  return diagnostics;
}

export function analyzeEquipment(input: GearAnalysisInput): GearAnalysis {
  const indexed = input.items.map((item, index) => ({
    item: analyzeItem(item),
    index,
  }));
  indexed.sort(
    (left, right) =>
      gearSlotOrder(left.item.canonicalSlot) -
        gearSlotOrder(right.item.canonicalSlot) || left.index - right.index,
  );
  const items = indexed.map((entry) => entry.item);
  const diagnostics = items.flatMap(itemDiagnostics);

  const seen = new Map<string, number>();
  for (const item of items) {
    const key = item.canonicalSlot ?? item.sourceSlot;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const duplicateSlots = [...seen.entries()]
    .filter(([, count]) => count > 1)
    .map(([slot]) => slot);
  for (const slot of duplicateSlots) {
    diagnostics.push({
      code: "duplicate-slot",
      slot,
      message: `More than one item uses ${slot}. Neither item was dropped.`,
    });
  }

  const present = new Set(
    items.flatMap((item) => (item.canonicalSlot ? [item.canonicalSlot] : [])),
  );
  const missingSlots =
    items.length === 0
      ? [...TRACKED_GEAR_SLOTS]
      : TRACKED_GEAR_SLOTS.filter((slot) => !present.has(slot));
  for (const slot of missingSlots) {
    diagnostics.push({
      code: "missing-equipment-slot",
      slot,
      message: `${gearSlotLabel(slot, slot)} is not present in this import.`,
    });
  }

  const parsedModifierCount = items.reduce(
    (total, item) => total + item.parsedModifierLines,
    0,
  );
  const unsupportedModifierCount = items.reduce(
    (total, item) => total + item.unsupportedLines.length,
    0,
  );
  const understood = items.reduce(
    (total, item) => total + item.semanticallyUnderstoodLines,
    0,
  );
  const modifierTotal = items.reduce(
    (total, item) => total + item.totalModifierLines,
    0,
  );
  const status: GearReadinessStatus =
    items.length === 0
      ? "insufficient"
      : diagnostics.length === 0 &&
          items.every(
            (item) =>
              item.confidence === "complete" || item.confidence === "high",
          )
        ? "ready"
        : "partial";

  return {
    gearNormalizationVersion: GEAR_NORMALIZATION_VERSION,
    provider: input.provider ?? null,
    sourceChecksum: input.sourceChecksum ?? null,
    items,
    readiness: {
      status,
      slotsSeen: items.map((item) => item.canonicalSlot ?? item.sourceSlot),
      missingSlots,
      duplicateSlots,
      parsedModifierCount,
      unsupportedModifierCount,
      semanticCoverage: ratio(understood, modifierTotal),
      warnings: diagnostics.map((diagnostic) => diagnostic.message),
    },
    diagnostics,
  };
}

export function assessGearReadiness(input: GearAnalysisInput): GearReadiness {
  return analyzeEquipment(input).readiness;
}
