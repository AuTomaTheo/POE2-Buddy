import { z } from "zod";
import {
  CONTEXT_MECHANIC_VALUES,
  DEFENSIVE_MECHANICS,
  OFFENSIVE_MECHANICS,
  type ContextMechanic,
  type DefensiveMechanic,
  type OffensiveMechanic,
} from "./mechanics";

export const CHARACTER_CONTEXT_VERSION = 1;

export const CONTEXT_SOURCES = ["pob2", "ggg", "fixture"] as const;
export const RELEVANCE_STATES = [
  "relevant",
  "no-evidence",
  "unresolved",
] as const;
export const EVIDENCE_SOURCES = [
  "skill",
  "support",
  "passive",
  "gear",
  "ascendancy",
  "configuration",
] as const;
export const EVIDENCE_STRENGTHS = ["direct", "supporting"] as const;
export const SKILL_GROUP_ROLES = ["primary", "unresolved"] as const;
export const MAIN_SKILL_STATUSES = [
  "resolved",
  "unresolved",
  "missing",
] as const;

const mechanicSchema = z.enum(CONTEXT_MECHANIC_VALUES);

export const relevanceEvidenceSchema = z
  .object({
    sourceType: z.enum(EVIDENCE_SOURCES),
    sourceId: z.string(),
    rawLabel: z.string(),
    semanticFamily: z.string(),
    strength: z.enum(EVIDENCE_STRENGTHS),
  })
  .strict();

export const mechanicRelevanceSchema = z
  .object({
    mechanic: mechanicSchema,
    relevance: z.enum(RELEVANCE_STATES),
    evidence: z.array(relevanceEvidenceSchema),
  })
  .strict();

export const characterContextSchema = z
  .object({
    characterContextVersion: z.literal(CHARACTER_CONTEXT_VERSION),
    source: z.enum(CONTEXT_SOURCES),
    primarySkill: z
      .object({
        status: z.enum(MAIN_SKILL_STATUSES),
        groupId: z.string().nullable(),
        name: z.string().nullable(),
        skillId: z.string().nullable(),
        reason: z.string().nullable(),
      })
      .strict(),
    skillGroups: z.array(
      z
        .object({
          id: z.string(),
          label: z.string().nullable(),
          role: z.enum(SKILL_GROUP_ROLES),
          activeSkillNames: z.array(z.string()),
          supportNames: z.array(z.string()),
          unknownGemCount: z.number().int().nonnegative(),
        })
        .strict(),
    ),
    offense: z.array(mechanicRelevanceSchema),
    defense: z.array(mechanicRelevanceSchema),
    ascendancy: z
      .object({
        className: z.string().nullable(),
        name: z.string().nullable(),
        passiveIds: z.array(z.number().int()),
      })
      .strict(),
    weaponContext: z
      .object({
        localDamageLabels: z.array(z.string()),
      })
      .strict(),
    unresolvedMechanics: z.array(z.string()),
    preservedConfiguration: z.array(
      z
        .object({
          key: z.string(),
          value: z.string(),
        })
        .strict(),
    ),
    readiness: z
      .object({
        status: z.enum(["ready", "partial", "insufficient"]),
        primarySkillResolved: z.boolean(),
        skillMechanicsKnown: z.number().int().nonnegative(),
        skillMechanicsTotal: z.number().int().nonnegative(),
        gearLinesUnderstood: z.number().int().nonnegative(),
        gearLinesTotal: z.number().int().nonnegative(),
        passiveLinesRecognized: z.number().int().nonnegative(),
        passiveLinesTotal: z.number().int().nonnegative(),
        unresolvedMechanics: z.array(z.string()),
        warnings: z.array(z.string()),
      })
      .strict(),
  })
  .strict();

export type RelevanceEvidence = z.infer<typeof relevanceEvidenceSchema>;
export type MechanicRelevance = z.infer<typeof mechanicRelevanceSchema>;
export type CharacterContext = z.infer<typeof characterContextSchema>;
export type RelevanceState = (typeof RELEVANCE_STATES)[number];

export type ContextSkillMechanic = ContextMechanic;

export type ContextActiveSkillInput = {
  name: string;
  skillId: string;
  mechanics: readonly ContextMechanic[];
};

export type ContextSupportInput = {
  name: string | null;
  skillId: string | null;
  mechanics: readonly ContextMechanic[];
};

export type ContextSkillGroupInput = {
  id: string;
  label: string | null;
  relationship: "linked" | "unknown";
  activeSkills: readonly ContextActiveSkillInput[];
  supports: readonly ContextSupportInput[];
  unknownGems: readonly { name: string | null; skillId: string | null }[];
};

export type ContextMainSkillInput =
  | {
      status: "resolved";
      groupId: string;
      name: string;
      skillId: string;
    }
  | { status: "unresolved"; reason: string }
  | { status: "missing" };

export type ContextPassiveInput = {
  nodeId: number;
  name: string;
  source: "passive" | "ascendancy";
  semanticIds: readonly string[];
  conditionalSemanticIds: readonly string[];
  unrecognizedLines: readonly string[];
};

export type ContextGearModifierInput = {
  slot: string;
  itemName: string;
  rawText: string;
  semanticId: string | null;
  locality: "local" | "global" | "unknown";
  semanticallyUnderstood: boolean;
};

export type ContextConfigurationInput = {
  key: string;
  value: string;
};

export type CharacterContextInput = {
  source: (typeof CONTEXT_SOURCES)[number];
  className: string | null;
  ascendancyName: string | null;
  ascendancyPassiveIds: readonly number[];
  mainSkill: ContextMainSkillInput;
  skillGroups: readonly ContextSkillGroupInput[];
  passives: readonly ContextPassiveInput[];
  gearModifiers: readonly ContextGearModifierInput[];
  configuration: readonly ContextConfigurationInput[];
};

export function offensiveMechanicList(): readonly OffensiveMechanic[] {
  return OFFENSIVE_MECHANICS;
}

export function defensiveMechanicList(): readonly DefensiveMechanic[] {
  return DEFENSIVE_MECHANICS;
}
