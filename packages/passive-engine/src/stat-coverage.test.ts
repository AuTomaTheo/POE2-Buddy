import {
  developmentPassiveTreeSnapshotDirectory,
  loadPinnedPassiveTreeSnapshot,
} from "@poe2-helper/data-sources";
import { describe, expect, it } from "vitest";
import {
  EXTRACTION_COVERAGE_TARGET_PERCENT,
  REQUIRED_SEMANTIC_IDS,
  REQUIRED_STRUCTURAL_OPERATIONS,
  assessStatScoringReadiness,
  decideStatScoringReadiness,
  passiveStatSemanticCoverage,
  semanticPassiveStat,
} from "./semantic";
import {
  unrecognizedStatFamilyId,
  unrecognizedStatInventory,
  unrecognizedStatOccurrences,
} from "./stat-inventory";
import { unmappedStructuredInventory } from "./unmapped-inventory";
import { parsePassiveStatLine, passiveStatCoverage } from "./stats";

const snapshot = loadPinnedPassiveTreeSnapshot({
  snapshotDirectory: developmentPassiveTreeSnapshotDirectory,
  logger: () => undefined,
});

describe("expanded passive stat templates", () => {
  it("parses reduced, more, and less as different operations", () => {
    expect(
      parsePassiveStatLine("4% reduced Skill Effect Duration"),
    ).toMatchObject({
      status: "recognized",
      form: "reduced",
      amount: 4,
      unit: "percent",
      statId: "reduced.plain.reduced-skill-effect-duration",
    });
    expect(parsePassiveStatLine("15% more Maximum Life")).toMatchObject({
      status: "recognized",
      form: "more",
      amount: 15,
      statId: "more.plain.more-maximum-life",
    });
    expect(parsePassiveStatLine("15% less maximum Life")).toMatchObject({
      status: "recognized",
      form: "less",
      amount: 15,
      statId: "less.plain.less-maximum-life",
    });
    const increased = parsePassiveStatLine("20% increased Damage");
    const more = parsePassiveStatLine("20% more Damage");
    expect(increased).toMatchObject({ form: "increased", amount: 20 });
    expect(more).toMatchObject({ form: "more", amount: 20 });
    if (increased.status === "recognized" && more.status === "recognized") {
      expect(increased.statId).not.toBe(more.statId);
    }
  });

  it("keeps maximum, resistance, penetration, and scoped lines whole", () => {
    expect(
      parsePassiveStatLine(
        "18% increased maximum [EnergyShield|Energy Shield]",
      ),
    ).toMatchObject({
      status: "recognized",
      form: "increased",
      statId: "increased.EnergyShield.increased-maximum-energy-shield",
      amount: 18,
      unit: "percent",
    });
    expect(
      parsePassiveStatLine("+10% to [Resistances|Cold Resistance]"),
    ).toMatchObject({
      status: "recognized",
      form: "added",
      unit: "percent",
      statId: "added.Resistances.to-cold-resistance",
      amount: 10,
    });
    expect(
      parsePassiveStatLine(
        "Damage [Penetration|Penetrates] 15% [Resistances|Fire Resistance]",
      ),
    ).toMatchObject({
      status: "recognized",
      form: "penetration",
      statId: "penetration.Resistances.penetrates-fire-resistance",
      amount: 15,
    });
    expect(
      parsePassiveStatLine("[Minion|Minions] deal 10% increased Damage"),
    ).toMatchObject({
      status: "recognized",
      scopes: ["minions"],
      statId: "increased.Minion.minions-deal-increased-damage",
    });
    expect(
      parsePassiveStatLine(
        "12% increased [Critical|Critical Hit Chance] for [Spell|Spells]",
      ),
    ).toMatchObject({
      status: "recognized",
      scopes: ["spells"],
      statId: "increased.Critical.increased-critical-hit-chance-for-spells",
    });
    expect(parsePassiveStatLine("+8 to [Evasion] Rating")).toMatchObject({
      status: "recognized",
      form: "added",
      unit: "flat",
      statId: "added.Evasion.to-evasion-rating",
    });
    expect(
      parsePassiveStatLine("+3 to all [Attributes|Attributes]"),
    ).toMatchObject({
      status: "recognized",
      statId: "added.Attributes.to-all-attributes",
    });
  });

  it("keeps conditions and refuses lines it cannot finish", () => {
    const conditional = parsePassiveStatLine(
      "30% increased [Armour] while stationary",
    );
    const fullLife = parsePassiveStatLine(
      "20% increased Damage while on Full Life",
    );
    const both = parsePassiveStatLine(
      "10% increased [Armour] and [Evasion] Rating",
    );
    const derived = parsePassiveStatLine(
      "Gain [Deflect|Deflection Rating] equal to 15% of [Evasion|Evasion Rating]",
    );
    const ambiguous = "8% increased [Attack] and Cast Speed";

    expect(conditional).toMatchObject({
      status: "recognized",
      effects: [
        {
          operation: "increased",
          clauses: [{ type: "while", text: "stationary", markups: [] }],
        },
      ],
    });
    expect(fullLife).toMatchObject({
      status: "recognized",
      effects: [
        {
          operation: "increased",
          subjectText: "Damage",
          clauses: [{ type: "while", text: "on Full Life", markups: [] }],
        },
      ],
    });
    expect(semanticPassiveStat(fullLife)?.semanticId).toBe("damage");
    expect(semanticPassiveStat(fullLife)?.conditions).toEqual([
      { type: "while", text: "on Full Life", markups: [] },
    ]);
    expect(both).toMatchObject({
      status: "recognized",
      effects: [{ subjectText: "Armour" }, { subjectText: "Evasion Rating" }],
    });
    expect(derived).toMatchObject({
      status: "recognized",
      form: "derived-from",
      amount: 15,
      unit: "percent",
    });
    expect(semanticPassiveStat(derived)?.semanticId).toBe(
      "deflection-from-evasion",
    );
    expect(
      semanticPassiveStat(parsePassiveStatLine("10% less Damage taken"))
        ?.semanticId,
    ).toBe("damage-taken");
    expect(
      semanticPassiveStat(parsePassiveStatLine("Mirages deal 50% less Damage"))
        ?.semanticId,
    ).toBe("damage");
    expect(parsePassiveStatLine(ambiguous)).toEqual({
      status: "unrecognized",
      raw: ambiguous,
    });
  });
});

describe("semantic passive stats", () => {
  it("maps an extracted line without dropping its operation or scope", () => {
    const extracted = parsePassiveStatLine(
      "[Minion|Minions] have 6% increased maximum Life",
    );
    const semantic = semanticPassiveStat(extracted);

    expect(semantic).toEqual({
      raw: "[Minion|Minions] have 6% increased maximum Life",
      statId: "increased.Minion.minions-have-increased-maximum-life",
      semanticId: "minion-maximum-life",
      operation: "increased",
      amount: 6,
      unit: "percent",
      scopes: ["minions"],
    });
  });

  it("does not merge critical damage bonus with critical spell damage bonus", () => {
    const damage = semanticPassiveStat(
      parsePassiveStatLine(
        "12% increased [CriticalDamageBonus|Critical Damage Bonus]",
      ),
    );
    const spell = semanticPassiveStat(
      parsePassiveStatLine(
        "12% increased [CriticalDamageBonus|Critical Spell Damage Bonus]",
      ),
    );

    expect(damage?.semanticId).toBe("critical-damage-bonus");
    expect(spell?.semanticId).toBe("critical-spell-damage-bonus");
    expect(damage?.statId).not.toBe(spell?.statId);
  });

  it("does not turn more damage into increased damage", () => {
    const increased = semanticPassiveStat(
      parsePassiveStatLine("20% increased Damage"),
    );
    const more = semanticPassiveStat(parsePassiveStatLine("20% more Damage"));

    expect(increased).toMatchObject({
      semanticId: "damage",
      operation: "increased",
    });
    expect(more).toMatchObject({
      semanticId: "damage",
      operation: "more",
    });
    expect(increased?.statId).not.toBe(more?.statId);
  });

  it("does not invent a zero amount for an unrecognized line", () => {
    const line = parsePassiveStatLine("8% increased [Attack] and Cast Speed");
    expect(line.status).toBe("unrecognized");
    expect(semanticPassiveStat(line)).toBeNull();
    expect(line).not.toHaveProperty("amount");
  });
});

describe("stat scoring readiness decision", () => {
  const supportedCounts = Object.fromEntries(
    REQUIRED_SEMANTIC_IDS.map((semanticId) => [semanticId, 1]),
  );

  it("is ready only when every required family is present and the target is met", () => {
    const readiness = decideStatScoringReadiness({
      lineCount: 100,
      recognizedLineCount: 80,
      semanticLineCount: 80,
      semanticCounts: supportedCounts,
      unsupportedHighPriorityFamilies: [],
      structuralOperations: [...REQUIRED_STRUCTURAL_OPERATIONS],
    });

    expect(readiness.status).toBe("ready");
    expect(readiness.supportedFamilies).toEqual([...REQUIRED_SEMANTIC_IDS]);
    expect(readiness.reasons).toEqual([]);
  });

  it("does not block on a partial family when every other gate passes", () => {
    const readiness = decideStatScoringReadiness({
      lineCount: 100,
      recognizedLineCount: 80,
      semanticLineCount: 80,
      semanticCounts: supportedCounts,
      unsupportedHighPriorityFamilies: [],
      partiallySupportedFamilies: ["damage-conversion"],
      structuralOperations: [...REQUIRED_STRUCTURAL_OPERATIONS],
    });

    expect(readiness.status).toBe("ready");
    expect(readiness.partiallySupportedFamilies).toEqual(["damage-conversion"]);
    expect(readiness.reasons).toEqual([]);
  });

  it("is not-ready when a present unsupported family would stay hidden", () => {
    const readiness = decideStatScoringReadiness({
      lineCount: 100,
      recognizedLineCount: 80,
      semanticLineCount: 80,
      semanticCounts: supportedCounts,
      structuralOperations: [...REQUIRED_STRUCTURAL_OPERATIONS],
      highPriorityFamilies: [
        {
          familyId: "less-damage",
          status: "still-unsupported",
          supportStatus: "still-unsupported",
          presentInScoringDomain: true,
          omissionExposed: false,
          blocking: true,
          reason:
            "Outgoing less-damage occurs and path coverage would not show the gap.",
        },
      ],
    });

    expect(readiness.status).toBe("not-ready");
    expect(readiness.unsupportedHighPriorityFamilies).toEqual(["less-damage"]);
    expect(readiness.reasons).toContain(
      "High-priority family less-damage is not supported yet.",
    );
  });

  it("is not-ready when one required family is missing", () => {
    const readiness = decideStatScoringReadiness({
      lineCount: 100,
      recognizedLineCount: 80,
      semanticLineCount: 80,
      semanticCounts: { ...supportedCounts, "maximum-life": 0 },
      unsupportedHighPriorityFamilies: [],
    });

    expect(readiness.status).toBe("not-ready");
    expect(readiness.reasons).toContain(
      "Required semantic family maximum-life has no parsed lines.",
    );
  });

  it("is not-ready below the working extraction target", () => {
    const readiness = decideStatScoringReadiness({
      lineCount: 100,
      recognizedLineCount: EXTRACTION_COVERAGE_TARGET_PERCENT - 1,
      semanticLineCount: 50,
      semanticCounts: supportedCounts,
      unsupportedHighPriorityFamilies: [],
    });

    expect(readiness.status).toBe("not-ready");
    expect(readiness.reasons[0]).toContain("working target");
  });
});

describe("pinned stat coverage after expansion", () => {
  it("measures extraction, semantic normalization, and readiness", () => {
    const extraction = passiveStatCoverage(snapshot.nodes);
    const semantic = passiveStatSemanticCoverage(snapshot.nodes);
    const inventory = unrecognizedStatInventory(snapshot.nodes);
    const unmapped = unmappedStructuredInventory(snapshot.nodes);
    const readiness = assessStatScoringReadiness(snapshot.nodes);

    expect(semantic.lineCount).toBe(extraction.lineCount);
    expect(semantic.recognizedLineCount).toBe(extraction.recognizedLineCount);
    expect(semantic.unrecognizedLineCount).toBe(
      extraction.unrecognizedLineCount,
    );
    expect(inventory.lineCount).toBe(extraction.unrecognizedLineCount);
    expect(
      inventory.families.reduce(
        (sum, family) => sum + family.totalOccurrences,
        0,
      ),
    ).toBe(inventory.lineCount);

    const again = unrecognizedStatInventory(snapshot.nodes);
    expect(again).toEqual(inventory);

    for (const family of inventory.families) {
      expect(family.examples.length).toBeGreaterThan(0);
      expect(family.examples.length).toBeLessThanOrEqual(3);
      expect(
        [...family.examples].sort((left, right) => left.localeCompare(right)),
      ).toEqual(family.examples);
      for (const example of family.examples) {
        expect(parsePassiveStatLine(example).status).toBe("unrecognized");
        expect(unrecognizedStatFamilyId(example)).toBe(family.familyId);
      }
    }

    const occurrences = unrecognizedStatOccurrences(snapshot.nodes);
    expect(occurrences).toHaveLength(extraction.unrecognizedLineCount);
    expect(occurrences[0]).toEqual(
      expect.objectContaining({
        nodeId: expect.any(Number),
        nodeName: expect.any(String),
        raw: expect.any(String),
      }),
    );
    const sorted = [...occurrences].sort((left, right) => {
      if (left.nodeId !== right.nodeId) return left.nodeId - right.nodeId;
      return left.raw.localeCompare(right.raw);
    });
    expect(occurrences).toEqual(sorted);

    expect(semantic.lineCount).toBe(5963);
    expect(semantic.recognizedLineCount).toBe(4775);
    expect(semantic.semanticLineCount).toBe(2907);
    expect(semantic.unrecognizedLineCount).toBe(1188);
    expect(semantic.extractionCoveragePercent).toBe(80.1);
    expect(semantic.semanticCoveragePercent).toBe(48.8);
    expect(
      inventory.families.map((family) => [
        family.familyId,
        family.totalOccurrences,
        family.distinctLines,
      ]),
    ).toEqual([
      ["multiple-markup-tokens", 602, 418],
      ["multiple-numeric-values", 131, 118],
      ["no-numeric-value", 101, 100],
      ["unclassified", 87, 46],
      ["energy-shield", 81, 13],
      ["life", 68, 33],
      ["when", 26, 22],
      ["per", 20, 14],
      ["chance", 16, 13],
      ["for", 12, 10],
      ["while", 9, 8],
      ["armour", 6, 6],
      ["with", 6, 4],
      ["flat-unstructured", 4, 3],
      ["minion", 3, 3],
      ["conversion", 2, 2],
      ["evasion", 2, 2],
      ["increased-unstructured", 2, 2],
      ["resistance", 2, 2],
      ["against", 1, 1],
      ["cast-speed", 1, 1],
      ["critical", 1, 1],
      ["if", 1, 1],
      ["less", 1, 1],
      ["more", 1, 1],
      ["movement-speed", 1, 1],
      ["projectile", 1, 1],
    ]);

    expect(unmapped.lineCount).toBe(1868);
    expect(unmappedStructuredInventory(snapshot.nodes)).toEqual(unmapped);
    expect(unmapped.families[0]).toMatchObject({
      familyId: "increased.plain.scope",
      totalOccurrences: 123,
      distinctLines: 46,
    });

    expect(readiness.status).toBe("ready");
    expect(readiness.extractionCoverage).toBe(80.1);
    expect(readiness.semanticCoverage).toBe(48.8);
    expect(readiness.supportedFamilies).toEqual([...REQUIRED_SEMANTIC_IDS]);
    expect(readiness.unsupportedHighPriorityFamilies).toEqual([]);
    expect(readiness.partiallySupportedFamilies).toEqual(["damage-conversion"]);
    expect(readiness.reasons).toEqual([]);
    expect(
      readiness.familyReports.find(
        (family) => family.familyId === "less-damage",
      ),
    ).toMatchObject({
      supportStatus: "still-unsupported",
      presentInScoringDomain: false,
      blocking: false,
    });
    expect(
      readiness.familyReports.find(
        (family) => family.familyId === "damage-conversion",
      ),
    ).toMatchObject({
      supportStatus: "partially-supported",
      presentInScoringDomain: true,
      omissionExposed: true,
      blocking: false,
    });
  });
});
