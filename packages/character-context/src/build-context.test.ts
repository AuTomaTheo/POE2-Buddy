import { describe, expect, it } from "vitest";
import { buildCharacterContext } from "./build-context";
import { CHARACTER_CONTEXT_VERSION, type CharacterContextInput } from "./model";

function input(
  partial: Partial<CharacterContextInput> = {},
): CharacterContextInput {
  return {
    source: "fixture",
    className: "Witch",
    ascendancyName: null,
    ascendancyPassiveIds: [],
    mainSkill: { status: "missing" },
    skillGroups: [],
    passives: [],
    gearModifiers: [],
    configuration: [],
    ...partial,
  };
}

function mechanic(
  context: ReturnType<typeof buildCharacterContext>,
  side: "offense" | "defense",
  name: string,
) {
  return context[side].find((entry) => entry.mechanic === name);
}

describe("character context", () => {
  it("preserves a resolved main skill and does not guess another group", () => {
    const context = buildCharacterContext(
      input({
        mainSkill: {
          status: "resolved",
          groupId: "2",
          name: "Fireball",
          skillId: "FireballPlayer",
        },
        skillGroups: [
          {
            id: "1",
            label: null,
            relationship: "linked",
            activeSkills: [
              { name: "Spark", skillId: "SparkPlayer", mechanics: [] },
            ],
            supports: [],
            unknownGems: [],
          },
          {
            id: "2",
            label: null,
            relationship: "linked",
            activeSkills: [
              {
                name: "Fireball",
                skillId: "FireballPlayer",
                mechanics: ["projectile", "spell", "fire"],
              },
            ],
            supports: [
              {
                name: "Rapid Attacks III",
                skillId: "SupportRapidAttacksPlayerThree",
                mechanics: [],
              },
            ],
            unknownGems: [],
          },
        ],
      }),
    );
    expect(context.primarySkill).toMatchObject({
      status: "resolved",
      name: "Fireball",
      skillId: "FireballPlayer",
      groupId: "2",
    });
    expect(context.skillGroups.map((group) => group.role)).toEqual([
      "unresolved",
      "primary",
    ]);
    expect(context.skillGroups[0]?.activeSkillNames).toEqual(["Spark"]);
    expect(mechanic(context, "offense", "projectile")?.relevance).toBe(
      "relevant",
    );
    expect(
      mechanic(context, "offense", "projectile")?.evidence[0],
    ).toMatchObject({
      sourceType: "skill",
      strength: "direct",
      rawLabel: "Fireball",
    });
    expect(mechanic(context, "offense", "attack")?.relevance).toBe(
      "no-evidence",
    );
  });

  it("leaves an unresolved main skill unresolved and still reports other evidence", () => {
    const context = buildCharacterContext(
      input({
        mainSkill: {
          status: "unresolved",
          reason: "missing-main-socket-group",
        },
        skillGroups: [
          {
            id: "1",
            label: null,
            relationship: "unknown",
            activeSkills: [
              { name: "First Gem", skillId: "FirstGem", mechanics: [] },
              { name: "Second Gem", skillId: "SecondGem", mechanics: [] },
            ],
            supports: [],
            unknownGems: [],
          },
        ],
        passives: [
          {
            nodeId: 10,
            name: "Evasion node",
            source: "passive",
            semanticIds: ["evasion"],
            conditionalSemanticIds: [],
            unrecognizedLines: [],
          },
        ],
      }),
    );
    expect(context.primarySkill.status).toBe("unresolved");
    expect(context.primarySkill.name).toBeNull();
    expect(context.skillGroups[0]?.role).toBe("unresolved");
    expect(mechanic(context, "defense", "evasion")?.relevance).toBe("relevant");
    expect(context.readiness.status).toBe("partial");
    expect(context.readiness.primarySkillResolved).toBe(false);
  });

  it("does not turn an unknown support role into evidence", () => {
    const context = buildCharacterContext(
      input({
        mainSkill: {
          status: "resolved",
          groupId: "1",
          name: "Fireball",
          skillId: "FireballPlayer",
        },
        skillGroups: [
          {
            id: "1",
            label: null,
            relationship: "unknown",
            activeSkills: [
              {
                name: "Fireball",
                skillId: "FireballPlayer",
                mechanics: ["projectile"],
              },
            ],
            supports: [],
            unknownGems: [{ name: "Mystery Support", skillId: "Mystery" }],
          },
        ],
      }),
    );
    expect(context.unresolvedMechanics).toContain("unknown skill role");
    expect(
      context.offense.every((entry) =>
        entry.evidence.every(
          (evidence) => evidence.rawLabel !== "Mystery Support",
        ),
      ),
    ).toBe(true);
    expect(context.readiness.warnings.join(" ")).toContain(
      "Unknown skill roles were not used as evidence.",
    );
  });

  it("uses projectile skill, support, passive, and understood gear evidence", () => {
    const context = buildCharacterContext(
      input({
        mainSkill: {
          status: "resolved",
          groupId: "1",
          name: "Twister",
          skillId: "Twister",
        },
        skillGroups: [
          {
            id: "1",
            label: null,
            relationship: "linked",
            activeSkills: [
              {
                name: "Twister",
                skillId: "Twister",
                mechanics: ["projectile"],
              },
            ],
            supports: [
              {
                name: "Projectile support",
                skillId: "SupportProjectile",
                mechanics: ["projectile"],
              },
            ],
            unknownGems: [],
          },
        ],
        passives: [
          {
            nodeId: 1755,
            name: "Projectile Damage",
            source: "passive",
            semanticIds: ["projectile-damage", "critical-hit-chance"],
            conditionalSemanticIds: [],
            unrecognizedLines: [],
          },
        ],
        gearModifiers: [
          {
            slot: "Amulet",
            itemName: "Eye",
            rawText: "22% increased Projectile Damage",
            semanticId: "increased-projectile-damage",
            locality: "global",
            semanticallyUnderstood: true,
          },
          {
            slot: "Ring 1",
            itemName: "Loop",
            rawText: "+15% to Critical Damage Bonus",
            semanticId: "critical-damage-bonus",
            locality: "global",
            semanticallyUnderstood: true,
          },
        ],
      }),
    );
    const projectile = mechanic(context, "offense", "projectile");
    expect(projectile?.relevance).toBe("relevant");
    expect(projectile?.evidence.map((entry) => entry.sourceType)).toEqual([
      "skill",
      "support",
      "passive",
      "gear",
    ]);
    expect(mechanic(context, "offense", "critical-strike")?.relevance).toBe(
      "relevant",
    );
    expect(JSON.stringify(context)).not.toContain("weight");
    expect(context.characterContextVersion).toBe(CHARACTER_CONTEXT_VERSION);
  });

  it("accepts understood local weapon damage and rejects unknown elemental locality", () => {
    const context = buildCharacterContext(
      input({
        gearModifiers: [
          {
            slot: "Weapon 1",
            itemName: "Wand",
            rawText: "Adds 10 to 20 Physical Damage",
            semanticId: "flat-physical-damage",
            locality: "local",
            semanticallyUnderstood: true,
          },
          {
            slot: "Weapon 1",
            itemName: "Wand",
            rawText: "80% increased Elemental Damage",
            semanticId: "increased-elemental-damage",
            locality: "unknown",
            semanticallyUnderstood: false,
          },
          {
            slot: "Weapon 1",
            itemName: "Wand",
            rawText: "80% increased Elemental Damage with Attacks",
            semanticId: "increased-elemental-damage",
            locality: "global",
            semanticallyUnderstood: true,
          },
        ],
      }),
    );
    expect(mechanic(context, "offense", "physical")?.relevance).toBe(
      "relevant",
    );
    expect(context.weaponContext.localDamageLabels).toEqual([
      "Adds 10 to 20 Physical Damage",
    ]);
    expect(mechanic(context, "offense", "elemental")?.relevance).toBe(
      "relevant",
    );
    expect(mechanic(context, "offense", "elemental")?.evidence).toHaveLength(1);
    expect(
      mechanic(context, "offense", "elemental")?.evidence[0]?.rawLabel,
    ).toBe("80% increased Elemental Damage with Attacks");
  });

  it("reports defensive evidence without totals and keeps unknown armour unresolved", () => {
    const context = buildCharacterContext(
      input({
        passives: [
          {
            nodeId: 1,
            name: "Evasion",
            source: "passive",
            semanticIds: ["evasion", "deflection"],
            conditionalSemanticIds: [],
            unrecognizedLines: [],
          },
        ],
        gearModifiers: [
          {
            slot: "Body Armour",
            itemName: "Coat",
            rawText: "+100 to maximum Life",
            semanticId: "maximum-life",
            locality: "global",
            semanticallyUnderstood: true,
          },
          {
            slot: "Weapon 2",
            itemName: "Focus",
            rawText: "+40 to maximum Energy Shield",
            semanticId: "maximum-energy-shield",
            locality: "local",
            semanticallyUnderstood: true,
          },
          {
            slot: "Helmet",
            itemName: "Helm",
            rawText: "50% increased Armour",
            semanticId: "increased-armour",
            locality: "unknown",
            semanticallyUnderstood: false,
          },
        ],
      }),
    );
    expect(mechanic(context, "defense", "life")?.relevance).toBe("relevant");
    expect(mechanic(context, "defense", "energy-shield")?.relevance).toBe(
      "relevant",
    );
    expect(mechanic(context, "defense", "evasion")?.relevance).toBe("relevant");
    expect(mechanic(context, "defense", "deflection")?.relevance).toBe(
      "relevant",
    );
    expect(mechanic(context, "defense", "armour")?.relevance).toBe(
      "unresolved",
    );
    expect(JSON.stringify(context)).not.toContain("totalLife");
    expect(JSON.stringify(context)).not.toContain("energyShieldTotal");
  });

  it("keeps no evidence distinct from unresolved evidence", () => {
    const empty = buildCharacterContext(input());
    expect(mechanic(empty, "offense", "minion")?.relevance).toBe("no-evidence");
    const unresolved = buildCharacterContext(
      input({
        gearModifiers: [
          {
            slot: "Helmet",
            itemName: "Helm",
            rawText: "Summoned minions are larger",
            semanticId: null,
            locality: "unknown",
            semanticallyUnderstood: false,
          },
        ],
      }),
    );
    expect(mechanic(unresolved, "offense", "minion")?.relevance).toBe(
      "unresolved",
    );
    expect(mechanic(unresolved, "offense", "minion")?.evidence).toEqual([]);
    expect(mechanic(unresolved, "offense", "totem")?.relevance).toBe(
      "no-evidence",
    );
  });

  it("does not read configuration text as mechanic evidence", () => {
    const context = buildCharacterContext(
      input({
        configuration: [{ key: "customMods", value: "Added fire damage" }],
      }),
    );
    expect(mechanic(context, "offense", "fire")?.relevance).toBe("no-evidence");
    expect(context.preservedConfiguration).toEqual([
      { key: "customMods", value: "Added fire damage" },
    ]);
    expect(context.readiness.warnings.join(" ")).toContain(
      "not used as relevance evidence",
    );
  });

  it("does not expose a score, rank, or upgrade", () => {
    const context = buildCharacterContext(input());
    const encoded = JSON.stringify(context);
    expect(encoded).not.toContain("scoreEquipment");
    expect(encoded).not.toContain("rankGear");
    expect(encoded).not.toContain("findWorstItem");
    expect(encoded).not.toContain("recommendReplacement");
    expect("offenseWeights" in context).toBe(false);
  });
});
