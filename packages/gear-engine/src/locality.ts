import type { GearSemanticId } from "./families";
import type { GearItemContext } from "./item-context";
import type { GearLocality } from "./families";

/**
 * How a family gets its locality. `contextual` is resolved from item context.
 * `unknown` means this grammar never claims local or global.
 */
export const GEAR_LOCALITY_MODES = ["global", "contextual", "unknown"] as const;

export type GearLocalityMode = (typeof GEAR_LOCALITY_MODES)[number];

/**
 * One record per supported family. Contextual rules live in `resolveGearLocality`,
 * not in the line matcher.
 */
export const GEAR_LOCALITY_RULES: Record<
  GearSemanticId,
  { mode: GearLocalityMode; requiredContext: string }
> = {
  "maximum-life": { mode: "global", requiredContext: "none" },
  "maximum-energy-shield": {
    mode: "contextual",
    requiredContext: "slot category and Energy Shield property",
  },
  "increased-energy-shield": {
    mode: "contextual",
    requiredContext: "slot category and Energy Shield property",
  },
  "fire-resistance": { mode: "global", requiredContext: "none" },
  "cold-resistance": { mode: "global", requiredContext: "none" },
  "lightning-resistance": { mode: "global", requiredContext: "none" },
  "chaos-resistance": { mode: "global", requiredContext: "none" },
  strength: { mode: "global", requiredContext: "none" },
  dexterity: { mode: "global", requiredContext: "none" },
  intelligence: { mode: "global", requiredContext: "none" },
  "movement-speed": { mode: "global", requiredContext: "none" },
  "attack-speed": { mode: "contextual", requiredContext: "weapon slot" },
  "cast-speed": {
    mode: "global",
    requiredContext: "ordinary increased Cast Speed grammar",
  },
  "critical-hit-chance": { mode: "contextual", requiredContext: "weapon slot" },
  "critical-damage-bonus": {
    mode: "contextual",
    requiredContext: "weapon slot",
  },
  "flat-physical-damage": {
    mode: "contextual",
    requiredContext: "weapon slot",
  },
  "flat-fire-damage": { mode: "contextual", requiredContext: "weapon slot" },
  "flat-cold-damage": { mode: "contextual", requiredContext: "weapon slot" },
  "flat-lightning-damage": {
    mode: "contextual",
    requiredContext: "weapon slot",
  },
  "flat-fire-damage-to-attacks": {
    mode: "global",
    requiredContext: "to Attacks wording",
  },
  "increased-physical-damage": {
    mode: "contextual",
    requiredContext: "weapon slot",
  },
  "increased-elemental-damage": {
    mode: "unknown",
    requiredContext:
      "bare wording is unresolved; with Attacks or with Spells is global",
  },
  "increased-projectile-damage": { mode: "global", requiredContext: "none" },
  "projectile-skill-level": { mode: "global", requiredContext: "none" },
  spirit: { mode: "global", requiredContext: "none" },
  accuracy: { mode: "contextual", requiredContext: "weapon slot" },
  armour: { mode: "unknown", requiredContext: "not resolved in this version" },
  "increased-armour": {
    mode: "unknown",
    requiredContext: "not resolved in this version",
  },
  evasion: { mode: "unknown", requiredContext: "not resolved in this version" },
  deflection: {
    mode: "unknown",
    requiredContext: "not resolved in this version",
  },
};

const WEAPON_LOCAL = new Set<GearSemanticId>([
  "attack-speed",
  "critical-hit-chance",
  "critical-damage-bonus",
  "accuracy",
  "flat-physical-damage",
  "flat-fire-damage",
  "flat-cold-damage",
  "flat-lightning-damage",
  "increased-physical-damage",
]);

const ENERGY_SHIELD = new Set<GearSemanticId>([
  "maximum-energy-shield",
  "increased-energy-shield",
]);

export function resolveGearLocality(
  semanticId: GearSemanticId,
  context: GearItemContext,
  rawLine: string,
): GearLocality {
  if (/\bglobal\b/i.test(rawLine)) return "global";
  const mode = GEAR_LOCALITY_RULES[semanticId].mode;
  if (mode === "global") return "global";
  if (mode === "unknown") return "unknown";
  if (WEAPON_LOCAL.has(semanticId)) {
    return context.category === "weapon" ? "local" : "unknown";
  }
  if (ENERGY_SHIELD.has(semanticId))
    return energyShieldLocality(semanticId, context);
  return "unknown";
}

function energyShieldLocality(
  semanticId: GearSemanticId,
  context: GearItemContext,
): GearLocality {
  const bearsEnergyShield = context.baseDefences.energyShield;
  const localDomain =
    (context.category === "armour" || context.category === "off-hand") &&
    bearsEnergyShield;
  if (localDomain) return "local";
  const characterDomain =
    semanticId === "maximum-energy-shield" &&
    (context.category === "jewellery" || context.category === "belt") &&
    !bearsEnergyShield;
  if (characterDomain) return "global";
  return "unknown";
}
