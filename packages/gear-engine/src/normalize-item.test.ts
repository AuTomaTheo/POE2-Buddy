import { describe, expect, it } from "vitest";
import { normalizeGearItem } from "./normalize-item";

describe("item normalization", () => {
  it("keeps the raw item and categorizes a line the semantic map already names", () => {
    const item = normalizeGearItem({
      slot: "Weapon1",
      name: "Sample Wand",
      baseType: "Wand",
      rarity: "Rare",
      rawText: "10% increased [Spell] Damage",
    });

    expect(item).toEqual({
      slot: "Weapon1",
      name: "Sample Wand",
      baseType: "Wand",
      rarity: "Rare",
      rawText: "10% increased [Spell] Damage",
      modifiers: [
        {
          status: "categorized",
          raw: "10% increased [Spell] Damage",
          categories: [
            {
              semanticId: "spell-damage",
              operation: "increased",
              amount: 10,
              unit: "percent",
            },
          ],
        },
      ],
    });
    expect(
      normalizeGearItem({
        slot: "Weapon1",
        name: "Sample Wand",
        baseType: "Wand",
        rarity: "Rare",
        rawText: "10% increased [Spell] Damage",
      }),
    ).toEqual(item);
  });

  it("does not invent a category for plain or unknown modifier text", () => {
    const item = normalizeGearItem({
      slot: "Amulet",
      name: "Sample Amulet",
      baseType: "Gold Amulet",
      rawText: [
        "10% increased Spell Damage",
        "Grants Level 1 Fireball Skill",
      ].join("\n"),
    });

    expect(item.baseType).toBe("Gold Amulet");
    expect(item.modifiers).toEqual([
      {
        status: "unknown",
        raw: "10% increased Spell Damage",
        reason: "unmapped",
      },
      {
        status: "unknown",
        raw: "Grants Level 1 Fireball Skill",
        reason: "unrecognized",
      },
    ]);
  });

  it("uses explicit modifier lines and leaves a label-only fixture item empty", () => {
    expect(
      normalizeGearItem({
        slot: "Weapon1",
        name: "Fixture Wand",
        modifierLines: ["+10 to [Strength]"],
      }),
    ).toMatchObject({
      rawText: null,
      modifiers: [
        {
          status: "categorized",
          raw: "+10 to [Strength]",
          categories: [{ semanticId: "strength", amount: 10, unit: "flat" }],
        },
      ],
    });

    expect(
      normalizeGearItem({
        slot: "Weapon1",
        name: "Fixture Wand",
      }),
    ).toEqual({
      slot: "Weapon1",
      name: "Fixture Wand",
      baseType: null,
      rarity: null,
      rawText: null,
      modifiers: [],
    });
  });
});
