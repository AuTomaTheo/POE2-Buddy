import {
  developmentPassiveTreeSnapshotDirectory,
  loadPinnedPassiveTreeSnapshot,
} from "@poe2-helper/data-sources";
import { describe, expect, it } from "vitest";
import {
  extractPassiveNodeStats,
  parsePassiveStatLine,
  passiveStatCoverage,
} from "./stats";

describe("passive stat extraction", () => {
  it("parses a whole increased line and keeps the raw text", () => {
    const line = parsePassiveStatLine("10% increased [Spell] Damage");

    expect(line).toEqual({
      status: "recognized",
      raw: "10% increased [Spell] Damage",
      statId: "increased.Spell.increased-spell-damage",
      sourceId: "Spell",
      label: "increased Spell Damage",
      amount: 10,
      unit: "percent",
      form: "increased",
      scopes: [],
    });
  });

  it("keeps two displays of the same markup id distinct", () => {
    const damage = parsePassiveStatLine(
      "12% increased [CriticalDamageBonus|Critical Damage Bonus]",
    );
    const spell = parsePassiveStatLine(
      "12% increased [CriticalDamageBonus|Critical Spell Damage Bonus]",
    );

    expect(damage.status).toBe("recognized");
    expect(spell.status).toBe("recognized");
    if (damage.status === "recognized" && spell.status === "recognized") {
      expect(damage.sourceId).toBe(spell.sourceId);
      expect(damage.statId).not.toBe(spell.statId);
      expect(damage.statId).toBe(
        "increased.CriticalDamageBonus.increased-critical-damage-bonus",
      );
      expect(spell.statId).toBe(
        "increased.CriticalDamageBonus.increased-critical-spell-damage-bonus",
      );
    }
  });

  it("parses flat attributes and maximum energy shield", () => {
    expect(parsePassiveStatLine("+10 to [Strength]")).toMatchObject({
      status: "recognized",
      statId: "added.Strength.to-strength",
      amount: 10,
      unit: "flat",
      form: "added",
    });
    expect(
      parsePassiveStatLine("+5 to any [Attributes|Attribute]"),
    ).toMatchObject({
      status: "recognized",
      statId: "added.Attributes.to-any-attribute",
      label: "to any Attribute",
      amount: 5,
    });
    expect(
      parsePassiveStatLine("+10 to maximum [EnergyShield|Energy Shield]"),
    ).toMatchObject({
      status: "recognized",
      statId: "added.EnergyShield.to-maximum-energy-shield",
      amount: 10,
      unit: "flat",
    });
  });

  it("keeps an unrecognized line visible and does not drop it", () => {
    const raw = "8% increased [Attack] and Cast Speed";
    const extracted = extractPassiveNodeStats({
      id: 4,
      rawStats: ["10% increased [Spell] Damage", raw],
    });

    expect(extracted.rawStats).toEqual(["10% increased [Spell] Damage", raw]);
    expect(extracted.lines.map((line) => line.status)).toEqual([
      "recognized",
      "unrecognized",
    ]);
    expect(extracted.lines[1]).toEqual({ status: "unrecognized", raw });
  });

  it("reports an empty node with no stat lines", () => {
    expect(extractPassiveNodeStats({ id: 1, rawStats: [] })).toEqual({
      nodeId: 1,
      rawStats: [],
      lines: [],
    });
  });
});

describe("pinned passive stat coverage", () => {
  const snapshot = loadPinnedPassiveTreeSnapshot({
    snapshotDirectory: developmentPassiveTreeSnapshotDirectory,
    logger: () => undefined,
  });

  it("counts every raw line and flags the ones that were not parsed", () => {
    const coverage = passiveStatCoverage(snapshot.nodes);
    const spell = extractPassiveNodeStats(
      snapshot.nodes.find((node) => node.id === 4739) ?? {
        id: 0,
        rawStats: [],
      },
    );

    expect(coverage.nodeCount).toBe(snapshot.nodes.length);
    expect(coverage.lineCount).toBe(5963);
    expect(coverage.recognizedLineCount).toBe(4775);
    expect(coverage.unrecognizedLineCount).toBe(1188);
    expect(coverage.recognizedLineCount + coverage.unrecognizedLineCount).toBe(
      coverage.lineCount,
    );
    expect(coverage.recognizedLineCount).toBeGreaterThan(
      coverage.unrecognizedLineCount,
    );
    expect(
      coverage.recognizedByStatId.find(
        (entry) => entry.statId === "increased.Spell.increased-spell-damage",
      )?.count,
    ).toBe(43);
    expect(spell.rawStats).toEqual(["10% increased [Spell] Damage"]);
    expect(spell.lines[0]).toMatchObject({
      status: "recognized",
      statId: "increased.Spell.increased-spell-damage",
      amount: 10,
    });

    for (const node of snapshot.nodes) {
      const extracted = extractPassiveNodeStats(node);
      expect(extracted.rawStats).toBe(node.rawStats);
      expect(extracted.lines).toHaveLength(node.rawStats.length);
      expect(extracted.lines.map((line) => line.raw)).toEqual(node.rawStats);
    }
  });
});
