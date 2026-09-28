export const UPGRADE_ENGINE_VERSION = 2;
export const MAX_UPGRADE_CANDIDATES = 10;

/**
 * Higher is better, and the calculator already emits a percent delta for each.
 * Resistances and chances stay visible on a result but are not ranked: a
 * percentage-point change is not a price efficiency.
 */
export const RANKABLE_METRIC_IDS = [
  "TotalDPS",
  "CombinedDPS",
  "AverageHit",
  "Life",
  "EnergyShield",
  "TotalEHP",
  "Armour",
  "Evasion",
] as const;

export type RankableMetricId = (typeof RANKABLE_METRIC_IDS)[number];

export const RANKABLE_METRIC_LABELS: Record<RankableMetricId, string> = {
  TotalDPS: "Total DPS",
  CombinedDPS: "Combined DPS",
  AverageHit: "Average Hit",
  Life: "Life",
  EnergyShield: "Energy Shield",
  TotalEHP: "Total EHP",
  Armour: "Armour",
  Evasion: "Evasion",
};

export const PRICE_CURRENCIES = ["chaos", "divine"] as const;
export type PriceCurrency = (typeof PRICE_CURRENCIES)[number];

export type MeasuredMetricUnit = "number" | "percent-points";
export type MeasuredMetricCategory =
  "offense" | "defense" | "resource" | "resistance";

/**
 * Display names for calculator metrics. This catalog does not decide order.
 * A metric can be visible here and still be excluded from RANKABLE_METRIC_IDS.
 */
export const VISIBLE_METRIC_DISPLAY: Record<
  string,
  { label: string; unit: MeasuredMetricUnit; category: MeasuredMetricCategory }
> = {
  AverageDamage: {
    label: "Average Damage",
    unit: "number",
    category: "offense",
  },
  AverageHit: { label: "Average Hit", unit: "number", category: "offense" },
  TotalDPS: { label: "Total DPS", unit: "number", category: "offense" },
  CombinedDPS: { label: "Combined DPS", unit: "number", category: "offense" },
  CritChance: {
    label: "Crit Chance",
    unit: "percent-points",
    category: "offense",
  },
  CritMultiplier: {
    label: "Crit Multiplier",
    unit: "number",
    category: "offense",
  },
  Speed: { label: "Speed", unit: "number", category: "offense" },
  CastRate: { label: "Cast Rate", unit: "number", category: "offense" },
  HitChance: {
    label: "Hit Chance",
    unit: "percent-points",
    category: "offense",
  },
  Life: { label: "Life", unit: "number", category: "defense" },
  EnergyShield: { label: "Energy Shield", unit: "number", category: "defense" },
  Armour: { label: "Armour", unit: "number", category: "defense" },
  Evasion: { label: "Evasion", unit: "number", category: "defense" },
  DeflectionRating: {
    label: "Deflection Rating",
    unit: "number",
    category: "defense",
  },
  DeflectChance: {
    label: "Deflect Chance",
    unit: "percent-points",
    category: "defense",
  },
  TotalEHP: { label: "Total EHP", unit: "number", category: "defense" },
  Mana: { label: "Mana", unit: "number", category: "resource" },
  Spirit: { label: "Spirit", unit: "number", category: "resource" },
  FireResist: {
    label: "Fire Resistance",
    unit: "percent-points",
    category: "resistance",
  },
  ColdResist: {
    label: "Cold Resistance",
    unit: "percent-points",
    category: "resistance",
  },
  LightningResist: {
    label: "Lightning Resistance",
    unit: "percent-points",
    category: "resistance",
  },
  ChaosResist: {
    label: "Chaos Resistance",
    unit: "percent-points",
    category: "resistance",
  },
};

export function isRankableMetric(value: string): value is RankableMetricId {
  return (RANKABLE_METRIC_IDS as readonly string[]).includes(value);
}

export function isPriceCurrency(value: string): value is PriceCurrency {
  return (PRICE_CURRENCIES as readonly string[]).includes(value);
}
