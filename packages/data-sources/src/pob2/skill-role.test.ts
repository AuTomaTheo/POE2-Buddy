import { deflateSync } from "node:zlib";
import { developmentPassiveTreeSnapshotDirectory } from "@poe2-helper/data-sources";
import { describe, expect, it } from "vitest";
import { runPassiveAnalysis } from "../../../../apps/web/src/server/analyze-passive-build";
import { importPob2Build, type Pob2TreePin } from "./import-build";

/**
 * These exports use the Path of Building (PoE2) 0.23.1 save shape and real gem ids
 * from that install. They were written for parser checks. They are not a player
 * character and they are not a copied community build. The expected roles come from
 * that version's gem and skill data, where mainActiveSkill indexes the display list.
 */

const pin: Pob2TreePin = {
  nodeIds: new Set([54447, 4739, 18845]),
  source: "https://github.com/grindinggear/poe2-skilltree-export",
  version: "0.5.5",
  commit: "bd87e6512c92b868542eddfb1ba4ea8b6dc2da36",
};
const now = new Date("2026-09-27T00:00:00.000Z");

function exportCode(xml: string): string {
  return deflateSync(Buffer.from(xml, "utf8")).toString("base64");
}

function gem(
  name: string,
  skillId: string,
  gemId: string,
  variantId: string,
  level = 1,
): string {
  return `<Gem nameSpec="${name}" skillId="${skillId}" gemId="${gemId}" variantId="${variantId}" level="${level}" quality="0" enabled="true" enableGlobal1="true" enableGlobal2="true" count="1"/>`;
}

const fireball = gem(
  "Fireball",
  "FireballPlayer",
  "Metadata/Items/Gem/SkillGemFireball",
  "Fireball",
  8,
);
const spark = gem(
  "Spark",
  "SparkPlayer",
  "Metadata/Items/Gems/SkillGemSpark",
  "Spark",
  12,
);
const magnified = gem(
  "Magnified Area II",
  "SupportMagnifiedAreaPlayerTwo",
  "Metadata/Items/Gems/SupportGemMagnifiedEffectTwo",
  "MagnifiedAreaSupportTwo",
);
const lightning = gem(
  "Lightning Attunement",
  "SupportAddedLightningDamagePlayer",
  "Metadata/Items/Gems/SupportGemLightningInfusion",
  "AddedLightningDamageSupport",
);
const shockwave = gem(
  "Shockwave Totem",
  "ShockwaveTotemPlayer",
  "Metadata/Items/Gems/SkillGemShockwaveTotem",
  "ShockwaveTotem",
  10,
);

function build(skills: string, mainSocketGroup = 1): string {
  return `<PathOfBuilding2>
  <Build className="Witch" ascendClassName="Infernalist" level="16" targetVersion="0_1" name="Role Check" mainSocketGroup="${mainSocketGroup}"/>
  <Tree activeSpec="1">
    <Spec treeVersion="0.5.5" nodes="54447,4739,18845">
      <WeaponSet1 nodes=""/>
      <WeaponSet2 nodes=""/>
      <WeaponSet3 nodes=""/>
    </Spec>
  </Tree>
  ${skills}
  <Items><Item id="1">Rarity: NORMAL
Withered Wand</Item><Slot name="Weapon 1" itemId="1"/></Items>
  <Config activeConfigSet="1"><ConfigSet id="1" title="Default"><Input name="enemyIsBoss" boolean="true"/></ConfigSet></Config>
</PathOfBuilding2>`;
}

function imported(xml: string) {
  const result = importPob2Build(exportCode(xml), pin, now);
  if (!result.ok) throw new Error(result.message);
  return result;
}

describe("PoB2 skill-role fidelity", () => {
  it("resolves one active skill and its support gems", () => {
    const result = imported(
      build(
        `<Skills activeSkillSet="1"><SkillSet id="1"><Skill enabled="true" slot="Weapon 1" mainActiveSkill="1" mainActiveSkillCalcs="1">${fireball}${magnified}${lightning}</Skill></SkillSet></Skills>`,
      ),
    );
    expect(result.status).toBe("compatible");
    expect(result.document.mainSkill).toMatchObject({
      resolved: true,
      name: "Fireball",
      skillId: "FireballPlayer",
      sourceGemIndex: 1,
      reason: null,
    });
    expect(
      result.document.skillGroups[0]?.rawGems.map((gem) => gem.role),
    ).toEqual(["active", "support", "support"]);
    expect(result.character?.skills[0]?.supportNames).toEqual([
      "Magnified Area II",
      "Lightning Attunement",
    ]);
    expect(result.document.sharedPassiveIds).toEqual([54447, 4739, 18845]);
  });

  it("stays compatible when the PoB tree key is 0_5 and the pin is 0.5.5", () => {
    const result = imported(
      build(
        `<Skills activeSkillSet="1"><SkillSet id="1"><Skill enabled="true" slot="Weapon 1" mainActiveSkill="1" mainActiveSkillCalcs="1">${fireball}${magnified}${lightning}</Skill></SkillSet></Skills>`,
      ).replace('treeVersion="0.5.5"', 'treeVersion="0_5"'),
    );
    expect(result.status).toBe("compatible");
    expect(result.warnings).toEqual([]);
    expect(result.document.treeVersion).toBe("0_5");
    expect(result.activeTreeVersion).toBe("0.5.5");
    expect(result.treeProvenance.versionRelationship).toEqual({
      namespace: "different",
      comparedDirectly: false,
    });
    expect(result.treeProvenance.passiveIdsRecognized).toBe(true);
  });

  it("selects the explicit main socket group and keeps the other group", () => {
    const result = imported(
      build(
        `<Skills activeSkillSet="1"><SkillSet id="1">
          <Skill enabled="true" mainActiveSkill="1">${spark}</Skill>
          <Skill enabled="true" mainActiveSkill="1">${fireball}${magnified}</Skill>
        </SkillSet></Skills>`,
        2,
      ),
    );
    expect(result.document.mainSkill).toMatchObject({
      resolved: true,
      name: "Fireball",
      groupId: "2",
    });
    expect(result.document.skillGroups[0]?.activeSkills[0]?.name).toBe("Spark");
    expect(result.character?.skills[0]?.supportNames).toBeUndefined();
    expect(result.character?.skills[1]?.supportNames).toEqual([
      "Magnified Area II",
    ]);
    expect(result.document.activeSkillSetId).toBe("1");
  });

  it("uses the display-skill list when one gem grants two active effects", () => {
    const result = imported(
      build(
        `<Skills activeSkillSet="1"><SkillSet id="1"><Skill enabled="true" mainActiveSkill="2">${shockwave}${fireball}${magnified}</Skill></SkillSet></Skills>`,
      ),
    );
    expect(
      result.document.skillGroups[0]?.activeSkills.map((skill) => skill.name),
    ).toEqual(["Shockwave Totem", "Shockwave Slam", "Fireball"]);
    expect(result.document.mainSkill).toMatchObject({
      resolved: true,
      name: "Shockwave Slam",
      skillId: "ShockwaveTotemQuakePlayer",
      sourceGemIndex: 1,
    });
    expect(
      result.document.skillGroups[0]?.rawGems.map((gem) => gem.role),
    ).toEqual(["active", "active", "support"]);
    expect(result.character?.skills[0]?.name).toBe("Shockwave Slam");
    expect(result.character?.skills[0]?.supportNames).toEqual([
      "Magnified Area II",
    ]);
  });

  it("leaves an unknown gem unresolved without blocking the tree", () => {
    const xml = build(
      `<Skills activeSkillSet="1"><SkillSet id="1"><Skill enabled="true" mainActiveSkill="1"><Gem nameSpec="Mystery" skillId="NotInCatalogPlayer" level="1" quality="0" enabled="true"/></Skill></SkillSet></Skills>`,
    );
    const result = imported(xml);
    expect(result.status).toBe("partial");
    expect(result.document.mainSkill).toMatchObject({
      resolved: false,
      reason: "active-display-list-not-reconstructable",
    });
    expect(result.document.skillGroups[0]?.rawGems[0]?.role).toBe("unknown");
    expect(result.unknownPassiveIds).toEqual([]);
    expect(result.character?.allocatedPassiveIds).toEqual([54447, 4739, 18845]);

    const analysis = runPassiveAnalysis({
      fixtureId: "witch-offensive.json",
      fixtureJson: "",
      objective: "offensive",
      pointBudget: "5",
      snapshotDirectory: developmentPassiveTreeSnapshotDirectory,
      importSource: "pob2",
      pob2Code: exportCode(xml),
    });
    expect(analysis.ok).toBe(true);
    if (!analysis.ok) return;
    expect(analysis.pob2?.status).toBe("partial");
    expect(analysis.pob2?.mainSkillResolved).toBe(false);
    expect(analysis.pob2?.unresolvedRoleGemCount).toBe(1);
    expect(analysis.recommendation.rankedCompleteCandidates[0]).toMatchObject({
      nodeIds: [1755, 41965],
      heuristicScore: 32,
    });
    expect(analysis.recommendation.profileVersion).toBe(1);
  });

  it("reports an invalid mainActiveSkill without rejecting the document", () => {
    const result = imported(
      build(
        `<Skills activeSkillSet="1"><SkillSet id="1"><Skill enabled="true" mainActiveSkill="abc">${fireball}</Skill></SkillSet></Skills>`,
      ),
    );
    expect(result.ok).toBe(true);
    expect(result.document.mainSkill.reason).toBe("invalid-main-active-skill");
    expect(result.document.skillGroups[0]?.rawGems[0]?.role).toBe("active");
    expect(result.status).toBe("partial");
  });
});
