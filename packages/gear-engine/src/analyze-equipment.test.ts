import { describe, expect, it } from "vitest";
import type { NormalizedItem } from "@poe2-helper/domain";
import {
  analyzeEquipment,
  analyzeItem,
  GEAR_MODIFIER_FAMILIES,
  GEAR_NORMALIZATION_VERSION,
  parseGearModifier,
} from "./index";

function item(
  partial: Partial<NormalizedItem> & Pick<NormalizedItem, "slot" | "name">,
): NormalizedItem {
  return {
    slot: partial.slot,
    name: partial.name,
    ...(partial.baseType ? { baseType: partial.baseType } : {}),
    ...(partial.rarity ? { rarity: partial.rarity } : {}),
    ...(partial.rawText ? { rawText: partial.rawText } : {}),
  };
}

const helmet = `Rarity: RARE
Ash Hood
Wrapped Greathelm
Item Level: 20
Quality: 10
--------
Armour: 40
--------
Implicits: 1
+10 to Intelligence
--------
+100 to maximum Life
+30% to Fire Resistance
+12% to Chaos Resistance
20% increased Movement Speed
Grants a unique effect
{crafted}+5 to Strength`;

describe("gear modifier parser", () => {
  it("parses every inventoried family example", () => {
    for (const family of GEAR_MODIFIER_FAMILIES) {
      const parsed = parseGearModifier(family.example);
      expect(parsed.parsed, family.semanticId).toBe(true);
      expect(parsed.semanticId).toBe(family.semanticId);
      expect(parsed.operation).toBe(family.operation);
      expect(parsed.unit).toBe(family.unit);
      const unresolved = family.localityMode !== "global";
      expect(parsed.locality).toBe(unresolved ? "unknown" : "global");
      expect(parsed.rawText).toBe(family.example);
      expect(parsed.semanticallyUnderstood).toBe(!unresolved);
    }
  });

  it("keeps a damage range as min and max", () => {
    const parsed = parseGearModifier("Adds 10 to 20 Fire Damage");
    expect(parsed.amount).toBe(10);
    expect(parsed.amountMax).toBe(20);
    expect(parsed.amount).not.toBe(15);
  });

  it("keeps a conditional modifier conditional", () => {
    const parsed = parseGearModifier("+30 to maximum Life while at Full Life");
    expect(parsed.semanticId).toBe("maximum-life");
    expect(parsed.condition).toBe("while at Full Life");
    expect(parsed.semanticallyUnderstood).toBe(false);
  });

  it("does not decide whether increased Armour is local", () => {
    const parsed = parseGearModifier("120% increased Armour");
    expect(parsed.semanticId).toBe("increased-armour");
    expect(parsed.locality).toBe("unknown");
    expect(parsed.semanticallyUnderstood).toBe(false);
  });

  it("keeps an unsupported line and a negative value", () => {
    expect(parseGearModifier("Grants Level 1 Fireball Skill").parsed).toBe(
      false,
    );
    expect(parseGearModifier("-10 to maximum Life")).toMatchObject({
      parsed: true,
      amount: -10,
      semanticId: "maximum-life",
    });
  });

  it("does not throw on a malformed marker", () => {
    const parsed = parseGearModifier("{crafted +5 to Strength");
    expect(parsed.parsed).toBe(false);
    expect(parsed.malformedMarker).toBe(true);
    expect(parsed.rawText).toBe("{crafted +5 to Strength");
  });

  it("does not send item text through the passive bracket grammar", () => {
    const parsed = parseGearModifier("10% increased [Spell] Damage");
    expect(parsed.parsed).toBe(false);
    expect(parsed.semanticId).toBeNull();
  });
});

describe("gear equipment analysis", () => {
  it("maps PoB slots, keeps two rings apart, and uses a stable order", () => {
    const analysis = analyzeEquipment({
      provider: "pob2",
      items: [
        item({
          slot: "Ring 2",
          name: "Right",
          rarity: "Rare",
          rawText: "+8 to Dexterity",
        }),
        item({
          slot: "Weapon 1",
          name: "Wand",
          rarity: "Rare",
          rawText: "Adds 5 to 8 Fire Damage",
        }),
        item({
          slot: "Ring 1",
          name: "Left",
          rarity: "Rare",
          rawText: "+5 to Strength",
        }),
        item({
          slot: "Weapon 2",
          name: "Focus",
          rarity: "Rare",
          rawText: "+40 to maximum Energy Shield",
        }),
        item({
          slot: "Weapon 1 Swap",
          name: "Swap Wand",
          rarity: "Rare",
          rawText: "+15 to Spirit",
        }),
      ],
    });
    expect(analysis.items.map((entry) => entry.canonicalSlot)).toEqual([
      "main-hand",
      "off-hand",
      "weapon-set-2-main-hand",
      "ring-1",
      "ring-2",
    ]);
    expect(analysis.items.map((entry) => entry.sourceSlot)).toEqual([
      "Weapon 1",
      "Weapon 2",
      "Weapon 1 Swap",
      "Ring 1",
      "Ring 2",
    ]);
    expect(
      analyzeEquipment({
        items: analysis.items.map(() =>
          item({ slot: "Ring 1", name: "Left", rarity: "Rare" }),
        ),
      }),
    ).not.toBe(analysis);
    expect(
      analyzeEquipment({
        provider: "pob2",
        items: [
          item({
            slot: "Ring 2",
            name: "Right",
            rarity: "Rare",
            rawText: "+8 to Dexterity",
          }),
          item({
            slot: "Weapon 1",
            name: "Wand",
            rarity: "Rare",
            rawText: "Adds 5 to 8 Fire Damage",
          }),
          item({
            slot: "Ring 1",
            name: "Left",
            rarity: "Rare",
            rawText: "+5 to Strength",
          }),
          item({
            slot: "Weapon 2",
            name: "Focus",
            rarity: "Rare",
            rawText: "+40 to maximum Energy Shield",
          }),
          item({
            slot: "Weapon 1 Swap",
            name: "Swap Wand",
            rarity: "Rare",
            rawText: "+15 to Spirit",
          }),
        ],
      }),
    ).toEqual(analysis);
  });

  it("reports an unknown slot and a duplicate slot without dropping items", () => {
    const analysis = analyzeEquipment({
      items: [
        item({
          slot: "Trinket",
          name: "Odd",
          rarity: "Normal",
          rawText: "+5 to Strength",
        }),
        item({
          slot: "Helmet",
          name: "One",
          rarity: "Rare",
          rawText: "+100 to maximum Life",
        }),
        item({
          slot: "Helmet",
          name: "Two",
          rarity: "Rare",
          rawText: "+40 to maximum Energy Shield",
        }),
      ],
    });
    expect(analysis.items).toHaveLength(3);
    expect(analysis.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "unknown-slot",
    );
    expect(analysis.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "duplicate-slot",
    );
    expect(analysis.readiness.duplicateSlots).toEqual(["helmet"]);
    expect(analysis.readiness.status).toBe("partial");
  });

  it("reports empty equipment without a score", () => {
    const analysis = analyzeEquipment({ items: [] });
    expect(GEAR_NORMALIZATION_VERSION).toBe(3);
    expect(analysis.gearNormalizationVersion).toBe(3);
    expect(analysis.readiness.status).toBe("insufficient");
    expect(analysis.readiness.missingSlots).toContain("helmet");
    expect(JSON.stringify(analysis)).not.toContain("worst");
    expect(JSON.stringify(analysis)).not.toContain("score");
  });

  it("reads a rare item, a unique item, and mixed coverage from the raw text", () => {
    const rare = analyzeItem(
      item({
        slot: "Helmet",
        name: "Ash Hood",
        baseType: "Wrapped Greathelm",
        rarity: "Rare",
        rawText: helmet,
      }),
    );
    expect(rare.rarity).toBe("Rare");
    expect(rare.itemLevel).toBe(20);
    expect(rare.quality).toBe(10);
    expect(rare.rawText).toContain("{crafted}+5 to Strength");
    expect(
      rare.modifiers.find((modifier) => modifier.semanticId === "strength")
        ?.sourceSection,
    ).toBe("crafted");
    expect(
      rare.modifiers.find((modifier) => modifier.semanticId === "intelligence")
        ?.sourceSection,
    ).toBe("implicit");
    expect(rare.unsupportedLines).toEqual(["Grants a unique effect"]);
    expect(rare.confidence).toBe("high");
    expect(rare.semanticallyUnderstoodLines).toBe(6);
    expect(rare.totalModifierLines).toBe(7);

    const uniqueItem = item({
      slot: "Boots",
      name: "Wanderstride",
      baseType: "Wrapped Sandals",
      rarity: "Unique",
      rawText: [
        "Rarity: UNIQUE",
        "Wanderstride",
        "Wrapped Sandals",
        "--------",
        "Implicits: 0",
        "Enemies tremble",
        "History walks",
        "A third unknown line",
        "A fourth unknown line",
      ].join("\n"),
    });
    const unique = analyzeItem(uniqueItem);
    expect(unique.confidence).toBe("low");
    expect(unique.unsupportedLines).toHaveLength(4);
    expect(
      analyzeEquipment({ items: [uniqueItem] }).diagnostics.some((diagnostic) =>
        diagnostic.message.toLowerCase().includes("weak"),
      ),
    ).toBe(false);
  });

  it("accepts a GGG-shaped item and a fixture item on the same path", () => {
    const ggg = analyzeItem(
      item({
        slot: "Weapon1",
        name: "Sample Wand",
        baseType: "Wand",
        rarity: "Rare",
        rawText: "Adds 1 to 2 Fire Damage",
      }),
    );
    const fixture = analyzeItem(
      item({ slot: "Weapon1", name: "Fixture Wand" }),
    );
    expect(ggg.canonicalSlot).toBe("main-hand");
    expect(ggg.modifiers[0]?.semanticId).toBe("flat-fire-damage");
    expect(ggg.modifiers[0]?.locality).toBe("local");
    expect(fixture.canonicalSlot).toBe("main-hand");
    expect(fixture.confidence).toBe("insufficient");
  });
});

const energyShieldBody = `Rarity: RARE
Ash Coat
Vile Robe
Energy Shield: 40
Implicits: 0
+100 to maximum Energy Shield
20% increased Energy Shield`;

describe("modifier locality", () => {
  it("does not classify Energy Shield as global from the words alone", () => {
    const parsed = parseGearModifier("+40 to maximum Energy Shield");
    expect(parsed.semanticId).toBe("maximum-energy-shield");
    expect(parsed.locality).toBe("unknown");
    expect(parsed.semanticallyUnderstood).toBe(false);
    expect(parsed.rawText).toBe("+40 to maximum Energy Shield");
  });

  it("marks Energy Shield local only on an item that already shows Energy Shield", () => {
    const local = analyzeItem(
      item({
        slot: "Body Armour",
        name: "Ash Coat",
        baseType: "Vile Robe",
        rawText: energyShieldBody,
      }),
    );
    const flat = local.modifiers.find(
      (modifier) => modifier.semanticId === "maximum-energy-shield",
    );
    const increased = local.modifiers.find(
      (modifier) => modifier.semanticId === "increased-energy-shield",
    );
    expect(flat?.locality).toBe("local");
    expect(increased?.locality).toBe("local");
    expect(flat?.semanticallyUnderstood).toBe(true);
    expect(local.confidence).toBe("complete");

    const offHand = analyzeItem(
      item({
        slot: "Weapon 2",
        name: "Spare Focus",
        baseType: "Twig Focus",
        rawText: [
          "Rarity: RARE",
          "Spare Focus",
          "Twig Focus",
          "Energy Shield: 52",
          "Implicits: 0",
          "+40 to maximum Energy Shield",
        ].join("\n"),
      }),
    );
    expect(offHand.modifiers[0]?.locality).toBe("local");
  });

  it("marks flat Energy Shield global on jewellery and a belt", () => {
    for (const slot of ["Ring 1", "Amulet", "Belt"]) {
      const analyzed = analyzeItem(
        item({
          slot,
          name: "Loop",
          rawText: "+40 to maximum Energy Shield",
        }),
      );
      expect(analyzed.modifiers[0]?.locality, slot).toBe("global");
      expect(analyzed.modifiers[0]?.semanticallyUnderstood).toBe(true);
    }
  });

  it("leaves Energy Shield unknown when the item does not establish a domain", () => {
    const plainHelmet = item({
      slot: "Helmet",
      name: "Helm",
      rawText: "+40 to maximum Energy Shield",
    });
    const helmet = analyzeItem(plainHelmet);
    const weapon = analyzeItem(
      item({
        slot: "Weapon 1",
        name: "Wand",
        rawText: "+40 to maximum Energy Shield",
      }),
    );
    const explicitGlobal = analyzeItem(
      item({
        slot: "Helmet",
        name: "Helm",
        rawText: [
          "Rarity: RARE",
          "Helm",
          "Wrapped Greathelm",
          "Energy Shield: 20",
          "Implicits: 0",
          "+40 to global maximum Energy Shield",
        ].join("\n"),
      }),
    );
    expect(helmet.modifiers[0]?.locality).toBe("unknown");
    expect(weapon.modifiers[0]?.locality).toBe("unknown");
    expect(helmet.semanticCoverage).toBe(0);
    expect(helmet.confidence).toBe("low");
    expect(explicitGlobal.modifiers[0]?.locality).toBe("global");
    expect(
      analyzeEquipment({ items: [plainHelmet] }).diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "unknown-locality" &&
          diagnostic.message.includes(
            "Parsed modifier; item/global scope unresolved.",
          ),
      ),
    ).toBe(true);
  });

  it("keeps resistances and attributes global", () => {
    expect(parseGearModifier("+30% to Fire Resistance").locality).toBe(
      "global",
    );
    expect(parseGearModifier("+18% to Cold Resistance").locality).toBe(
      "global",
    );
    expect(parseGearModifier("+5 to Strength").locality).toBe("global");
    expect(parseGearModifier("+10 to Intelligence").locality).toBe("global");
  });

  it("marks weapon damage local on a weapon and unknown without that slot", () => {
    const weapon = analyzeItem(
      item({
        slot: "Weapon 1",
        name: "Wand",
        rawText: "Adds 10 to 20 Physical Damage\n40% increased Physical Damage",
      }),
    );
    expect(weapon.modifiers.map((modifier) => modifier.locality)).toEqual([
      "local",
      "local",
    ]);
    expect(parseGearModifier("Adds 10 to 20 Physical Damage").locality).toBe(
      "unknown",
    );
    expect(parseGearModifier("40% increased Physical Damage").locality).toBe(
      "unknown",
    );
    expect(
      parseGearModifier("Adds 10 to 20 Fire Damage to Attacks").locality,
    ).toBe("global");
    const ring = analyzeItem(
      item({
        slot: "Ring 1",
        name: "Loop",
        rawText: "Adds 10 to 20 Physical Damage",
      }),
    );
    expect(ring.modifiers[0]?.locality).toBe("unknown");
  });

  it("classifies ordinary Cast Speed as global on a weapon, a focus, and a ring", () => {
    for (const [slot, line] of [
      ["Weapon 1", "10% increased Cast Speed"],
      ["Weapon 2", "12% increased Cast Speed"],
      ["Ring 1", "8% increased Cast Speed"],
    ] as const) {
      const analyzed = analyzeItem(item({ slot, name: "Item", rawText: line }));
      expect(analyzed.modifiers[0]?.rawText, slot).toBe(line);
      expect(analyzed.modifiers[0]?.semanticId).toBe("cast-speed");
      expect(analyzed.modifiers[0]?.locality).toBe("global");
      expect(analyzed.modifiers[0]?.semanticallyUnderstood).toBe(true);
    }
  });

  it("does not treat bare increased Elemental Damage as local on a weapon", () => {
    const weapon = analyzeItem(
      item({
        slot: "Weapon 1",
        name: "Wand",
        rawText: "80% increased Elemental Damage",
      }),
    );
    expect(weapon.modifiers[0]?.rawText).toBe("80% increased Elemental Damage");
    expect(weapon.modifiers[0]?.locality).toBe("unknown");
    expect(weapon.modifiers[0]?.semanticallyUnderstood).toBe(false);
    expect(weapon.semanticCoverage).toBe(0);
    expect(weapon.confidence).toBe("low");
    expect(
      parseGearModifier("80% increased Elemental Damage with Attacks"),
    ).toMatchObject({
      rawText: "80% increased Elemental Damage with Attacks",
      semanticId: "increased-elemental-damage",
      scope: "attacks",
      locality: "global",
      semanticallyUnderstood: true,
    });
    expect(
      parseGearModifier("25% increased Elemental Damage with Spells").locality,
    ).toBe("global");
  });

  it("marks attack speed, crit, and accuracy local only on a weapon", () => {
    const weapon = analyzeItem(
      item({
        slot: "Weapon 1",
        name: "Wand",
        rawText: [
          "12% increased Attack Speed",
          "25% increased Critical Hit Chance",
          "+80 to Accuracy Rating",
        ].join("\n"),
      }),
    );
    expect(weapon.modifiers.map((modifier) => modifier.locality)).toEqual([
      "local",
      "local",
      "local",
    ]);
    const gloves = analyzeItem(
      item({
        slot: "Gloves",
        name: "Wraps",
        rawText: "12% increased Attack Speed",
      }),
    );
    expect(gloves.modifiers[0]?.locality).toBe("unknown");
    expect(gloves.modifiers[0]?.semanticallyUnderstood).toBe(false);
    expect(
      parseGearModifier("12% increased global Attack Speed").locality,
    ).toBe("global");
    expect(
      parseGearModifier("25% increased Critical Hit Chance").locality,
    ).toBe("unknown");
    expect(parseGearModifier("+80 to Accuracy Rating").locality).toBe(
      "unknown",
    );
  });

  it("does not treat a conditional line as semantically complete", () => {
    const parsed = parseGearModifier("+30 to maximum Life while at Full Life");
    expect(parsed.locality).toBe("global");
    expect(parsed.semanticallyUnderstood).toBe(false);
  });

  it("lowers semantic coverage and confidence when locality is unknown", () => {
    const mixed = analyzeItem(
      item({
        slot: "Helmet",
        name: "Helm",
        rawText: "+100 to maximum Life\n+40 to maximum Energy Shield",
      }),
    );
    expect(mixed.semanticallyUnderstoodLines).toBe(1);
    expect(mixed.totalModifierLines).toBe(2);
    expect(mixed.semanticCoverage).toBe(0.5);
    expect(mixed.confidence).toBe("partial");
    expect(mixed.modifiers[1]?.rawText).toBe("+40 to maximum Energy Shield");
  });

  it("does not expose a gear score or ranking", () => {
    const analysis = analyzeEquipment({
      items: [
        item({
          slot: "Body Armour",
          name: "Ash Coat",
          rawText: energyShieldBody,
        }),
      ],
    });
    expect(JSON.stringify(analysis)).not.toContain("worst");
    expect(JSON.stringify(analysis)).not.toContain("score");
    expect("findWorstItem" in analysis).toBe(false);
    expect("rankGear" in analysis).toBe(false);
    expect("scoreEquipment" in analysis).toBe(false);
  });
});
