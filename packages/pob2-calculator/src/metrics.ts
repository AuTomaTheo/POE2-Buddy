export const CALCULATOR_ADAPTER_VERSION = 2;
export const CALCULATOR_PROTOCOL_VERSION = 2;

export const ALLOCATION_MODES = [
  "shared",
  "weaponSet1",
  "weaponSet2",
  "weaponSet3",
] as const;

export type AllocationMode = (typeof ALLOCATION_MODES)[number];

export type MetricCategory = "offense" | "defense" | "resource" | "resistance";

export type MetricUnit = "number" | "percent-points";

export type MetricDefinition = {
  id: string;
  label: string;
  sourceField: string;
  category: MetricCategory;
  unit: MetricUnit;
  /** Percent change is emitted only for these metrics, and only when the baseline is positive. */
  percent: boolean;
};

/**
 * Percent change is for magnitudes. Chances, resistances, Spirit, Mana,
 * deflection rating, and crit multiplier stay absolute so a negative
 * resistance is not described as a percentage improvement.
 */
export const METRIC_DEFINITIONS = [
  {
    id: "AverageDamage",
    label: "Average Damage",
    sourceField: "AverageDamage",
    category: "offense",
    unit: "number",
    percent: true,
  },
  {
    id: "AverageHit",
    label: "Average Hit",
    sourceField: "AverageHit",
    category: "offense",
    unit: "number",
    percent: true,
  },
  {
    id: "TotalDPS",
    label: "Total DPS",
    sourceField: "TotalDPS",
    category: "offense",
    unit: "number",
    percent: true,
  },
  {
    id: "CombinedDPS",
    label: "Combined DPS",
    sourceField: "CombinedDPS",
    category: "offense",
    unit: "number",
    percent: true,
  },
  {
    id: "CritChance",
    label: "Crit Chance",
    sourceField: "CritChance",
    category: "offense",
    unit: "percent-points",
    percent: false,
  },
  {
    id: "CritMultiplier",
    label: "Crit Multiplier",
    sourceField: "CritMultiplier",
    category: "offense",
    unit: "number",
    percent: false,
  },
  {
    id: "Speed",
    label: "Speed",
    sourceField: "Speed",
    category: "offense",
    unit: "number",
    percent: true,
  },
  {
    id: "CastRate",
    label: "Cast Rate",
    sourceField: "CastRate",
    category: "offense",
    unit: "number",
    percent: true,
  },
  {
    id: "HitChance",
    label: "Hit Chance",
    sourceField: "HitChance",
    category: "offense",
    unit: "percent-points",
    percent: false,
  },
  {
    id: "Life",
    label: "Life",
    sourceField: "Life",
    category: "defense",
    unit: "number",
    percent: true,
  },
  {
    id: "EnergyShield",
    label: "Energy Shield",
    sourceField: "EnergyShield",
    category: "defense",
    unit: "number",
    percent: true,
  },
  {
    id: "Armour",
    label: "Armour",
    sourceField: "Armour",
    category: "defense",
    unit: "number",
    percent: true,
  },
  {
    id: "Evasion",
    label: "Evasion",
    sourceField: "Evasion",
    category: "defense",
    unit: "number",
    percent: true,
  },
  {
    id: "DeflectionRating",
    label: "Deflection Rating",
    sourceField: "DeflectionRating",
    category: "defense",
    unit: "number",
    percent: false,
  },
  {
    id: "DeflectChance",
    label: "Deflect Chance",
    sourceField: "DeflectChance",
    category: "defense",
    unit: "percent-points",
    percent: false,
  },
  {
    id: "TotalEHP",
    label: "Total EHP",
    sourceField: "TotalEHP",
    category: "defense",
    unit: "number",
    percent: true,
  },
  {
    id: "Mana",
    label: "Mana",
    sourceField: "Mana",
    category: "resource",
    unit: "number",
    percent: false,
  },
  {
    id: "Spirit",
    label: "Spirit",
    sourceField: "Spirit",
    category: "resource",
    unit: "number",
    percent: false,
  },
  {
    id: "FireResist",
    label: "Fire Resistance",
    sourceField: "FireResist",
    category: "resistance",
    unit: "percent-points",
    percent: false,
  },
  {
    id: "ColdResist",
    label: "Cold Resistance",
    sourceField: "ColdResist",
    category: "resistance",
    unit: "percent-points",
    percent: false,
  },
  {
    id: "LightningResist",
    label: "Lightning Resistance",
    sourceField: "LightningResist",
    category: "resistance",
    unit: "percent-points",
    percent: false,
  },
  {
    id: "ChaosResist",
    label: "Chaos Resistance",
    sourceField: "ChaosResist",
    category: "resistance",
    unit: "percent-points",
    percent: false,
  },
] as const satisfies readonly MetricDefinition[];

export type MetricId = (typeof METRIC_DEFINITIONS)[number]["id"];

const BY_SOURCE = new Map<string, MetricDefinition>(
  METRIC_DEFINITIONS.map((definition) => [definition.sourceField, definition]),
);

export function metricDefinition(sourceField: string): MetricDefinition | null {
  return BY_SOURCE.get(sourceField) ?? null;
}

export function allowsPercentDelta(
  definition: MetricDefinition,
  before: number,
): boolean {
  return definition.percent && before > 0;
}
