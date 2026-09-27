import type { CanonicalGearSlot } from "./slots";

export type GearItemCategory =
  "weapon" | "off-hand" | "armour" | "jewellery" | "belt" | "other" | "unknown";

export type GearBaseDefences = {
  armour: boolean;
  evasion: boolean;
  energyShield: boolean;
  deflection: boolean;
};

export type GearItemContext = {
  canonicalSlot: CanonicalGearSlot | null;
  category: GearItemCategory;
  baseDefences: GearBaseDefences;
};

const SLOT_CATEGORY: Record<CanonicalGearSlot, GearItemCategory> = {
  "main-hand": "weapon",
  "weapon-set-2-main-hand": "weapon",
  "off-hand": "off-hand",
  "weapon-set-2-off-hand": "off-hand",
  helmet: "armour",
  "body-armour": "armour",
  gloves: "armour",
  boots: "armour",
  amulet: "jewellery",
  "ring-1": "jewellery",
  "ring-2": "jewellery",
  "ring-3": "jewellery",
  belt: "belt",
  "charm-1": "other",
  "charm-2": "other",
  "charm-3": "other",
  "flask-1": "other",
  "flask-2": "other",
  "arm-1": "other",
  "arm-2": "other",
  "leg-1": "other",
  "leg-2": "other",
  jewel: "unknown",
};

export function emptyBaseDefences(): GearBaseDefences {
  return {
    armour: false,
    evasion: false,
    energyShield: false,
    deflection: false,
  };
}

export function gearItemContext(
  slot: CanonicalGearSlot | null,
): GearItemContext {
  return {
    canonicalSlot: slot,
    category: slot === null ? "unknown" : SLOT_CATEGORY[slot],
    baseDefences: emptyBaseDefences(),
  };
}

export function noteBaseDefence(line: string, context: GearItemContext): void {
  if (/^Energy Shield:\s*\d/.test(line))
    context.baseDefences.energyShield = true;
  if (/^Armour:\s*\d/.test(line)) context.baseDefences.armour = true;
  if (/^Evasion(?: Rating)?:\s*\d/.test(line))
    context.baseDefences.evasion = true;
  if (/^Deflection(?: Rating)?:\s*\d/.test(line)) {
    context.baseDefences.deflection = true;
  }
}
