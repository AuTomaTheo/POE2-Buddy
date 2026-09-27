/**
 * Canonical equipment slots. Provider strings map here only through the table
 * below. Ring 1 and ring 2 stay distinct. Weapon set 2 stays distinct.
 */
export const CANONICAL_GEAR_SLOTS = [
  "main-hand",
  "off-hand",
  "weapon-set-2-main-hand",
  "weapon-set-2-off-hand",
  "helmet",
  "body-armour",
  "gloves",
  "boots",
  "amulet",
  "ring-1",
  "ring-2",
  "ring-3",
  "belt",
  "charm-1",
  "charm-2",
  "charm-3",
  "flask-1",
  "flask-2",
  "arm-1",
  "arm-2",
  "leg-1",
  "leg-2",
  "jewel",
] as const;

export type CanonicalGearSlot = (typeof CANONICAL_GEAR_SLOTS)[number];

/**
 * Slots a primary equipment import is expected to mention.
 * Extra PoB slots are recognized when present and are not reported as missing
 * when the import simply has no charm, flask, or second weapon set.
 */
export const TRACKED_GEAR_SLOTS = [
  "main-hand",
  "off-hand",
  "helmet",
  "body-armour",
  "gloves",
  "boots",
  "amulet",
  "ring-1",
  "ring-2",
  "belt",
] as const satisfies readonly CanonicalGearSlot[];

const SLOT_LABELS: Record<CanonicalGearSlot, string> = {
  "main-hand": "Main hand",
  "off-hand": "Off hand",
  "weapon-set-2-main-hand": "Weapon set 2 main hand",
  "weapon-set-2-off-hand": "Weapon set 2 off hand",
  helmet: "Helmet",
  "body-armour": "Body armour",
  gloves: "Gloves",
  boots: "Boots",
  amulet: "Amulet",
  "ring-1": "Ring 1",
  "ring-2": "Ring 2",
  "ring-3": "Ring 3",
  belt: "Belt",
  "charm-1": "Charm 1",
  "charm-2": "Charm 2",
  "charm-3": "Charm 3",
  "flask-1": "Flask 1",
  "flask-2": "Flask 2",
  "arm-1": "Arm 1",
  "arm-2": "Arm 2",
  "leg-1": "Leg 1",
  "leg-2": "Leg 2",
  jewel: "Jewel",
};

/**
 * Explicit provider slot strings. PoB2 names come from ItemsTab baseSlots and
 * the weapon swap slots. GGG ids are only the ones this repository has stored.
 */
const PROVIDER_SLOTS: Record<string, CanonicalGearSlot> = {
  "Weapon 1": "main-hand",
  Weapon1: "main-hand",
  "Weapon 2": "off-hand",
  "Weapon 1 Swap": "weapon-set-2-main-hand",
  "Weapon 2 Swap": "weapon-set-2-off-hand",
  Helmet: "helmet",
  "Body Armour": "body-armour",
  Gloves: "gloves",
  Boots: "boots",
  Amulet: "amulet",
  "Ring 1": "ring-1",
  "Ring 2": "ring-2",
  "Ring 3": "ring-3",
  Belt: "belt",
  "Charm 1": "charm-1",
  "Charm 2": "charm-2",
  "Charm 3": "charm-3",
  "Flask 1": "flask-1",
  "Flask 2": "flask-2",
  "Arm 1": "arm-1",
  "Arm 2": "arm-2",
  "Leg 1": "leg-1",
  "Leg 2": "leg-2",
  Jewel: "jewel",
};

const SLOT_ORDER = new Map<CanonicalGearSlot, number>(
  CANONICAL_GEAR_SLOTS.map((slot, index) => [slot, index]),
);

export function canonicalGearSlot(
  providerSlot: string,
): CanonicalGearSlot | null {
  return PROVIDER_SLOTS[providerSlot] ?? null;
}

export function gearSlotLabel(
  slot: CanonicalGearSlot | null,
  sourceSlot: string,
): string {
  if (slot === null) return sourceSlot;
  return SLOT_LABELS[slot];
}

export function gearSlotOrder(slot: CanonicalGearSlot | null): number {
  if (slot === null) return CANONICAL_GEAR_SLOTS.length;
  return SLOT_ORDER.get(slot) ?? CANONICAL_GEAR_SLOTS.length;
}
