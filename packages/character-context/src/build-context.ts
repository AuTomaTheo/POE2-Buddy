import {
  mechanicsForGearSemantic,
  mechanicsForPassiveSemantic,
  mechanicsMentionedByUnresolvedLine,
  type ContextMechanic,
} from "./mechanics";
import {
  CHARACTER_CONTEXT_VERSION,
  characterContextSchema,
  defensiveMechanicList,
  offensiveMechanicList,
  type CharacterContext,
  type CharacterContextInput,
  type ContextGearModifierInput,
  type ContextSkillGroupInput,
  type MechanicRelevance,
  type RelevanceEvidence,
  type RelevanceState,
} from "./model";

type Bucket = {
  evidence: RelevanceEvidence[];
  unresolved: boolean;
};

export function buildCharacterContext(
  input: CharacterContextInput,
): CharacterContext {
  const buckets = new Map<ContextMechanic, Bucket>();
  for (const mechanic of [
    ...offensiveMechanicList(),
    ...defensiveMechanicList(),
  ]) {
    buckets.set(mechanic, { evidence: [], unresolved: false });
  }

  const primaryGroupId =
    input.mainSkill.status === "resolved" ? input.mainSkill.groupId : null;

  for (const group of input.skillGroups) {
    const primary = group.id === primaryGroupId;
    for (const skill of group.activeSkills) {
      for (const mechanic of skill.mechanics) {
        addEvidence(buckets, mechanic, {
          sourceType: "skill",
          sourceId: skill.skillId,
          rawLabel: skill.name,
          semanticFamily: mechanic,
          strength: primary ? "direct" : "supporting",
        });
      }
    }
    for (const support of group.supports) {
      for (const mechanic of support.mechanics) {
        addEvidence(buckets, mechanic, {
          sourceType: "support",
          sourceId: support.skillId ?? group.id,
          rawLabel: support.name ?? support.skillId ?? "support",
          semanticFamily: mechanic,
          strength: "supporting",
        });
      }
    }
  }

  for (const passive of input.passives) {
    const sourceType =
      passive.source === "ascendancy" ? "ascendancy" : "passive";
    for (const semanticId of passive.semanticIds) {
      for (const mechanic of mechanicsForPassiveSemantic(semanticId)) {
        addEvidence(buckets, mechanic, {
          sourceType,
          sourceId: String(passive.nodeId),
          rawLabel: passive.name,
          semanticFamily: semanticId,
          strength: "supporting",
        });
      }
    }
    for (const semanticId of passive.conditionalSemanticIds) {
      markUnresolved(buckets, mechanicsForPassiveSemantic(semanticId));
    }
    for (const line of passive.unrecognizedLines) {
      markUnresolved(buckets, mechanicsMentionedByUnresolvedLine(line));
    }
  }

  for (const modifier of input.gearModifiers) {
    if (modifier.semanticallyUnderstood && modifier.semanticId) {
      for (const mechanic of mechanicsForGearSemantic(modifier.semanticId)) {
        addEvidence(buckets, mechanic, {
          sourceType: "gear",
          sourceId: `${modifier.slot}:${modifier.rawText}`,
          rawLabel: modifier.rawText,
          semanticFamily: modifier.semanticId,
          strength: "supporting",
        });
      }
      continue;
    }
    if (modifier.semanticId) {
      markUnresolved(buckets, mechanicsForGearSemantic(modifier.semanticId));
    } else {
      markUnresolved(
        buckets,
        mechanicsMentionedByUnresolvedLine(modifier.rawText),
      );
    }
  }

  const offense = offensiveMechanicList().map((mechanic) =>
    relevanceFor(mechanic, buckets.get(mechanic)),
  );
  const defense = defensiveMechanicList().map((mechanic) =>
    relevanceFor(mechanic, buckets.get(mechanic)),
  );
  const unresolvedMechanics: string[] = [
    ...new Set(
      [...offense, ...defense]
        .filter((entry) => entry.relevance === "unresolved")
        .map((entry) => entry.mechanic),
    ),
  ];
  if (input.skillGroups.some((group) => group.unknownGems.length > 0)) {
    unresolvedMechanics.push("unknown skill role");
  }

  const activeSkills = input.skillGroups.flatMap((group) => group.activeSkills);
  const skillMechanicsKnown = activeSkills.filter(
    (skill) => skill.mechanics.length > 0,
  ).length;
  const gearLinesUnderstood = input.gearModifiers.filter(
    (modifier) => modifier.semanticallyUnderstood,
  ).length;
  const passiveLinesRecognized = input.passives.reduce(
    (count, passive) => count + passive.semanticIds.length,
    0,
  );
  const passiveLinesTotal = input.passives.reduce(
    (count, passive) =>
      count +
      passive.semanticIds.length +
      passive.conditionalSemanticIds.length +
      passive.unrecognizedLines.length,
    0,
  );
  const warnings = readinessWarnings(
    input,
    skillMechanicsKnown,
    activeSkills.length,
  );
  const hasMaterial =
    input.skillGroups.length > 0 ||
    input.passives.length > 0 ||
    input.gearModifiers.length > 0 ||
    input.configuration.length > 0 ||
    input.className !== null;
  const primarySkillResolved = input.mainSkill.status === "resolved";
  const ready =
    hasMaterial &&
    primarySkillResolved &&
    skillMechanicsKnown === activeSkills.length &&
    activeSkills.length > 0 &&
    unresolvedMechanics.length === 0 &&
    input.configuration.length === 0;

  return characterContextSchema.parse({
    characterContextVersion: CHARACTER_CONTEXT_VERSION,
    source: input.source,
    primarySkill: primarySkill(input),
    skillGroups: input.skillGroups.map((group) =>
      groupView(group, primaryGroupId),
    ),
    offense,
    defense,
    ascendancy: {
      className: input.className,
      name: input.ascendancyName,
      passiveIds: [...input.ascendancyPassiveIds],
    },
    weaponContext: {
      localDamageLabels: localDamageLabels(input.gearModifiers),
    },
    unresolvedMechanics,
    preservedConfiguration: input.configuration.map((entry) => ({
      key: entry.key,
      value: entry.value,
    })),
    readiness: {
      status: !hasMaterial ? "insufficient" : ready ? "ready" : "partial",
      primarySkillResolved,
      skillMechanicsKnown,
      skillMechanicsTotal: activeSkills.length,
      gearLinesUnderstood,
      gearLinesTotal: input.gearModifiers.length,
      passiveLinesRecognized,
      passiveLinesTotal,
      unresolvedMechanics,
      warnings,
    },
  });
}

function addEvidence(
  buckets: Map<ContextMechanic, Bucket>,
  mechanic: ContextMechanic,
  evidence: RelevanceEvidence,
): void {
  const bucket = buckets.get(mechanic);
  if (!bucket) return;
  bucket.evidence.push(evidence);
}

function markUnresolved(
  buckets: Map<ContextMechanic, Bucket>,
  mechanics: readonly ContextMechanic[],
): void {
  for (const mechanic of mechanics) {
    const bucket = buckets.get(mechanic);
    if (bucket) bucket.unresolved = true;
  }
}

function relevanceFor(
  mechanic: ContextMechanic,
  bucket: Bucket | undefined,
): MechanicRelevance {
  const evidence = bucket?.evidence ?? [];
  const relevance: RelevanceState =
    evidence.length > 0
      ? "relevant"
      : bucket?.unresolved
        ? "unresolved"
        : "no-evidence";
  return { mechanic, relevance, evidence };
}

function primarySkill(
  input: CharacterContextInput,
): CharacterContext["primarySkill"] {
  if (input.mainSkill.status === "resolved") {
    return {
      status: "resolved",
      groupId: input.mainSkill.groupId,
      name: input.mainSkill.name,
      skillId: input.mainSkill.skillId,
      reason: null,
    };
  }
  if (input.mainSkill.status === "unresolved") {
    return {
      status: "unresolved",
      groupId: null,
      name: null,
      skillId: null,
      reason: input.mainSkill.reason,
    };
  }
  return {
    status: "missing",
    groupId: null,
    name: null,
    skillId: null,
    reason: null,
  };
}

function groupView(
  group: ContextSkillGroupInput,
  primaryGroupId: string | null,
) {
  return {
    id: group.id,
    label: group.label,
    role:
      group.id === primaryGroupId
        ? ("primary" as const)
        : ("unresolved" as const),
    activeSkillNames: group.activeSkills.map((skill) => skill.name),
    supportNames: group.supports.map(
      (support) => support.name ?? support.skillId ?? "support",
    ),
    unknownGemCount: group.unknownGems.length,
  };
}

function localDamageLabels(
  modifiers: readonly ContextGearModifierInput[],
): string[] {
  const localDamage = new Set([
    "flat-physical-damage",
    "increased-physical-damage",
    "flat-fire-damage",
    "flat-cold-damage",
    "flat-lightning-damage",
  ]);
  return modifiers
    .filter(
      (modifier) =>
        modifier.semanticallyUnderstood &&
        modifier.locality === "local" &&
        modifier.semanticId !== null &&
        localDamage.has(modifier.semanticId),
    )
    .map((modifier) => modifier.rawText);
}

function readinessWarnings(
  input: CharacterContextInput,
  known: number,
  total: number,
): string[] {
  const warnings: string[] = [];
  if (input.mainSkill.status === "unresolved") {
    warnings.push("Primary skill is unresolved.");
  }
  if (input.mainSkill.status === "missing") {
    warnings.push("No skill groups were imported.");
  }
  if (total > 0 && known < total) {
    warnings.push("Skill mechanic tags are not in the checked fact table.");
  }
  if (input.skillGroups.some((group) => group.unknownGems.length > 0)) {
    warnings.push("Unknown skill roles were not used as evidence.");
  }
  if (input.configuration.length > 0) {
    warnings.push(
      "Configuration is stored and is not used as relevance evidence.",
    );
  }
  return warnings;
}
