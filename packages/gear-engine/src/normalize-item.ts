import type { NormalizedItem } from "@poe2-helper/domain";
import {
  parsePassiveStatLine,
  semanticPassiveStats,
  type PassiveStatForm,
  type PassiveStatUnit,
} from "@poe2-helper/passive-engine";

export type GearStatCategory = {
  semanticId: string;
  operation: PassiveStatForm;
  amount: number;
  unit: PassiveStatUnit;
};

export type CategorizedGearModifier = {
  status: "categorized";
  raw: string;
  categories: readonly GearStatCategory[];
};

export type UnknownGearModifier = {
  status: "unknown";
  raw: string;
  reason: "unrecognized" | "unmapped";
};

export type GearModifier = CategorizedGearModifier | UnknownGearModifier;

/**
 * Equipped item after classification. `rawText` and each modifier `raw` are
 * the source text. Categories exist only when the passive semantic map already
 * names that line. This is not a slot score.
 */
export type NormalizedGearItem = {
  slot: string;
  name: string;
  baseType: string | null;
  rarity: string | null;
  rawText: string | null;
  modifiers: readonly GearModifier[];
};

export type GearItemInput = NormalizedItem & {
  modifierLines?: readonly string[];
};

export function normalizeGearItem(item: GearItemInput): NormalizedGearItem {
  return {
    slot: item.slot,
    name: item.name,
    baseType: item.baseType ?? null,
    rarity: item.rarity ?? null,
    rawText: item.rawText ?? null,
    modifiers: modifierLines(item).map(classifyModifier),
  };
}

export function normalizeGearItems(
  items: readonly GearItemInput[],
): NormalizedGearItem[] {
  return items.map(normalizeGearItem);
}

function modifierLines(item: GearItemInput): string[] {
  const source = item.modifierLines ?? item.rawText?.split(/\r?\n/) ?? [];
  return source.map((line) => line.trim()).filter((line) => line.length > 0);
}

function classifyModifier(raw: string): GearModifier {
  const line = parsePassiveStatLine(raw);
  const semantic = semanticPassiveStats(line);
  if (!semantic) {
    return {
      status: "unknown",
      raw,
      reason: line.status === "recognized" ? "unmapped" : "unrecognized",
    };
  }
  return {
    status: "categorized",
    raw,
    categories: semantic.map((stat) => ({
      semanticId: stat.semanticId,
      operation: stat.operation,
      amount: stat.amount,
      unit: stat.unit,
    })),
  };
}
