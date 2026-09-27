import { describe, expect, it } from "vitest";
import { parsePassiveStatExpression } from "./grammar";
import { parsePassiveStatLine } from "./stats";

describe("passive stat grammar", () => {
  it("parses increased, reduced, more, and less as different operations", () => {
    const lines = ["increased", "reduced", "more", "less"] as const;
    for (const operation of lines) {
      const expression = parsePassiveStatExpression(`20% ${operation} Damage`);
      expect(expression?.effects).toEqual([
        expect.objectContaining({
          amount: 20,
          unit: "percent",
          operation,
          subjectText: "Damage",
          direction: "unspecified",
        }),
      ]);
    }
  });

  it("parses a pinned conditional without dropping the condition", () => {
    const expression = parsePassiveStatExpression(
      "40% increased [Attack] Damage while on Full Life",
    );
    expect(expression?.effects).toEqual([
      expect.objectContaining({
        amount: 40,
        operation: "increased",
        subjectText: "Attack Damage",
        markups: [{ sourceId: "Attack" }],
        clauses: [
          {
            role: "condition",
            type: "while",
            text: "on Full Life",
            markups: [],
          },
        ],
      }),
    ]);
  });

  it("parses a weapon scope and a second markup", () => {
    const expression = parsePassiveStatExpression(
      "3% increased [Attack] Speed with [Dagger|Daggers]",
    );
    expect(expression?.effects[0]).toMatchObject({
      operation: "increased",
      subjectText: "Attack Speed",
      clauses: [
        {
          role: "scope",
          type: "with",
          text: "Daggers",
          markups: [{ sourceId: "Dagger", displayText: "Daggers" }],
        },
      ],
    });
    expect(expression?.effects[0]?.clauses[0]?.markups).toEqual([
      { sourceId: "Dagger", displayText: "Daggers" },
    ]);
    expect(expression?.effects[0]?.markups).toEqual([{ sourceId: "Attack" }]);
  });

  it("splits armour and evasion into two effects", () => {
    const expression = parsePassiveStatExpression(
      "12% increased [Armour] and [Evasion] Rating",
    );
    expect(expression?.effects.map((effect) => effect.subjectText)).toEqual([
      "Armour",
      "Evasion Rating",
    ]);
    expect(expression?.effects.every((effect) => effect.amount === 12)).toBe(
      true,
    );
  });

  it("parses gain as extra separately from conversion", () => {
    const gained = parsePassiveStatExpression(
      "[Gain] 12% of [Physical] Damage as Extra [Fire] Damage",
    );
    const converted = parsePassiveStatExpression(
      "3% of Skill Mana Costs [StatConversion|Converted] to Life Costs",
    );
    expect(gained?.effects[0]).toMatchObject({
      operation: "gain-as-extra",
      amount: 12,
      sourceText: "Physical Damage",
      targetText: "Fire Damage",
      sourceMarkups: [{ sourceId: "Physical" }],
      targetMarkups: [{ sourceId: "Fire" }],
    });
    expect(converted?.effects[0]).toMatchObject({
      operation: "conversion",
      sourceText: "Skill Mana Costs",
      targetText: "Life Costs",
    });
    expect(gained?.effects[0]?.operation).not.toBe(
      converted?.effects[0]?.operation,
    );
  });

  it("parses elemental penetration and damage taken", () => {
    expect(
      parsePassiveStatExpression(
        "Damage Penetrates 3% of Enemy Elemental Resistances",
      )?.effects[0],
    ).toMatchObject({
      operation: "penetration",
      amount: 3,
      direction: "dealt",
      targetText: "Enemy Elemental Resistances",
    });
    expect(
      parsePassiveStatExpression("Take 30% less Damage")?.effects[0],
    ).toMatchObject({
      operation: "less",
      amount: 30,
      direction: "taken",
      subjectText: "Damage",
    });
  });

  it("keeps an actor instead of turning minion-like lines into generic damage", () => {
    const expression = parsePassiveStatExpression(
      "[Channelling] Skills deal 20% increased Damage",
    );
    expect(expression?.effects[0]).toMatchObject({
      operation: "increased",
      direction: "dealt",
      subjectText: "Damage",
      clauses: [
        {
          type: "actor",
          text: "Channelling Skills",
          markups: [{ sourceId: "Channelling" }],
        },
      ],
    });
    expect(
      parsePassiveStatLine("[Minion|Minions] deal 10% increased Damage"),
    ).toMatchObject({
      statId: "increased.Minion.minions-deal-increased-damage",
      scopes: ["minions"],
    });
  });

  it("leaves ambiguous coordination and an incomplete second clause unsupported", () => {
    expect(
      parsePassiveStatExpression("8% increased [Attack] and Cast Speed"),
    ).toBeNull();
    expect(
      parsePassiveStatExpression("75% of Damage Converted to Fire Damage"),
    ).not.toBeNull();
    expect(
      parsePassiveStatExpression(
        "75% of Damage Converted to Fire Damage\nDeal no Non-Fire Damage",
      ),
    ).toBeNull();
  });

  it("parses every clause or none of them", () => {
    const both = parsePassiveStatExpression(
      "30% less [CriticalDamageBonus|Critical Damage Bonus] when on Full Life\n30% more Critical Damage Bonus when on [LowLife|Low Life]",
    );
    expect(both?.effects).toHaveLength(2);
    expect(both?.effects.map((effect) => effect.operation)).toEqual([
      "less",
      "more",
    ]);
    expect(
      parsePassiveStatExpression(
        "10% increased [Spell] Damage\nDeal no Non-Fire Damage",
      ),
    ).toBeNull();
  });

  it("keeps damage direction separate from the operation", () => {
    expect(
      parsePassiveStatExpression("Take 30% less Damage")?.effects[0],
    ).toMatchObject({ operation: "less", direction: "taken" });
    expect(
      parsePassiveStatExpression("10% less Damage taken")?.effects[0],
    ).toMatchObject({ operation: "less", direction: "taken" });
    expect(
      parsePassiveStatExpression(
        "10% less [ElementalDamage|Elemental Damage] taken",
      )?.effects[0],
    ).toMatchObject({ operation: "less", direction: "taken" });
    expect(
      parsePassiveStatExpression("Mirages deal 50% less Damage")?.effects[0],
    ).toMatchObject({ operation: "less", direction: "dealt" });
    expect(
      parsePassiveStatExpression("20% more [Spell] Damage")?.effects[0],
    ).toMatchObject({ operation: "more", direction: "unspecified" });
  });

  it("represents deflection from evasion as a ratio, not a flat bonus", () => {
    const effect = parsePassiveStatExpression(
      "Gain [Deflect|Deflection Rating] equal to 4% of [Evasion|Evasion Rating]",
    )?.effects[0];
    expect(effect).toMatchObject({
      operation: "derived-from",
      amount: 4,
      unit: "percent",
      sourceText: "Evasion Rating",
      targetText: "Deflection Rating",
    });
    expect(effect?.sourceMarkups?.[0]?.sourceId).toBe("Evasion");
    expect(effect?.targetMarkups?.[0]?.sourceId).toBe("Deflect");
  });

  it("parses reservation, maximum resistance, and chance without dropping tokens", () => {
    expect(
      parsePassiveStatExpression(
        "8% increased [Reservation] [Efficiency] of [Herald] Skills",
      )?.effects[0]?.markups.map((markup) => markup.sourceId),
    ).toEqual(["Reservation", "Efficiency", "Herald"]);
    expect(
      parsePassiveStatExpression(
        "+1% to [MaximumResistances|Maximum Cold Resistance]",
      )?.effects[0],
    ).toMatchObject({
      operation: "added",
      amount: 1,
      unit: "percent",
      markups: [
        {
          sourceId: "MaximumResistances",
          displayText: "Maximum Cold Resistance",
        },
      ],
    });
    expect(
      parsePassiveStatExpression("5% chance to [Daze] on [Hit]")?.effects[0],
    ).toMatchObject({
      operation: "chance",
      subjectText: "to Daze on Hit",
      markups: [{ sourceId: "Daze" }, { sourceId: "Hit" }],
    });
  });
});
