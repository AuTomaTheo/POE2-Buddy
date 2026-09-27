import { readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { developmentPassiveTreeSnapshotDirectory } from "@poe2-helper/data-sources";
import { runPassiveAnalysis } from "../apps/web/src/server/analyze-passive-build";

const snapshotDirectory = developmentPassiveTreeSnapshotDirectory;

const helmet = `Rarity: RARE
Ash Hood
Wrapped Greathelm
--------
Implicits: 0
--------
+100 to maximum Life
+30% to Fire Resistance
Grants a unique effect`;

function exportCode(xml: string): string {
  return deflateSync(Buffer.from(xml, "utf8")).toString("base64");
}

const pob2Code = exportCode(`<PathOfBuilding2>
  <Build className="Witch" ascendClassName="Infernalist" level="16" targetVersion="0_1" mainSocketGroup="1"/>
  <Tree activeSpec="1">
    <Spec treeVersion="0_5" nodes="54447,4739,18845">
      <WeaponSet1 nodes=""/>
      <WeaponSet2 nodes=""/>
      <WeaponSet3 nodes=""/>
    </Spec>
  </Tree>
  <Skills activeSkillSet="1"><SkillSet id="1"><Skill enabled="true" slot="Weapon 1" mainActiveSkill="1"><Gem nameSpec="Fireball" skillId="FireballPlayer" gemId="Metadata/Items/Gem/SkillGemFireball" variantId="Fireball" level="8" quality="0" enabled="true"/></Skill></SkillSet></Skills>
  <Items>
    <Item id="1">${helmet}</Item>
    <Slot name="Helmet" itemId="1"/>
  </Items>
  <Config activeConfigSet="1"><ConfigSet id="1" title="Default"><Input name="conditionFullLife" boolean="true"/></ConfigSet></Config>
</PathOfBuilding2>`);

describe("gear analysis integration", () => {
  it("keeps the witch passive recommendation and adds gear readiness", () => {
    const result = runPassiveAnalysis({
      fixtureId: "witch-offensive.json",
      fixtureJson: "",
      objective: "offensive",
      pointBudget: "5",
      snapshotDirectory,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recommendation.rankedCompleteCandidates[0]).toMatchObject({
      nodeIds: [1755, 41965],
      heuristicScore: 32,
    });
    expect(result.recommendation.profileVersion).toBe(1);
    expect(result.gear.provider).toBe("fixture");
    expect(result.gear.gearNormalizationVersion).toBe(3);
    expect(result.gear.items[0]).toMatchObject({
      sourceSlot: "Weapon1",
      canonicalSlot: "main-hand",
      name: "Fixture Wand",
    });
    expect(result.gear.readiness.status).not.toBe(
      result.recommendation.selectionClaim,
    );
    expect(result.gear.readiness.status).toBe("partial");
  });

  it("sends PoB2 equipment through the same gear analysis without changing the passive result", () => {
    const fixture = runPassiveAnalysis({
      fixtureId: "witch-offensive.json",
      fixtureJson: "",
      objective: "offensive",
      pointBudget: "5",
      snapshotDirectory,
    });
    const pob2 = runPassiveAnalysis({
      fixtureId: "witch-offensive.json",
      fixtureJson: "",
      objective: "offensive",
      pointBudget: "5",
      snapshotDirectory,
      importSource: "pob2",
      pob2Code,
    });
    expect(fixture.ok && pob2.ok).toBe(true);
    if (!fixture.ok || !pob2.ok) return;
    expect(pob2.recommendation.rankedCompleteCandidates).toEqual(
      fixture.recommendation.rankedCompleteCandidates,
    );
    expect(pob2.recommendation.incompleteCandidates).toEqual(
      fixture.recommendation.incompleteCandidates,
    );
    expect(pob2.pob2?.status).not.toBe("incompatible");
    const helmetItem = pob2.gear.items.find(
      (entry) => entry.canonicalSlot === "helmet",
    );
    expect(helmetItem?.understoodSemanticIds).toEqual([
      "maximum-life",
      "fire-resistance",
    ]);
    expect(helmetItem?.unsupportedLines).toEqual(["Grants a unique effect"]);
    expect(pob2.gear.provider).toBe("pob2");
    expect(pob2.gear.readiness).not.toBe(pob2.recommendation);
  });

  it("does not call the network or the economy adapter", () => {
    const directory = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../packages/gear-engine/src",
    );
    const sources = [
      "analyze-equipment.ts",
      "parse-modifier.ts",
      "parse-item.ts",
      "slots.ts",
      "families.ts",
    ].map((name) => readFileSync(path.join(directory, name), "utf8"));
    const combined = sources.join("\n");
    expect(combined).not.toContain("poe.ninja");
    expect(combined).not.toContain("fetch(");
    expect(combined).not.toContain("findWorstItem");
    expect(combined).not.toContain("rankGear");
    expect(combined).not.toContain("scoreEquipment");
  });

  it("reads the real PoB2 gear export without ranking items", () => {
    const fixtureDirectory = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../packages/data-sources/src/pob2/fixtures/real",
    );
    const code = readFileSync(
      path.join(fixtureDirectory, "F.code.txt"),
      "utf8",
    ).trim();
    const truth = JSON.parse(
      readFileSync(path.join(fixtureDirectory, "F.truth.json"), "utf8"),
    ) as {
      items: Array<{ slot: string; rarity: string; raw: string }>;
    };
    const result = runPassiveAnalysis({
      fixtureId: "witch-offensive.json",
      fixtureJson: "",
      objective: "offensive",
      pointBudget: "5",
      snapshotDirectory,
      importSource: "pob2",
      pob2Code: code,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const bySlot = new Map(
      result.gear.items.map((entry) => [entry.sourceSlot, entry]),
    );
    expect(bySlot.get("Weapon 1")?.canonicalSlot).toBe("main-hand");
    expect(bySlot.get("Weapon 2")?.canonicalSlot).toBe("off-hand");
    expect(bySlot.get("Weapon 1 Swap")?.canonicalSlot).toBe(
      "weapon-set-2-main-hand",
    );
    expect(bySlot.get("Ring 1")?.canonicalSlot).toBe("ring-1");
    expect(bySlot.get("Ring 2")?.canonicalSlot).toBe("ring-2");
    const bodyTruth = truth.items.find((entry) => entry.slot === "Body Armour");
    const body = bySlot.get("Body Armour");
    expect(bodyTruth?.raw).toContain("+100 to maximum Life");
    expect(bodyTruth?.raw).toContain("+20 to maximum Mana");
    expect(body?.rarity).toBe("RARE");
    expect(body?.understoodSemanticIds).toEqual([
      "maximum-life",
      "fire-resistance",
      "strength",
    ]);
    expect(body?.unsupportedLines).toEqual(["+20 to maximum Mana"]);
    const helmet = bySlot.get("Helmet");
    expect(helmet?.rarity).toBe("UNIQUE");
    expect(
      helmet?.modifiers.find(
        (modifier) => modifier.semanticId === "increased-armour",
      )?.semanticallyUnderstood,
    ).toBe(false);
    expect(helmet?.unsupportedLines).toContain("20% reduced Light Radius");
    expect(
      result.gear.diagnostics.some((diagnostic) =>
        diagnostic.message.toLowerCase().includes("weak"),
      ),
    ).toBe(false);
    expect(
      bySlot
        .get("Gloves")
        ?.modifiers.find((modifier) => modifier.semanticId === "dexterity")
        ?.sourceSection,
    ).toBe("fractured");
    expect(
      bySlot
        .get("Gloves")
        ?.modifiers.find((modifier) => modifier.semanticId === "attack-speed")
        ?.locality,
    ).toBe("unknown");
    const focus = bySlot
      .get("Weapon 2")
      ?.modifiers.find(
        (modifier) => modifier.semanticId === "maximum-energy-shield",
      );
    expect(focus?.rawText).toBe("+40 to maximum Energy Shield");
    expect(focus?.locality).toBe("local");
    expect(focus?.semanticallyUnderstood).toBe(true);
    expect(
      bySlot
        .get("Body Armour")
        ?.modifiers.find(
          (modifier) => modifier.semanticId === "fire-resistance",
        )?.locality,
    ).toBe("global");
    expect(
      bySlot
        .get("Body Armour")
        ?.modifiers.find((modifier) => modifier.semanticId === "maximum-life")
        ?.locality,
    ).toBe("global");
    expect(
      bySlot
        .get("Weapon 1")
        ?.modifiers.find(
          (modifier) => modifier.semanticId === "flat-fire-damage",
        )?.locality,
    ).toBe("local");
    expect(result.gear.gearNormalizationVersion).toBe(3);
    const locality = JSON.parse(
      readFileSync(path.join(fixtureDirectory, "F.locality.json"), "utf8"),
    ) as {
      cases: Array<{
        slot: string;
        line: string;
        expectedLocality: string;
        expectedUnderstood: boolean;
      }>;
    };
    for (const localityCase of locality.cases) {
      const saved = truth.items.find(
        (entry) => entry.slot === localityCase.slot,
      );
      expect(saved?.raw).toContain(localityCase.line);
      const modifier = bySlot
        .get(localityCase.slot)
        ?.modifiers.find((entry) => entry.rawText === localityCase.line);
      expect(modifier?.locality).toBe(localityCase.expectedLocality);
      expect(modifier?.semanticallyUnderstood).toBe(
        localityCase.expectedUnderstood,
      );
    }
    expect(result.recommendation.profileVersion).toBe(1);
    expect(JSON.stringify(result.gear)).not.toContain("worst");
  }, 30_000);

  it("reads the real Cast Speed and Elemental Damage export", () => {
    const fixtureDirectory = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../packages/data-sources/src/pob2/fixtures/real",
    );
    const code = readFileSync(
      path.join(fixtureDirectory, "G.code.txt"),
      "utf8",
    ).trim();
    const truth = JSON.parse(
      readFileSync(path.join(fixtureDirectory, "G.truth.json"), "utf8"),
    ) as { items: Array<{ slot: string; raw: string }> };
    const locality = JSON.parse(
      readFileSync(path.join(fixtureDirectory, "G.locality.json"), "utf8"),
    ) as {
      cases: Array<{
        slot: string;
        line: string;
        expectedLocality: string;
        expectedUnderstood: boolean;
      }>;
    };
    const result = runPassiveAnalysis({
      fixtureId: "witch-offensive.json",
      fixtureJson: "",
      objective: "offensive",
      pointBudget: "5",
      snapshotDirectory,
      importSource: "pob2",
      pob2Code: code,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const bySlot = new Map(
      result.gear.items.map((entry) => [entry.sourceSlot, entry]),
    );
    for (const localityCase of locality.cases) {
      const saved = truth.items.find(
        (entry) => entry.slot === localityCase.slot,
      );
      expect(saved?.raw).toContain(localityCase.line);
      const modifier = bySlot
        .get(localityCase.slot)
        ?.modifiers.find((entry) => entry.rawText === localityCase.line);
      expect(modifier?.locality).toBe(localityCase.expectedLocality);
      expect(modifier?.semanticallyUnderstood).toBe(
        localityCase.expectedUnderstood,
      );
      expect(modifier?.rawText).toBe(localityCase.line);
    }
    const wand = bySlot.get("Weapon 1");
    expect(wand?.confidence).not.toBe("complete");
    expect(result.recommendation.profileVersion).toBe(1);
    expect(JSON.stringify(result.gear)).not.toContain("worst");
    expect(JSON.stringify(result.gear)).not.toContain("scoreEquipment");
  }, 30_000);
});
