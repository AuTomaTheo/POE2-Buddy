import type { CharacterBuildSnapshot } from "@poe2-helper/domain";
import { parseCharacterBuildSnapshot } from "@poe2-helper/domain";
import {
  Pob2DecodeError,
  decodePob2Export,
  type Pob2FailureKind,
} from "./decode";
import { pob2EffectFact, pob2GemFact } from "./skill-roles";
import { parsePob2Xml, Pob2XmlError, type XmlElement } from "./xml";

export const POB2_NORMALIZATION_VERSION = 3;

export type Pob2TreePin = {
  nodeIds: ReadonlySet<number>;
  /**
   * Node ids the active snapshot marks as ascendancy members.
   * Build this with `pob2AscendancyNodeIds`. Ids absent from this set stay
   * on the main-tree list and are still checked as unknown when missing
   * from `nodeIds`.
   */
  ascendancyNodeIds?: ReadonlySet<number>;
  source: string;
  version?: string;
  commit?: string;
  checksum?: string;
};

/**
 * Same membership rule as the passive engine: an ascendancy id or the
 * `ascendancy-start` kind. Names, positions, and id ranges are not used.
 */
export function pob2AscendancyNodeIds(
  nodes: readonly {
    id: number;
    ascendancyId?: string;
    kinds: readonly string[];
  }[],
): Set<number> {
  const ids = new Set<number>();
  for (const node of nodes) {
    if (
      node.ascendancyId !== undefined ||
      node.kinds.includes("ascendancy-start")
    ) {
      ids.add(node.id);
    }
  }
  return ids;
}

export type Pob2GemRole = "active" | "support" | "unknown";

export type Pob2SkillUnresolvedReason =
  | "missing-main-socket-group"
  | "missing-main-active-skill"
  | "invalid-main-active-skill"
  | "active-skill-index-out-of-range"
  | "active-display-list-not-reconstructable";

export type Pob2RawGem = {
  name: string | null;
  skillId: string | null;
  gemId: string | null;
  variantId: string | null;
  level: number | null;
  quality: number | null;
  enabled: boolean | null;
  enableGlobal1: boolean | null;
  enableGlobal2: boolean | null;
  count: number | null;
  role: Pob2GemRole;
};

export type Pob2ActiveSkill = {
  index: number;
  name: string;
  skillId: string;
  sourceGemIndex: number;
};

export type Pob2SkillGroup = {
  id: string;
  label: string | null;
  slot: string | null;
  enabled: boolean | null;
  mainActiveSkill: number | null;
  mainActiveSkillCalcs: string | null;
  relationship: "linked" | "unknown";
  unresolvedReason: Pob2SkillUnresolvedReason | null;
  rawGems: readonly Pob2RawGem[];
  activeSkills: readonly Pob2ActiveSkill[];
};

export type Pob2Item = {
  id: string;
  slot: string;
  name: string | null;
  baseType: string | null;
  rarity: string | null;
  itemLevel: number | null;
  quality: number | null;
  corrupted: boolean;
  implicitModifiers: readonly string[];
  explicitModifiers: readonly string[];
  craftedModifiers: readonly string[];
  enchantModifiers: readonly string[];
  fracturedModifiers: readonly string[];
  rawText: string;
};

export type Pob2ConfigValueKind = "string" | "boolean" | "number";

export type Pob2ConfigValue = {
  key: string;
  value: string;
  valueKind: Pob2ConfigValueKind;
  configSetId: string | null;
  source: "pob2-config";
};

export type Pob2ConfigSet = {
  id: string | null;
  title: string | null;
  inputs: readonly Pob2ConfigValue[];
  placeholderCount: number;
};

export type Pob2ConfigSelection =
  "active-set" | "only-set" | "unresolved" | "none";

export type Pob2BuildDocument = {
  formatVersion: string | null;
  treeVersion: string | null;
  buildName: string | null;
  className: string | null;
  ascendancy: string | null;
  level: number | null;
  mainSocketGroup: number | null;
  activeSkillSetId: string | null;
  sharedPassiveIds: readonly number[];
  ascendancyPassiveIds: readonly number[];
  weaponSetPassiveIds: {
    set1: readonly number[];
    set2: readonly number[];
    set3: readonly number[];
  };
  skillGroups: readonly Pob2SkillGroup[];
  mainSkill: {
    resolved: boolean;
    groupId: string | null;
    name: string | null;
    skillId: string | null;
    sourceGemIndex: number | null;
    reason: Pob2SkillUnresolvedReason | null;
  };
  items: readonly Pob2Item[];
  configuration: readonly Pob2ConfigValue[];
  configurationSets: readonly Pob2ConfigSet[];
  activeConfigSetId: string | null;
  configurationSelection: Pob2ConfigSelection;
};

export type Pob2ImportStatus = "compatible" | "partial" | "incompatible";

export type Pob2ImportSuccess = {
  ok: true;
  source: "pob2";
  status: Pob2ImportStatus;
  document: Pob2BuildDocument;
  character: CharacterBuildSnapshot | null;
  unknownPassiveIds: readonly number[];
  unavailable: readonly string[];
  unsupported: readonly string[];
  ambiguous: readonly string[];
  warnings: readonly string[];
  checksum: string;
  importedAt: string;
  normalizationVersion: typeof POB2_NORMALIZATION_VERSION;
  activeTreeVersion: string | null;
  treeProvenance: {
    pobTreeVersion: string | null;
    activeGggTreeVersion: string | null;
    versionRelationship: {
      namespace: "different";
      comparedDirectly: false;
    };
    passiveIdsRecognized: boolean;
  };
};

export type Pob2ImportFailure = {
  ok: false;
  failureKind: Pob2FailureKind;
  message: string;
};

export type Pob2ImportResult = Pob2ImportSuccess | Pob2ImportFailure;

export function importPob2Build(
  code: string,
  tree: Pob2TreePin,
  now = new Date(),
): Pob2ImportResult {
  let decoded: { xml: string; checksum: string };
  try {
    decoded = decodePob2Export(code);
  } catch (error) {
    if (error instanceof Pob2DecodeError) {
      return {
        ok: false,
        failureKind: error.failureKind,
        message: error.message,
      };
    }
    throw error;
  }

  let root: XmlElement;
  try {
    root = parsePob2Xml(decoded.xml);
  } catch (error) {
    if (error instanceof Pob2XmlError) {
      return { ok: false, failureKind: "invalid-xml", message: error.message };
    }
    throw error;
  }
  if (root.name !== "PathOfBuilding" && root.name !== "PathOfBuilding2") {
    return {
      ok: false,
      failureKind: "unsupported-root",
      message:
        "The PoB2 document root is not PathOfBuilding or PathOfBuilding2.",
    };
  }

  const importedAt = now.toISOString();
  const parsed = readDocument(root);
  const ascendancyNodeIds = tree.ascendancyNodeIds ?? new Set<number>();
  const ascendancyPassiveIds = parsed.document.sharedPassiveIds.filter((id) =>
    ascendancyNodeIds.has(id),
  );
  const sharedPassiveIds = parsed.document.sharedPassiveIds.filter(
    (id) => !ascendancyNodeIds.has(id),
  );
  const document: Pob2BuildDocument = {
    ...parsed.document,
    sharedPassiveIds,
    ascendancyPassiveIds,
  };
  const unknownPassiveIds = uniqueUnknown(
    [
      ...document.sharedPassiveIds,
      ...document.ascendancyPassiveIds,
      ...document.weaponSetPassiveIds.set1,
      ...document.weaponSetPassiveIds.set2,
      ...document.weaponSetPassiveIds.set3,
    ],
    tree.nodeIds,
  );
  const warnings = [...parsed.warnings];
  const unavailable = [...parsed.unavailable];
  const character = buildCharacter(document, tree, importedAt);
  const status = importStatus({
    document,
    unknownPassiveIds,
    unavailable,
    warnings,
    ambiguous: parsed.ambiguous,
    character,
  });

  return {
    ok: true,
    source: "pob2",
    status,
    document,
    character,
    unknownPassiveIds,
    unavailable,
    unsupported: parsed.unsupported,
    ambiguous: parsed.ambiguous,
    warnings,
    checksum: decoded.checksum,
    importedAt,
    normalizationVersion: POB2_NORMALIZATION_VERSION,
    activeTreeVersion: tree.version ?? null,
    treeProvenance: {
      pobTreeVersion: document.treeVersion,
      activeGggTreeVersion: tree.version ?? null,
      versionRelationship: {
        namespace: "different",
        comparedDirectly: false,
      },
      passiveIdsRecognized: unknownPassiveIds.length === 0,
    },
  };
}

function importStatus(input: {
  document: Pob2BuildDocument;
  unknownPassiveIds: readonly number[];
  unavailable: readonly string[];
  warnings: readonly string[];
  ambiguous: readonly string[];
  character: CharacterBuildSnapshot | null;
}): Pob2ImportStatus {
  if (
    input.character === null ||
    input.unknownPassiveIds.length > 0 ||
    input.ambiguous.includes("active tree spec")
  ) {
    return "incompatible";
  }
  const partial =
    input.document.ascendancy === null ||
    input.document.skillGroups.length === 0 ||
    input.document.items.length === 0 ||
    !input.document.mainSkill.resolved ||
    input.document.skillGroups.some(
      (group) =>
        group.unresolvedReason !== null ||
        group.rawGems.some((gem) => gem.role === "unknown"),
    ) ||
    input.warnings.length > 0 ||
    input.unavailable.includes("tree version") ||
    input.unavailable.includes("configuration");
  return partial ? "partial" : "compatible";
}

function buildCharacter(
  document: Pob2BuildDocument,
  tree: Pob2TreePin,
  importedAt: string,
): CharacterBuildSnapshot | null {
  if (document.className === null || document.level === null) return null;
  const skills = document.skillGroups.flatMap((group) => {
    const selected = group.activeSkills.find(
      (skill) => skill.index === group.mainActiveSkill,
    );
    if (!selected || group.unresolvedReason !== null) return [];
    const supportNames = group.rawGems
      .filter((gem) => gem.role === "support" && gem.name)
      .map((gem) => gem.name ?? "");
    return [
      {
        name: selected.name,
        ...(supportNames.length > 0 ? { supportNames } : {}),
      },
    ];
  });
  return parseCharacterBuildSnapshot({
    ...(document.buildName ? { name: document.buildName } : {}),
    level: document.level,
    className: document.className,
    ...(document.ascendancy ? { ascendancy: document.ascendancy } : {}),
    allocatedPassiveIds: document.sharedPassiveIds,
    weaponSetSpecialisations: document.weaponSetPassiveIds,
    questStats: [],
    skills,
    equipment: document.items.map((item) => ({
      slot: item.slot,
      name: item.name ?? item.baseType ?? item.slot,
      ...(item.baseType ? { baseType: item.baseType } : {}),
      ...(item.rarity ? { rarity: item.rarity } : {}),
      ...(item.rawText.length > 0 ? { rawText: item.rawText } : {}),
    })),
    sourceVersion: {
      source: tree.source,
      ...(tree.version ? { version: tree.version } : {}),
      ...(tree.commit ? { commit: tree.commit } : {}),
      fetchedAt: importedAt,
    },
  });
}

function readDocument(root: XmlElement): {
  document: Pob2BuildDocument;
  unavailable: string[];
  unsupported: string[];
  ambiguous: string[];
  warnings: string[];
} {
  const unavailable: string[] = [];
  const unsupported: string[] = [];
  const ambiguous: string[] = [];
  const warnings: string[] = [];
  const build = child(root, "Build");
  const className = textAttr(build, "className");
  const ascendancy = textAttr(build, "ascendClassName");
  const level = intAttr(build, "level");
  const formatVersion = textAttr(build, "targetVersion");
  const buildName = textAttr(build, "name");
  const mainSocketGroup = intAttr(build, "mainSocketGroup");
  if (!className) unavailable.push("class");
  if (level === null) unavailable.push("level");
  if (!ascendancy) unavailable.push("ascendancy");
  if (!formatVersion) unavailable.push("format version");
  if (!buildName) unavailable.push("build name");

  const tree = readTree(root, ambiguous, warnings);
  if (!tree.treeVersion) unavailable.push("tree version");

  const skills = readSkills(root, ambiguous);
  const mainSkill = resolveMainSkill(skills.groups, mainSocketGroup);
  if (!mainSkill.resolved) unavailable.push("main skill");
  if (skills.groups.length === 0) unavailable.push("skills");
  if (skills.groups.some((group) => group.mainActiveSkillCalcs !== null)) {
    unsupported.push("mainActiveSkillCalcs interpretation");
  }

  const items = readItems(root, ambiguous);
  if (items.length === 0) unavailable.push("equipment");

  const config = readConfig(root, ambiguous);
  if (config.inputs.length === 0) unavailable.push("configuration");
  else unsupported.push("configuration interpretation");

  if (child(root, "Notes")) unsupported.push("notes");

  return {
    document: {
      formatVersion,
      treeVersion: tree.treeVersion,
      buildName,
      className,
      ascendancy,
      level,
      mainSocketGroup,
      activeSkillSetId: skills.activeSkillSetId,
      sharedPassiveIds: tree.sharedPassiveIds,
      ascendancyPassiveIds: [],
      weaponSetPassiveIds: tree.weaponSetPassiveIds,
      skillGroups: skills.groups,
      mainSkill,
      items,
      configuration: config.inputs,
      configurationSets: config.sets,
      activeConfigSetId: config.activeConfigSetId,
      configurationSelection: config.selection,
    },
    unavailable,
    unsupported,
    ambiguous,
    warnings,
  };
}

function readTree(
  root: XmlElement,
  ambiguous: string[],
  warnings: string[],
): {
  treeVersion: string | null;
  sharedPassiveIds: number[];
  weaponSetPassiveIds: Pob2BuildDocument["weaponSetPassiveIds"];
} {
  const tree = child(root, "Tree");
  const specs = elements(tree, "Spec");
  const activeIndex = intAttr(tree, "activeSpec");
  const spec =
    specs.length === 1
      ? specs[0]
      : activeIndex !== null
        ? specs[activeIndex - 1]
        : undefined;
  if (specs.length > 1 && spec === undefined)
    ambiguous.push("active tree spec");
  const listed = idList(spec?.attributes.nodes);
  const weaponSets = {
    set1: idList(child(spec, "WeaponSet1")?.attributes.nodes),
    set2: idList(child(spec, "WeaponSet2")?.attributes.nodes),
    set3: idList(child(spec, "WeaponSet3")?.attributes.nodes),
  };
  const weaponIds = new Set([
    ...weaponSets.set1,
    ...weaponSets.set2,
    ...weaponSets.set3,
  ]);
  const seen = new Set<number>();
  for (const id of [
    ...weaponSets.set1,
    ...weaponSets.set2,
    ...weaponSets.set3,
  ]) {
    if (seen.has(id))
      warnings.push(`Passive id ${id} is listed on more than one weapon set.`);
    seen.add(id);
  }
  return {
    treeVersion: textAttr(spec, "treeVersion"),
    sharedPassiveIds: listed.filter((id) => !weaponIds.has(id)),
    weaponSetPassiveIds: weaponSets,
  };
}

function readSkills(
  root: XmlElement,
  ambiguous: string[],
): { groups: Pob2SkillGroup[]; activeSkillSetId: string | null } {
  const skills = child(root, "Skills");
  const sets = elements(skills, "SkillSet");
  const activeSet =
    sets.length === 0
      ? skills
      : sets.length === 1
        ? sets[0]
        : (() => {
            const activeId = skills?.attributes.activeSkillSet;
            const found = sets.find((set) => set.attributes.id === activeId);
            if (!found) ambiguous.push("active skill set");
            return found;
          })();
  const groups = elements(activeSet, "Skill").map((skill, index) =>
    readSkillGroup(skill, index),
  );
  return {
    groups,
    activeSkillSetId: textAttr(skills, "activeSkillSet"),
  };
}

function readSkillGroup(skill: XmlElement, index: number): Pob2SkillGroup {
  const rawGems = elements(skill, "Gem").map((gem) => ({
    name: textAttr(gem, "nameSpec"),
    skillId: textAttr(gem, "skillId"),
    gemId: textAttr(gem, "gemId"),
    variantId: textAttr(gem, "variantId"),
    level: intAttr(gem, "level"),
    quality: intAttr(gem, "quality"),
    enabled: boolAttr(gem, "enabled"),
    enableGlobal1: boolAttr(gem, "enableGlobal1"),
    enableGlobal2: boolAttr(gem, "enableGlobal2"),
    count: intAttr(gem, "count"),
    role: "unknown" as const,
  }));
  const mainActiveSkill = indexedAttribute(skill, "mainActiveSkill");
  const resolved = resolveSkillGroup(rawGems, mainActiveSkill);
  return {
    id: skill.attributes.id ?? String(index + 1),
    label: textAttr(skill, "label"),
    slot: textAttr(skill, "slot"),
    enabled: boolAttr(skill, "enabled"),
    mainActiveSkill:
      mainActiveSkill.state === "value" ? mainActiveSkill.value : null,
    mainActiveSkillCalcs:
      skill.attributes.mainActiveSkillCalcs === undefined
        ? null
        : skill.attributes.mainActiveSkillCalcs,
    relationship: resolved.relationship,
    unresolvedReason: resolved.unresolvedReason,
    rawGems: resolved.rawGems,
    activeSkills: resolved.activeSkills,
  };
}

function resolveSkillGroup(
  rawGems: readonly Pob2RawGem[],
  mainActiveSkill: IndexedAttribute,
): {
  rawGems: Pob2RawGem[];
  activeSkills: Pob2ActiveSkill[];
  relationship: "linked" | "unknown";
  unresolvedReason: Pob2SkillUnresolvedReason | null;
} {
  const unknownGem = rawGems.some(
    (gem) => gem.skillId === null || pob2GemFact(gem.skillId) === null,
  );
  if (unknownGem) {
    return {
      rawGems: rawGems.map((gem) => ({ ...gem, role: "unknown" })),
      activeSkills: [],
      relationship: "unknown",
      unresolvedReason: "active-display-list-not-reconstructable",
    };
  }

  const activeSkills: Pob2ActiveSkill[] = [];
  const assigned = rawGems.map((gem, gemIndex) => {
    const fact = pob2GemFact(gem.skillId ?? "");
    const primary = pob2EffectFact(gem.skillId ?? "");
    const displayIds = fact?.displayEffectIds ?? [];
    const role: Pob2GemRole =
      displayIds.length > 0
        ? "active"
        : primary?.support
          ? "support"
          : "unknown";
    if (gem.enabled !== false) {
      displayIds.forEach((effectId, effectIndex) => {
        const effect = pob2EffectFact(effectId);
        if (!effect || effect.support || effect.hideFromSideBar) return;
        if (effect.hasGlobalEffect) {
          const enabled =
            effectIndex === 0 ? gem.enableGlobal1 : gem.enableGlobal2;
          if (enabled === false) return;
        }
        activeSkills.push({
          index: activeSkills.length + 1,
          name: effect.name,
          skillId: effectId,
          sourceGemIndex: gemIndex + 1,
        });
      });
    }
    return { ...gem, role };
  });

  if (mainActiveSkill.state === "missing") {
    return {
      rawGems: assigned,
      activeSkills,
      relationship: "unknown",
      unresolvedReason: "missing-main-active-skill",
    };
  }
  if (mainActiveSkill.state === "invalid") {
    return {
      rawGems: assigned,
      activeSkills,
      relationship: "unknown",
      unresolvedReason: "invalid-main-active-skill",
    };
  }
  const selected = activeSkills[mainActiveSkill.value - 1];
  if (!selected) {
    return {
      rawGems: assigned,
      activeSkills,
      relationship: "unknown",
      unresolvedReason: "active-skill-index-out-of-range",
    };
  }
  return {
    rawGems: assigned,
    activeSkills,
    relationship: "linked",
    unresolvedReason: null,
  };
}

type IndexedAttribute =
  | { state: "missing" }
  | { state: "invalid" }
  | { state: "value"; value: number };

function indexedAttribute(element: XmlElement, name: string): IndexedAttribute {
  if (element.attributes[name] === undefined) return { state: "missing" };
  const value = element.attributes[name].trim();
  if (value.length === 0 || value === "nil") return { state: "missing" };
  if (!/^[1-9]\d*$/.test(value)) return { state: "invalid" };
  return { state: "value", value: Number(value) };
}

function resolveMainSkill(
  groups: readonly Pob2SkillGroup[],
  mainSocketGroup: number | null,
): Pob2BuildDocument["mainSkill"] {
  if (mainSocketGroup === null) {
    return {
      resolved: false,
      groupId: null,
      name: null,
      skillId: null,
      sourceGemIndex: null,
      reason: "missing-main-socket-group",
    };
  }
  const group = groups[mainSocketGroup - 1];
  const selected = group?.activeSkills.find(
    (skill) => skill.index === group.mainActiveSkill,
  );
  if (!group || !selected || group.unresolvedReason !== null) {
    return {
      resolved: false,
      groupId: group?.id ?? null,
      name: null,
      skillId: null,
      sourceGemIndex: null,
      reason: group?.unresolvedReason ?? "active-skill-index-out-of-range",
    };
  }
  return {
    resolved: true,
    groupId: group.id,
    name: selected.name,
    skillId: selected.skillId,
    sourceGemIndex: selected.sourceGemIndex,
    reason: null,
  };
}

function readItems(root: XmlElement, ambiguous: string[]): Pob2Item[] {
  const items = child(root, "Items");
  const sets = elements(items, "ItemSet");
  const container =
    sets.length === 0
      ? items
      : sets.length === 1
        ? sets[0]
        : (() => {
            const active = items?.attributes.activeItemSet;
            const found = sets.find((set) => set.attributes.id === active);
            if (!found) ambiguous.push("active item set");
            return found;
          })();
  const byId = new Map(
    elements(items, "Item").map((item) => [item.attributes.id ?? "", item]),
  );
  return elements(container, "Slot").flatMap((slot) => {
    const name = slot.attributes.name;
    const item = byId.get(slot.attributes.itemId ?? "");
    if (!name || !item) return [];
    return [
      parseItem(
        item.attributes.id ?? slot.attributes.itemId ?? name,
        name,
        item.text,
      ),
    ];
  });
}

function parseItem(id: string, slot: string, rawText: string): Pob2Item {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  let rarity: string | null = null;
  let itemLevel: number | null = null;
  let quality: number | null = null;
  let corrupted = false;
  const identity: string[] = [];
  const implicitModifiers: string[] = [];
  const explicitModifiers: string[] = [];
  const craftedModifiers: string[] = [];
  const enchantModifiers: string[] = [];
  const fracturedModifiers: string[] = [];
  let section: "identity" | "implicit" | "explicit" = "identity";
  for (const line of lines) {
    if (line.startsWith("--------")) {
      if (section === "identity" || section === "implicit")
        section = "explicit";
      continue;
    }
    if (section === "identity" && line.startsWith("Rarity:")) {
      rarity = line.slice("Rarity:".length).trim() || null;
      continue;
    }
    if (section === "identity" && line.startsWith("Item Level:")) {
      itemLevel = numberFrom(line.slice("Item Level:".length));
      continue;
    }
    if (section === "identity" && line.startsWith("Quality:")) {
      quality = numberFrom(line.slice("Quality:".length));
      continue;
    }
    if (line === "Corrupted") {
      corrupted = true;
      continue;
    }
    if (line.startsWith("Implicits:")) {
      section = "implicit";
      continue;
    }
    if (section === "identity") {
      identity.push(line);
      continue;
    }
    const crafted = line.match(/^\{(crafted|enchant|fractured)\}(.*)$/i);
    if (crafted?.[1] && crafted[2] !== undefined) {
      const text = crafted[2].trim();
      const kind = crafted[1].toLowerCase();
      if (kind === "crafted") craftedModifiers.push(text);
      else if (kind === "enchant") enchantModifiers.push(text);
      else fracturedModifiers.push(text);
      explicitModifiers.push(line);
      continue;
    }
    if (section === "implicit") implicitModifiers.push(line);
    else explicitModifiers.push(line);
  }
  const name =
    identity.length >= 2 ? (identity[0] ?? null) : (identity[0] ?? null);
  const baseType =
    identity.length >= 2 ? (identity[1] ?? null) : (identity[0] ?? null);
  return {
    id,
    slot,
    name,
    baseType,
    rarity,
    itemLevel,
    quality,
    corrupted,
    implicitModifiers,
    explicitModifiers,
    craftedModifiers,
    enchantModifiers,
    fracturedModifiers,
    rawText,
  };
}

function readConfig(
  root: XmlElement,
  ambiguous: string[],
): {
  sets: Pob2ConfigSet[];
  activeConfigSetId: string | null;
  selection: Pob2ConfigSelection;
  inputs: Pob2ConfigValue[];
} {
  const config = child(root, "Config");
  const activeConfigSetId = textAttr(config, "activeConfigSet");
  const sets = elements(config, "ConfigSet").map((set) => {
    const id = textAttr(set, "id");
    return {
      id,
      title: textAttr(set, "title"),
      inputs: elements(set, "Input").flatMap((input) => {
        const value = readConfigInput(input, id);
        return value ? [value] : [];
      }),
      placeholderCount: elements(set, "Placeholder").length,
    };
  });
  if (sets.length === 0) {
    return { sets, activeConfigSetId, selection: "none", inputs: [] };
  }
  if (sets.length === 1) {
    return {
      sets,
      activeConfigSetId,
      selection: "only-set",
      inputs: [...(sets[0]?.inputs ?? [])],
    };
  }
  const matches = sets.filter(
    (set) => set.id !== null && set.id === activeConfigSetId,
  );
  const selected = matches.length === 1 ? matches[0] : undefined;
  if (!selected) {
    ambiguous.push("active config set");
    return { sets, activeConfigSetId, selection: "unresolved", inputs: [] };
  }
  return {
    sets,
    activeConfigSetId,
    selection: "active-set",
    inputs: [...selected.inputs],
  };
}

function readConfigInput(
  input: XmlElement,
  configSetId: string | null,
): Pob2ConfigValue | null {
  const key = input.attributes.name?.trim();
  if (!key) return null;
  const typed = typedConfigValue(input);
  return {
    key,
    value: typed.value,
    valueKind: typed.valueKind,
    configSetId,
    source: "pob2-config",
  };
}

function typedConfigValue(input: XmlElement): {
  value: string;
  valueKind: Pob2ConfigValueKind;
} {
  if (input.attributes.boolean !== undefined) {
    return { value: input.attributes.boolean, valueKind: "boolean" };
  }
  if (input.attributes.number !== undefined) {
    return { value: input.attributes.number, valueKind: "number" };
  }
  if (input.attributes.string !== undefined) {
    return { value: input.attributes.string, valueKind: "string" };
  }
  return { value: "", valueKind: "string" };
}

function child(
  parent: XmlElement | undefined,
  name: string,
): XmlElement | undefined {
  return parent?.children.find((entry) => entry.name === name);
}

function elements(parent: XmlElement | undefined, name: string): XmlElement[] {
  return parent?.children.filter((entry) => entry.name === name) ?? [];
}

function textAttr(
  element: XmlElement | undefined,
  name: string,
): string | null {
  const value = element?.attributes[name]?.trim();
  return value ? value : null;
}

function intAttr(element: XmlElement | undefined, name: string): number | null {
  const value = textAttr(element, name);
  if (value === null || !/^\d+$/.test(value)) return null;
  return Number(value);
}

function boolAttr(
  element: XmlElement | undefined,
  name: string,
): boolean | null {
  const value = textAttr(element, name);
  if (value === null) return null;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  return null;
}

function idList(value: string | undefined): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => /^\d+$/.test(part))
    .map((part) => Number(part));
}

function numberFrom(value: string): number | null {
  const match = /(\d+)/.exec(value);
  return match?.[1] ? Number(match[1]) : null;
}

function uniqueUnknown(
  ids: readonly number[],
  known: ReadonlySet<number>,
): number[] {
  const seen = new Set<number>();
  const unknown: number[] = [];
  for (const id of ids) {
    if (known.has(id) || seen.has(id)) continue;
    seen.add(id);
    unknown.push(id);
  }
  return unknown;
}
