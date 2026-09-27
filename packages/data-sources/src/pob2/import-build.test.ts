import { deflateSync } from "node:zlib";
import { developmentPassiveTreeSnapshotDirectory } from "@poe2-helper/data-sources";
import { describe, expect, it } from "vitest";
import { runPassiveAnalysis } from "../../../../apps/web/src/server/analyze-passive-build";
import { importPob2Build, type Pob2TreePin } from "./import-build";

/**
 * These fixtures are synthetic XML compressed the way Path of Building writes an export:
 * a zlib stream, then URL-safe Base64. They are not copied from a player or from PoB Lua.
 */

const pin: Pob2TreePin = {
  nodeIds: new Set([54447, 4739, 18845]),
  source: "https://github.com/grindinggear/poe2-skilltree-export",
  version: "0.5.5",
  commit: "bd87e6512c92b868542eddfb1ba4ea8b6dc2da36",
};
const now = new Date("2026-09-27T00:00:00.000Z");

function exportCode(xml: string, urlSafe = false): string {
  const encoded = deflateSync(Buffer.from(xml, "utf8")).toString("base64");
  if (!urlSafe) return encoded;
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

const item = `Rarity: RARE
Test Wand
Withered Wand
Item Level: 20
Quality: 10
--------
Implicits: 1
+10 to Intelligence
--------
Adds 5 to 8 Fire Damage
{crafted}+5 to Strength`;

function buildXml(options?: {
  nodes?: string;
  weaponSet1?: string;
  ascendancy?: string;
  skills?: string;
  items?: string;
  config?: string;
  treeVersion?: string;
  mainSocketGroup?: string;
  notes?: string;
}): string {
  return `<PathOfBuilding>
  <Build className="Witch" ${options?.ascendancy ?? 'ascendClassName="Infernalist"'} level="16" targetVersion="0_5" name="Paste Witch" ${options?.mainSocketGroup ?? 'mainSocketGroup="1"'}/>
  <Tree activeSpec="1">
    <Spec treeVersion="${options?.treeVersion ?? "0.5.5"}" nodes="${options?.nodes ?? "54447,4739,18845"}">
      <WeaponSet1 nodes="${options?.weaponSet1 ?? ""}"/>
      <WeaponSet2 nodes=""/>
      <WeaponSet3 nodes=""/>
    </Spec>
  </Tree>
  ${options?.skills ?? `<Skills activeSkillSet="1"><SkillSet id="1"><Skill enabled="true" slot="Weapon 1" mainActiveSkill="1"><Gem nameSpec="Fireball" skillId="Fireball" level="8" quality="0" enabled="true"/><Gem nameSpec="Added Cold" skillId="SupportAddedCold" level="1" quality="0" enabled="true"/></Skill></SkillSet></Skills>`}
  ${options?.items ?? `<Items><Item id="1">${item}</Item><Slot name="Weapon 1" itemId="1"/></Items>`}
  ${options?.config ?? `<Config activeConfigSet="1"><ConfigSet id="1" title="Default"><Input name="enemyIsBoss" boolean="true"/><Placeholder number="50" name="enemyFireResist"/></ConfigSet></Config>`}
  ${options?.notes ?? ""}
</PathOfBuilding>`;
}

function imported(xml: string, tree: Pob2TreePin = pin) {
  const result = importPob2Build(exportCode(xml), tree, now);
  if (!result.ok) throw new Error(result.message);
  return result;
}

describe("PoB2 build import", () => {
  it("decodes a raw export and keeps the character fields", () => {
    const result = imported(buildXml());
    expect(result.status).toBe("partial");
    expect(result.normalizationVersion).toBe(3);
    expect(result.document.className).toBe("Witch");
    expect(result.document.level).toBe(16);
    expect(result.document.ascendancy).toBe("Infernalist");
    expect(result.document.sharedPassiveIds).toEqual([54447, 4739, 18845]);
    expect(result.unknownPassiveIds).toEqual([]);
    expect(result.character?.className).toBe("Witch");
    expect(result.checksum.startsWith("sha256:")).toBe(true);
  });

  it("accepts URL-safe Base64 and keeps a stable checksum", () => {
    const xml = buildXml();
    const standard = importPob2Build(exportCode(xml), pin, now);
    const safe = importPob2Build(
      exportCode(xml, true),
      pin,
      new Date("2026-09-27T01:00:00.000Z"),
    );
    expect(standard.ok && safe.ok).toBe(true);
    if (!standard.ok || !safe.ok) return;
    expect(safe.checksum).toBe(standard.checksum);
    expect(safe.document).toEqual(standard.document);
    expect(safe.importedAt).not.toBe(standard.importedAt);
  });

  it("keeps weapon-set ids out of the shared allocation", () => {
    const result = imported(
      buildXml({ nodes: "54447,4739,18845", weaponSet1: "4739" }),
    );
    expect(result.document.sharedPassiveIds).toEqual([54447, 18845]);
    expect(result.document.weaponSetPassiveIds.set1).toEqual([4739]);
    expect(result.document.weaponSetPassiveIds.set2).toEqual([]);
    expect(result.character?.allocatedPassiveIds).toEqual([54447, 18845]);
    expect(result.character?.weaponSetSpecialisations.set1).toEqual([4739]);
  });

  it("does not treat mainActiveSkill as a raw gem index", () => {
    const skills = `<Skills activeSkillSet="1"><SkillSet id="1">
      <Skill enabled="true" slot="Weapon 1" mainActiveSkill="2" mainActiveSkillCalcs="1" label="Clear">
        <Gem nameSpec="Fireball" skillId="Fireball" level="8" quality="0" enabled="true"/>
        <Gem nameSpec="Added Cold" skillId="SupportAddedCold" level="1" quality="0" enabled="true"/>
      </Skill>
    </SkillSet></Skills>`;
    const result = imported(buildXml({ skills }));
    const group = result.document.skillGroups[0];
    expect(group?.rawGems.map((gem) => gem.name)).toEqual([
      "Fireball",
      "Added Cold",
    ]);
    expect(group?.rawGems.every((gem) => gem.role === "unknown")).toBe(true);
    expect(group?.activeSkills).toEqual([]);
    expect(group?.mainActiveSkill).toBe(2);
    expect(group?.mainActiveSkillCalcs).toBe("1");
    expect(result.document.mainSkill).toMatchObject({
      resolved: false,
      reason: "active-display-list-not-reconstructable",
    });
    expect(result.character?.skills).toEqual([]);
    expect(result.unsupported).toContain("mainActiveSkillCalcs interpretation");
  });

  it("leaves the main skill unresolved when PoB2 does not mark one", () => {
    const skills = `<Skills><SkillSet id="1"><Skill enabled="true"><Gem nameSpec="Fireball" skillId="Fireball" level="8" quality="0" enabled="true"/><Gem nameSpec="Added Cold" skillId="SupportAddedCold" level="1" quality="0" enabled="true"/></Skill></SkillSet></Skills>`;
    const result = imported(buildXml({ skills, mainSocketGroup: "" }));
    expect(result.document.mainSkill.resolved).toBe(false);
    expect(result.document.mainSkill.name).toBeNull();
    expect(result.document.skillGroups[0]?.relationship).toBe("unknown");
    expect(
      result.document.skillGroups[0]?.rawGems.every(
        (gem) => gem.role === "unknown",
      ),
    ).toBe(true);
    expect(result.document.mainSkill.reason).toBe("missing-main-socket-group");
    expect(result.character?.skills).toEqual([]);
    expect(result.status).toBe("partial");
  });

  it("preserves equipment slots and raw modifier text", () => {
    const items = `<Items>
      <Item id="1">${item}</Item>
      <Item id="2">Rarity: NORMAL
Iron Helm
--------
+20 to Armour</Item>
      <Slot name="Weapon 1" itemId="1"/>
      <Slot name="Helmet" itemId="2"/>
    </Items>`;
    const result = imported(buildXml({ items }));
    expect(result.document.items.map((entry) => entry.slot)).toEqual([
      "Weapon 1",
      "Helmet",
    ]);
    const weapon = result.document.items[0];
    expect(weapon?.implicitModifiers).toEqual(["+10 to Intelligence"]);
    expect(weapon?.explicitModifiers).toContain("Adds 5 to 8 Fire Damage");
    expect(weapon?.craftedModifiers).toEqual(["+5 to Strength"]);
    expect(weapon?.rawText).toContain("{crafted}+5 to Strength");
    expect(result.character?.equipment[0]?.rawText).toContain(
      "+10 to Intelligence",
    );
    expect(result.character?.equipment[1]?.slot).toBe("Helmet");
  });

  it("preserves configuration and omits notes from the snapshot", () => {
    const result = imported(
      buildXml({ notes: "<Notes>do not execute this note</Notes>" }),
    );
    expect(result.document.configuration).toEqual([
      {
        key: "enemyIsBoss",
        value: "true",
        valueKind: "boolean",
        configSetId: "1",
        source: "pob2-config",
      },
    ]);
    expect(result.document.configurationSets[0]?.placeholderCount).toBe(1);
    expect(result.unsupported).toContain("notes");
    expect(JSON.stringify(result.character)).not.toContain(
      "do not execute this note",
    );
  });

  it("reports a missing optional build as partial and an unknown passive as incompatible", () => {
    const partial = imported(
      buildXml({
        ascendancy: "",
        skills: "",
        items: "",
        config: "",
        treeVersion: "",
        mainSocketGroup: "",
      }),
    );
    expect(partial.status).toBe("partial");
    expect(partial.unavailable).toEqual(
      expect.arrayContaining([
        "ascendancy",
        "skills",
        "equipment",
        "configuration",
      ]),
    );
    expect(partial.character?.className).toBe("Witch");

    const mismatch = imported(buildXml({ nodes: "54447,999999999" }));
    expect(mismatch.status).toBe("incompatible");
    expect(mismatch.unknownPassiveIds).toEqual([999999999]);
    expect(mismatch.document.sharedPassiveIds).toContain(999999999);
  });

  it("distinguishes malformed exports without resolving external entities", () => {
    expect(importPob2Build("", pin, now)).toMatchObject({
      ok: false,
      failureKind: "invalid-encoding",
    });
    expect(importPob2Build("https://pobb.in/example", pin, now)).toMatchObject({
      ok: false,
      failureKind: "unsupported-location",
    });
    expect(importPob2Build("!!!!", pin, now)).toMatchObject({
      ok: false,
      failureKind: "invalid-encoding",
    });
    expect(
      importPob2Build(Buffer.from("hello").toString("base64"), pin, now),
    ).toMatchObject({
      ok: false,
      failureKind: "invalid-compression",
    });
    expect(
      importPob2Build(
        exportCode("<PathOfBuilding><Build></PathOfBuilding>"),
        pin,
        now,
      ),
    ).toMatchObject({
      ok: false,
      failureKind: "invalid-xml",
    });
    expect(importPob2Build(exportCode("<NotPoB/>"), pin, now)).toMatchObject({
      ok: false,
      failureKind: "unsupported-root",
    });
    const entity = importPob2Build(
      exportCode(
        `<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><PathOfBuilding>&xxe;</PathOfBuilding>`,
      ),
      pin,
      now,
    );
    expect(entity).toMatchObject({ ok: false, failureKind: "invalid-xml" });
    if (entity.ok) return;
    expect(entity.message).toMatch(/document type/i);
    expect(entity.message).not.toMatch(/root:/);

    const huge = `<PathOfBuilding>${"A".repeat(1_200_000)}</PathOfBuilding>`;
    expect(importPob2Build(exportCode(huge), pin, now)).toMatchObject({
      ok: false,
      failureKind: "decompression-limit",
    });
  });
});

describe("PoB2 analysis integration", () => {
  const snapshotDirectory = developmentPassiveTreeSnapshotDirectory;

  it("scores a compatible PoB2 tree with the same heuristic as the Witch fixture", () => {
    const code = exportCode(buildXml());
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
      pob2Code: code,
    });
    expect(fixture.ok && pob2.ok).toBe(true);
    if (!fixture.ok || !pob2.ok) return;
    expect(pob2.pob2?.status).toBe("partial");
    expect(pob2.pob2?.className).toBe("Witch");
    expect(pob2.recommendation.rankedCompleteCandidates[0]).toMatchObject({
      nodeIds: fixture.recommendation.rankedCompleteCandidates[0]?.nodeIds,
      heuristicScore:
        fixture.recommendation.rankedCompleteCandidates[0]?.heuristicScore,
    });
    expect(pob2.recommendation.profileVersion).toBe(1);
  });

  it("reports an unknown passive id and does not rank a path", () => {
    const result = runPassiveAnalysis({
      fixtureId: "witch-offensive.json",
      fixtureJson: "",
      objective: "offensive",
      pointBudget: "5",
      snapshotDirectory,
      importSource: "pob2",
      pob2Code: exportCode(buildXml({ nodes: "54447,999999999" })),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("999999999");
    expect(result.pob2?.status).toBe("incompatible");
    expect(result.message).not.toBe("Invalid build");
  });

  it("moves ascendancy nodes out of the main-tree allocation", () => {
    const result = imported(buildXml({ nodes: "54447,32699,4739" }), {
      ...pin,
      nodeIds: new Set([54447, 32699, 4739]),
      ascendancyNodeIds: new Set([32699]),
    });
    expect(result.document.sharedPassiveIds).toEqual([54447, 4739]);
    expect(result.document.ascendancyPassiveIds).toEqual([32699]);
    expect(result.character?.allocatedPassiveIds).toEqual([54447, 4739]);
    expect(result.unknownPassiveIds).toEqual([]);
    expect(result.character?.ascendancy).toBe("Infernalist");
  });

  it("reports an unknown passive id even when ascendancy ids are separated", () => {
    const result = imported(buildXml({ nodes: "54447,999999999" }), {
      ...pin,
      nodeIds: new Set([54447]),
      ascendancyNodeIds: new Set([32699]),
    });
    expect(result.document.sharedPassiveIds).toEqual([54447, 999999999]);
    expect(result.document.ascendancyPassiveIds).toEqual([]);
    expect(result.unknownPassiveIds).toEqual([999999999]);
    expect(result.status).toBe("incompatible");
  });

  it("does not treat a PoB tree key and the GGG pin as the same version", () => {
    const result = imported(buildXml({ treeVersion: "0_5" }));
    expect(result.document.treeVersion).toBe("0_5");
    expect(result.activeTreeVersion).toBe("0.5.5");
    expect(result.treeProvenance).toEqual({
      pobTreeVersion: "0_5",
      activeGggTreeVersion: "0.5.5",
      versionRelationship: {
        namespace: "different",
        comparedDirectly: false,
      },
      passiveIdsRecognized: true,
    });
    expect(result.warnings).toEqual([]);
    expect(result.status).toBe("partial");
  });

  it("reads the active ConfigSet and ignores placeholders and direct Input", () => {
    const selected = imported(
      buildXml({
        config: `<Config activeConfigSet="2">
          <ConfigSet id="1" title="First"><Input name="conditionMoving" boolean="true"/></ConfigSet>
          <ConfigSet id="2" title="Second">
            <Input name="customMods" string="Added line"/>
            <Input name="detonateDeadCorpseLife" number="5000"/>
            <Input boolean="true"/>
            <Placeholder number="50" name="enemyFireResist"/>
          </ConfigSet>
          <Input name="enemyIsBoss" boolean="true"/>
        </Config>`,
      }),
    );
    expect(selected.document.configurationSelection).toBe("active-set");
    expect(selected.document.configuration).toEqual([
      {
        key: "customMods",
        value: "Added line",
        valueKind: "string",
        configSetId: "2",
        source: "pob2-config",
      },
      {
        key: "detonateDeadCorpseLife",
        value: "5000",
        valueKind: "number",
        configSetId: "2",
        source: "pob2-config",
      },
    ]);
    expect(selected.document.configurationSets).toHaveLength(2);
    expect(selected.document.configurationSets[1]?.placeholderCount).toBe(1);
    expect(JSON.stringify(selected.document.configuration)).not.toContain(
      "enemyIsBoss",
    );
    expect(JSON.stringify(selected.document.configuration)).not.toContain(
      "enemyFireResist",
    );

    const direct = imported(
      buildXml({
        config: `<Config><Input name="enemyIsBoss" boolean="true"/></Config>`,
      }),
    );
    expect(direct.document.configurationSelection).toBe("none");
    expect(direct.document.configuration).toEqual([]);

    const unresolved = imported(
      buildXml({
        config: `<Config activeConfigSet="9">
          <ConfigSet id="1"><Input name="conditionFullLife" boolean="true"/></ConfigSet>
          <ConfigSet id="2"><Input name="conditionMoving" boolean="false"/></ConfigSet>
        </Config>`,
      }),
    );
    expect(unresolved.document.configurationSelection).toBe("unresolved");
    expect(unresolved.document.configuration).toEqual([]);
    expect(unresolved.document.configurationSets).toHaveLength(2);
    expect(unresolved.ambiguous).toContain("active config set");
    expect(unresolved.status).not.toBe("incompatible");
  });
});
