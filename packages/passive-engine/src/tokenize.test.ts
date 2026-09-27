import { describe, expect, it } from "vitest";
import { tokenizePassiveStat } from "./tokenize";

describe("passive stat tokenizer", () => {
  it("tokenizes integers, signs, percentages, and ranges", () => {
    expect(tokenizePassiveStat("+10 to Strength")).toEqual([
      { kind: "number", raw: "+10", value: 10, sign: "+", percent: false },
      { kind: "word", text: "to" },
      { kind: "word", text: "Strength" },
    ]);
    expect(tokenizePassiveStat("-7%")).toEqual([
      { kind: "number", raw: "-7%", value: -7, sign: "-", percent: true },
    ]);
    expect(tokenizePassiveStat("0.2%")).toEqual([
      { kind: "number", raw: "0.2%", value: 0.2, sign: "none", percent: true },
    ]);
    expect(tokenizePassiveStat("10-20")).toEqual([
      {
        kind: "range",
        raw: "10-20",
        from: 10,
        to: 20,
        percent: false,
      },
    ]);
  });

  it("keeps markup source ids and display text", () => {
    expect(tokenizePassiveStat("10% increased [Spell] Damage")).toEqual([
      { kind: "number", raw: "10%", value: 10, sign: "none", percent: true },
      { kind: "word", text: "increased" },
      { kind: "markup", sourceId: "Spell" },
      { kind: "word", text: "Damage" },
    ]);
    expect(
      tokenizePassiveStat(
        "[EnergyShield|Energy Shield] [Resistances|Cold Resistance]",
      ),
    ).toEqual([
      {
        kind: "markup",
        sourceId: "EnergyShield",
        displayText: "Energy Shield",
      },
      {
        kind: "markup",
        sourceId: "Resistances",
        displayText: "Cold Resistance",
      },
    ]);
  });

  it("keeps punctuation that changes the sentence", () => {
    expect(
      tokenizePassiveStat("Grants Skill: <underline>{Hollow Form}"),
    ).toEqual([
      { kind: "word", text: "Grants" },
      { kind: "word", text: "Skill" },
      { kind: "punctuation", text: ":" },
      { kind: "punctuation", text: "<" },
      { kind: "word", text: "underline" },
      { kind: "punctuation", text: ">" },
      { kind: "punctuation", text: "{" },
      { kind: "word", text: "Hollow" },
      { kind: "word", text: "Form" },
      { kind: "punctuation", text: "}" },
    ]);
  });
});
