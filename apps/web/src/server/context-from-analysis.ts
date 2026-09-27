import {
  buildCharacterContext,
  type CharacterContext,
  type CharacterContextInput,
  type ContextPassiveInput,
  type ContextSkillGroupInput,
} from "@poe2-helper/character-context";
import type { Pob2BuildDocument } from "@poe2-helper/data-sources";
import type { CharacterBuildSnapshot } from "@poe2-helper/domain";
import type { GearAnalysis } from "@poe2-helper/gear-engine";
import {
  extractPassiveNodeStats,
  isAscendancyMember,
  semanticPassiveStats,
  type PassiveGraph,
} from "@poe2-helper/passive-engine";

export function characterContextForAnalysis(input: {
  source: "pob2" | "fixture";
  character: CharacterBuildSnapshot;
  graph: PassiveGraph;
  gear: GearAnalysis;
  document?: Pob2BuildDocument;
}): CharacterContext {
  return buildCharacterContext(contextInput(input));
}

function contextInput(input: {
  source: "pob2" | "fixture";
  character: CharacterBuildSnapshot;
  graph: PassiveGraph;
  gear: GearAnalysis;
  document?: Pob2BuildDocument;
}): CharacterContextInput {
  const document = input.document;
  const ascendancyIds = document
    ? document.ascendancyPassiveIds
    : input.character.allocatedPassiveIds.filter(
        (id) =>
          input.graph.hasNode(id) && isAscendancyMember(input.graph.node(id)),
      );
  const ascendancySet = new Set(ascendancyIds);
  const passiveIds = [
    ...input.character.allocatedPassiveIds,
    ...input.character.weaponSetSpecialisations.set1,
    ...input.character.weaponSetSpecialisations.set2,
    ...input.character.weaponSetSpecialisations.set3,
    ...ascendancyIds,
  ];
  const seen = new Set<number>();
  const passives: ContextPassiveInput[] = [];
  for (const id of passiveIds) {
    if (seen.has(id) || !input.graph.hasNode(id)) continue;
    seen.add(id);
    passives.push(passiveInput(input.graph, id, ascendancySet.has(id)));
  }
  return {
    source: input.source,
    className: input.character.className,
    ascendancyName: document?.ascendancy ?? input.character.ascendancy ?? null,
    ascendancyPassiveIds: [...ascendancyIds],
    mainSkill: mainSkill(document, input.character),
    skillGroups: skillGroups(document, input.character),
    passives,
    gearModifiers: input.gear.items.flatMap((item) =>
      item.modifiers.map((modifier) => ({
        slot: item.sourceSlot,
        itemName: item.name,
        rawText: modifier.rawText,
        semanticId: modifier.semanticId,
        locality: modifier.locality,
        semanticallyUnderstood: modifier.semanticallyUnderstood,
      })),
    ),
    configuration:
      document?.configuration.map((entry) => ({
        key: entry.key,
        value: entry.value,
      })) ?? [],
  };
}

function mainSkill(
  document: Pob2BuildDocument | undefined,
  character: CharacterBuildSnapshot,
): CharacterContextInput["mainSkill"] {
  if (!document) {
    return character.skills.length === 0
      ? { status: "missing" }
      : { status: "unresolved", reason: "fixture-has-no-main-skill" };
  }
  if (document.skillGroups.length === 0) return { status: "missing" };
  if (!document.mainSkill.resolved || document.mainSkill.skillId === null) {
    return {
      status: "unresolved",
      reason: document.mainSkill.reason ?? "unresolved",
    };
  }
  return {
    status: "resolved",
    groupId: document.mainSkill.groupId ?? "",
    name: document.mainSkill.name ?? document.mainSkill.skillId,
    skillId: document.mainSkill.skillId,
  };
}

function skillGroups(
  document: Pob2BuildDocument | undefined,
  character: CharacterBuildSnapshot,
): ContextSkillGroupInput[] {
  if (!document) {
    return character.skills.map((skill, index) => ({
      id: `fixture-${index + 1}`,
      label: null,
      relationship: "unknown" as const,
      activeSkills: [{ name: skill.name, skillId: skill.name, mechanics: [] }],
      supports: (skill.supportNames ?? []).map((name) => ({
        name,
        skillId: null,
        mechanics: [],
      })),
      unknownGems: [],
    }));
  }
  return document.skillGroups.map((group) => ({
    id: group.id,
    label: group.label,
    relationship: group.relationship,
    activeSkills: group.activeSkills.map((skill) => ({
      name: skill.name,
      skillId: skill.skillId,
      mechanics: [],
    })),
    supports: group.rawGems
      .filter((gem) => gem.role === "support")
      .map((gem) => ({
        name: gem.name,
        skillId: gem.skillId,
        mechanics: [],
      })),
    unknownGems: group.rawGems
      .filter((gem) => gem.role === "unknown")
      .map((gem) => ({ name: gem.name, skillId: gem.skillId })),
  }));
}

function passiveInput(
  graph: PassiveGraph,
  id: number,
  ascendancy: boolean,
): ContextPassiveInput {
  const node = graph.node(id);
  const extracted = extractPassiveNodeStats(node);
  const semanticIds: string[] = [];
  const conditionalSemanticIds: string[] = [];
  const unrecognizedLines: string[] = [];
  for (const line of extracted.lines) {
    if (line.status !== "recognized") {
      unrecognizedLines.push(line.raw);
      continue;
    }
    const stats = semanticPassiveStats(line);
    if (!stats) {
      unrecognizedLines.push(line.raw);
      continue;
    }
    for (const stat of stats) {
      if (stat.conditions && stat.conditions.length > 0) {
        conditionalSemanticIds.push(stat.semanticId);
      } else {
        semanticIds.push(stat.semanticId);
      }
    }
  }
  return {
    nodeId: id,
    name: node.name,
    source: ascendancy ? "ascendancy" : "passive",
    semanticIds,
    conditionalSemanticIds,
    unrecognizedLines,
  };
}
