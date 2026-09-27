import { createHash } from "node:crypto";

/**
 * Buddy canonical slot to the PoB2 slot control name.
 * A slot that is not in this table is unsupported. Nothing is inferred.
 */
export const ITEM_REPLACEMENT_SLOTS = {
  helmet: "Helmet",
  "body-armour": "Body Armour",
  gloves: "Gloves",
  boots: "Boots",
  amulet: "Amulet",
  "ring-1": "Ring 1",
  "ring-2": "Ring 2",
  belt: "Belt",
  "main-hand": "Weapon 1",
  "off-hand": "Weapon 2",
} as const;

export type ItemReplacementSlot = keyof typeof ITEM_REPLACEMENT_SLOTS;

export const MAX_ITEM_TEXT_CHARS = 65_536;

export type ItemReplacementInput = {
  slot: string;
  rawItemText: string;
  label?: string;
};

export function itemTextChecksum(rawItemText: string): string {
  return `sha256:${createHash("sha256").update(rawItemText).digest("hex")}`;
}

export function pobSlotForReplacement(
  slot: string,
): (typeof ITEM_REPLACEMENT_SLOTS)[ItemReplacementSlot] | null {
  if (!Object.prototype.hasOwnProperty.call(ITEM_REPLACEMENT_SLOTS, slot)) {
    return null;
  }
  return ITEM_REPLACEMENT_SLOTS[slot as ItemReplacementSlot];
}

export function itemReplacementRejection(
  input: ItemReplacementInput,
): "item-invalid" | "item-slot-unsupported" | null {
  if (pobSlotForReplacement(input.slot) === null)
    return "item-slot-unsupported";
  const text = input.rawItemText;
  if (text.trim().length === 0 || text.length > MAX_ITEM_TEXT_CHARS) {
    return "item-invalid";
  }
  if (!text.includes("Rarity:")) return "item-invalid";
  return null;
}
