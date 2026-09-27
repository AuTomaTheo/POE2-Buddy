import type { PassiveNode } from "@poe2-helper/domain";
import {
  effectStatIdentity,
  parsePassiveStatExpression,
  type ParsedPassiveEffect,
  type StatDirection,
} from "./grammar.js";
import {
  parsePassiveStatLine,
  type PassiveStatForm,
  type PassiveStatLine,
  type PassiveStatUnit,
} from "./stats.js";

export type SemanticPassiveStat = {
  raw: string;
  statId: string;
  semanticId: string;
  operation: PassiveStatForm;
  amount: number;
  unit: PassiveStatUnit;
  scopes: readonly string[];
  conditions?: readonly {
    type: string;
    text: string;
    markups: readonly { sourceId: string; displayText?: string }[];
  }[];
  structuredScopes?: readonly {
    type: string;
    text: string;
    markups: readonly { sourceId: string; displayText?: string }[];
  }[];
  direction?: StatDirection;
};

/**
 * Exact extracted stat ids that name one semantic family.
 * A shared family still keeps the extracted operation. Different visible
 * phrases are not entered on the same row.
 */
const SEMANTIC_BY_STAT_ID: Readonly<Record<string, string>> = {
  "increased.Spell.increased-spell-damage": "spell-damage",
  "increased.Attack.increased-attack-damage": "attack-damage",
  "increased.Melee.increased-melee-damage": "melee-damage",
  "increased.Projectile.increased-projectile-damage": "projectile-damage",
  "increased.Physical.increased-physical-damage": "physical-damage",
  "increased.Fire.increased-fire-damage": "fire-damage",
  "increased.Cold.increased-cold-damage": "cold-damage",
  "increased.Lightning.increased-lightning-damage": "lightning-damage",
  "increased.Chaos.increased-chaos-damage": "chaos-damage",
  "increased.ElementalDamage.increased-elemental-damage": "elemental-damage",
  "increased.plain.increased-damage": "damage",
  "more.plain.more-damage": "damage",
  "less.plain.less-damage": "damage",
  "reduced.plain.reduced-damage": "damage",
  "increased.Critical.increased-critical-hit-chance": "critical-hit-chance",
  "increased.CriticalDamageBonus.increased-critical-damage-bonus":
    "critical-damage-bonus",
  "increased.CriticalDamageBonus.increased-critical-spell-damage-bonus":
    "critical-spell-damage-bonus",
  "increased.Attack.increased-attack-speed": "attack-speed",
  "increased.plain.increased-cast-speed": "cast-speed",
  "increased.Projectile.increased-projectile-speed": "projectile-speed",
  "increased.Accuracy.increased-accuracy-rating": "accuracy",
  "increased.plain.increased-maximum-life": "maximum-life",
  "less.plain.less-maximum-life": "maximum-life",
  "more.plain.more-maximum-life": "maximum-life",
  "increased.EnergyShield.increased-maximum-energy-shield":
    "maximum-energy-shield",
  "added.EnergyShield.to-maximum-energy-shield": "maximum-energy-shield",
  "increased.Armour.increased-armour": "armour",
  "increased.Evasion.increased-evasion-rating": "evasion",
  "added.Evasion.to-evasion-rating": "evasion",
  "increased.Deflect.increased-deflection-rating": "deflection",
  "increased.Block.increased-block-chance": "block-chance",
  "added.Strength.to-strength": "strength",
  "increased.Strength.increased-strength": "strength",
  "added.Dexterity.to-dexterity": "dexterity",
  "increased.Dexterity.increased-dexterity": "dexterity",
  "added.Intelligence.to-intelligence": "intelligence",
  "increased.Intelligence.increased-intelligence": "intelligence",
  "added.Attributes.to-any-attribute": "any-attribute",
  "added.Attributes.to-all-attributes": "all-attributes",
  "added.Resistances.to-fire-resistance": "fire-resistance",
  "added.Resistances.to-cold-resistance": "cold-resistance",
  "added.Resistances.to-lightning-resistance": "lightning-resistance",
  "added.Resistances.to-chaos-resistance": "chaos-resistance",
  "penetration.Resistances.penetrates-fire-resistance":
    "fire-resistance-penetration",
  "penetration.Resistances.penetrates-cold-resistance":
    "cold-resistance-penetration",
  "penetration.Resistances.penetrates-lightning-resistance":
    "lightning-resistance-penetration",
  "increased.plain.increased-movement-speed": "movement-speed",
  "increased.plain.increased-skill-effect-duration": "skill-effect-duration",
  "increased.plain.increased-area-of-effect": "area-of-effect",
  "increased.SkillSpeed.increased-skill-speed": "skill-speed",
  "increased.plain.increased-mana-regeneration-rate": "mana-regeneration",
  "increased.plain.increased-life-regeneration-rate": "life-regeneration",
  "increased.Minion.minions-deal-increased-damage": "minion-damage",
  "increased.Minion.minions-have-increased-maximum-life": "minion-maximum-life",
  "increased.Critical.increased-critical-hit-chance-for-spells":
    "critical-hit-chance-for-spells",
  "increased.Critical.increased-critical-hit-chance-for-attacks":
    "critical-hit-chance-for-attacks",
};

export const REQUIRED_SEMANTIC_IDS = [
  "spell-damage",
  "attack-damage",
  "melee-damage",
  "projectile-damage",
  "physical-damage",
  "fire-damage",
  "cold-damage",
  "lightning-damage",
  "chaos-damage",
  "elemental-damage",
  "critical-hit-chance",
  "critical-damage-bonus",
  "attack-speed",
  "cast-speed",
  "projectile-speed",
  "accuracy",
  "maximum-life",
  "maximum-energy-shield",
  "armour",
  "evasion",
  "deflection",
  "block-chance",
  "strength",
  "dexterity",
  "intelligence",
  "any-attribute",
  "fire-resistance",
  "cold-resistance",
  "lightning-resistance",
  "chaos-resistance",
  "movement-speed",
] as const;

/**
 * STEP-007A blocking list. `assessStatScoringReadiness` does not use this
 * list. It uses `highPriorityFamilyReport` for the current pin.
 */
export const UNSUPPORTED_HIGH_PRIORITY_FAMILIES = [
  "more-damage",
  "less-damage",
  "damage-reduction",
  "gain-as-extra",
  "damage-conversion",
  "conditional-damage",
  "elemental-resistance-penetration",
  "maximum-resistance",
  "reservation",
] as const;

/** Working target for this step. Not a permanent product rule. */
export const EXTRACTION_COVERAGE_TARGET_PERCENT = 70;

export type StatScoringReadiness = {
  status: "ready" | "not-ready";
  extractionCoverage: number;
  semanticCoverage: number;
  supportedFamilies: readonly string[];
  unsupportedHighPriorityFamilies: readonly string[];
  partiallySupportedFamilies: readonly string[];
  familyReports: readonly HighPriorityFamilyReport[];
  reasons: readonly string[];
};

export type PassiveStatSemanticCoverage = {
  nodeCount: number;
  lineCount: number;
  recognizedLineCount: number;
  semanticLineCount: number;
  unrecognizedLineCount: number;
  extractionCoveragePercent: number;
  semanticCoveragePercent: number;
  semanticById: readonly { semanticId: string; count: number }[];
};

function wordsMatch(
  effect: ParsedPassiveEffect,
  expected: readonly string[],
): boolean {
  return (
    effect.subjectWords.length === expected.length &&
    effect.subjectWords.every(
      (word, index) => word.toLowerCase() === expected[index]?.toLowerCase(),
    )
  );
}

function damageFamily(sourceId: string): string | null {
  const families: Readonly<Record<string, string>> = {
    Spell: "spell-damage",
    Attack: "attack-damage",
    Melee: "melee-damage",
    Projectile: "projectile-damage",
    Physical: "physical-damage",
    Fire: "fire-damage",
    Cold: "cold-damage",
    Lightning: "lightning-damage",
    Chaos: "chaos-damage",
    ElementalDamage: "elemental-damage",
  };
  return families[sourceId] ?? null;
}

function typedDamageFamily(effect: ParsedPassiveEffect): string | null {
  if (effect.markups.length !== 1 || !wordsMatch(effect, ["Damage"]))
    return null;
  return damageFamily(effect.markups[0]?.sourceId ?? "");
}

function plainDamage(effect: ParsedPassiveEffect): boolean {
  return effect.markups.length === 0 && wordsMatch(effect, ["Damage"]);
}

function mentionsDamage(effect: ParsedPassiveEffect): boolean {
  return (
    plainDamage(effect) ||
    typedDamageFamily(effect) !== null ||
    effect.subjectWords.some((word) => word.toLowerCase() === "damage")
  );
}

function isDamageTaken(effect: ParsedPassiveEffect): boolean {
  if (effect.direction !== "taken") return false;
  if (mentionsDamage(effect)) return true;
  return effect.markups.some(
    (markup) => damageFamily(markup.sourceId) !== null,
  );
}

export function semanticFamilyForEffect(
  effect: ParsedPassiveEffect,
): string | null {
  if (
    effect.operation === "gain-as-extra" &&
    effect.sourceText !== undefined &&
    effect.targetText !== undefined
  ) {
    return "gain-as-extra";
  }
  if (
    effect.operation === "conversion" &&
    effect.sourceText !== undefined &&
    effect.targetText !== undefined &&
    /damage/i.test(effect.sourceText) &&
    /damage/i.test(effect.targetText)
  ) {
    return "damage-conversion";
  }
  if (effect.operation === "penetration" && effect.targetText !== undefined) {
    const target = effect.targetText.toLowerCase();
    if (target.includes("fire")) return "fire-resistance-penetration";
    if (target.includes("cold")) return "cold-resistance-penetration";
    if (target.includes("lightning")) return "lightning-resistance-penetration";
    if (target.includes("chaos")) return "chaos-resistance-penetration";
    if (target.includes("elemental")) return "elemental-resistance-penetration";
    return null;
  }
  if (effect.operation === "derived-from") {
    const target = effect.targetMarkups?.[0]?.sourceId;
    const source = effect.sourceMarkups?.[0]?.sourceId;
    if (target === "Deflect" && source === "Evasion") {
      return "deflection-from-evasion";
    }
    if (target === "Deflect" && source === "Armour") {
      return "deflection-from-armour";
    }
    return null;
  }
  if (isDamageTaken(effect)) {
    return "damage-taken";
  }
  if (effect.markups.some((markup) => markup.sourceId === "Reservation")) {
    return "reservation";
  }
  const maximumResistance = effect.markups.find(
    (markup) => markup.sourceId === "MaximumResistances",
  );
  if (maximumResistance && effect.markups.length === 1) {
    const display = maximumResistance.displayText ?? "";
    if (/fire/i.test(display)) return "maximum-fire-resistance";
    if (/cold/i.test(display)) return "maximum-cold-resistance";
    if (/lightning/i.test(display)) return "maximum-lightning-resistance";
    if (/chaos/i.test(display)) return "maximum-chaos-resistance";
    if (/elemental/i.test(display)) return "maximum-elemental-resistance";
    return "maximum-resistance";
  }
  const typed = typedDamageFamily(effect);
  if (typed !== null && effect.operation !== "chance") return typed;
  if (plainDamage(effect) && effect.operation !== "chance") return "damage";
  if (effect.markups.length === 1 && wordsMatch(effect, ["Speed"])) {
    if (effect.markups[0]?.sourceId === "Attack") return "attack-speed";
    if (effect.markups[0]?.sourceId === "Projectile") return "projectile-speed";
  }
  if (effect.markups.length === 0 && wordsMatch(effect, ["Cast", "Speed"])) {
    return "cast-speed";
  }
  if (
    effect.markups.length === 0 &&
    wordsMatch(effect, ["Movement", "Speed"])
  ) {
    return "movement-speed";
  }
  if (
    effect.maximum &&
    effect.markups.length === 0 &&
    wordsMatch(effect, ["maximum", "Life"])
  ) {
    return "maximum-life";
  }
  if (
    effect.markups.length === 0 &&
    wordsMatch(effect, ["Mana", "Regeneration", "Rate"])
  ) {
    return "mana-regeneration";
  }
  if (
    effect.markups.length === 0 &&
    wordsMatch(effect, ["Life", "Regeneration", "rate"])
  ) {
    return "life-regeneration";
  }
  if (
    effect.markups.length === 1 &&
    effect.markups[0]?.sourceId === "EnergyShield" &&
    effect.maximum
  ) {
    return "maximum-energy-shield";
  }
  if (
    effect.markups.length === 1 &&
    effect.markups[0]?.sourceId === "Accuracy" &&
    wordsMatch(effect, ["Rating"])
  ) {
    return "accuracy";
  }
  if (
    effect.markups.length === 1 &&
    effect.markups[0]?.sourceId === "Block" &&
    wordsMatch(effect, ["chance"])
  ) {
    return "block-chance";
  }
  if (
    effect.markups.length === 1 &&
    (effect.subjectWords.length === 0 || wordsMatch(effect, ["Rating"]))
  ) {
    if (effect.markups[0]?.sourceId === "Armour") return "armour";
    if (effect.markups[0]?.sourceId === "Evasion") return "evasion";
    if (effect.markups[0]?.sourceId === "Deflect") return "deflection";
  }
  if (effect.markups.length === 1 && effect.subjectWords.length === 0) {
    if (effect.markups[0]?.sourceId === "Strength") return "strength";
    if (effect.markups[0]?.sourceId === "Dexterity") return "dexterity";
    if (effect.markups[0]?.sourceId === "Intelligence") return "intelligence";
    if (effect.markups[0]?.sourceId === "Deflect") return "deflection";
  }
  const criticalBonus =
    effect.markups.length === 1 &&
    effect.markups[0]?.sourceId === "CriticalDamageBonus" &&
    effect.subjectWords.length === 0
      ? effect.markups[0].displayText
      : undefined;
  if (criticalBonus?.includes("Spell")) return "critical-spell-damage-bonus";
  if (criticalBonus === "Critical Damage Bonus") return "critical-damage-bonus";
  if (
    effect.markups.length === 1 &&
    effect.markups[0]?.sourceId === "Critical" &&
    effect.subjectWords.length === 0 &&
    effect.markups[0].displayText === "Critical Hit Chance"
  ) {
    if (
      effect.clauses.some(
        (clause) => clause.type === "for" && /spell/i.test(clause.text),
      )
    ) {
      return "critical-hit-chance-for-spells";
    }
    if (
      effect.clauses.some(
        (clause) => clause.type === "for" && /attack/i.test(clause.text),
      )
    ) {
      return "critical-hit-chance-for-attacks";
    }
    return "critical-hit-chance";
  }
  if (
    effect.markups.length === 1 &&
    effect.markups[0]?.sourceId === "Resistances" &&
    effect.subjectWords.length === 0
  ) {
    const display = effect.markups[0].displayText ?? "";
    if (display === "Fire Resistance") return "fire-resistance";
    if (display === "Cold Resistance") return "cold-resistance";
    if (display === "Lightning Resistance") return "lightning-resistance";
    if (display === "Chaos Resistance") return "chaos-resistance";
  }
  return null;
}

function semanticFromEffect(
  raw: string,
  effect: ParsedPassiveEffect,
  semanticId: string,
): SemanticPassiveStat {
  const identity = effectStatIdentity(effect);
  const conditions = effect.clauses
    .filter((clause) => clause.role === "condition")
    .map((clause) => ({
      type: clause.type,
      text: clause.text,
      markups: clause.markups,
    }));
  const structuredScopes = effect.clauses
    .filter((clause) => clause.role === "scope")
    .map((clause) => ({
      type: clause.type,
      text: clause.text,
      markups: clause.markups,
    }));
  return {
    raw,
    statId: identity.statId,
    semanticId,
    operation: effect.operation,
    amount: effect.amount,
    unit: effect.unit,
    scopes: structuredScopes.map((scope) => `${scope.type} ${scope.text}`),
    ...(conditions.length > 0 ? { conditions } : {}),
    ...(structuredScopes.length > 0 ? { structuredScopes } : {}),
    ...(effect.direction === "unspecified"
      ? {}
      : { direction: effect.direction }),
  };
}

export function semanticPassiveStats(
  line: PassiveStatLine,
): readonly SemanticPassiveStat[] | null {
  if (line.status !== "recognized") return null;
  if (line.effects !== undefined && line.effects.length > 0) {
    const stats: SemanticPassiveStat[] = [];
    for (const effect of line.effects) {
      const semanticId = semanticFamilyForEffect(effect);
      if (semanticId === null) return null;
      stats.push(semanticFromEffect(line.raw, effect, semanticId));
    }
    return stats;
  }
  const semanticId = SEMANTIC_BY_STAT_ID[line.statId];
  if (semanticId === undefined) return null;
  return [
    {
      raw: line.raw,
      statId: line.statId,
      semanticId,
      operation: line.form,
      amount: line.amount,
      unit: line.unit,
      scopes: line.scopes,
    },
  ];
}

export function semanticPassiveStat(
  line: PassiveStatLine,
): SemanticPassiveStat | null {
  const stats = semanticPassiveStats(line);
  if (stats === null || stats.length !== 1) return null;
  return stats[0] ?? null;
}

/** Operations that must appear as structured effects before scoring can start. */
export const REQUIRED_STRUCTURAL_OPERATIONS = [
  "more",
  "less",
  "conversion",
  "gain-as-extra",
] as const;

export const HIGH_PRIORITY_FAMILIES = [
  "more-damage",
  "less-damage",
  "damage-reduction",
  "gain-as-extra",
  "damage-conversion",
  "conditional-damage",
  "elemental-resistance-penetration",
  "maximum-resistance",
  "reservation",
] as const;

export type HighPriorityFamilyStatus =
  | "supported-structurally"
  | "supported-semantically"
  | "partially-supported"
  | "still-unsupported";

export type HighPriorityFamilyReport = {
  familyId: (typeof HIGH_PRIORITY_FAMILIES)[number];
  status: HighPriorityFamilyStatus;
  supportStatus: HighPriorityFamilyStatus;
  presentInScoringDomain: boolean;
  omissionExposed: boolean;
  blocking: boolean;
  reason: string;
};

/**
 * A high-priority family blocks scoring only when it occurs in passive-node
 * rawStats, is not supported, and path coverage would not show the gap.
 */
export function highPriorityFamilyBlocks(input: {
  supportStatus: HighPriorityFamilyStatus;
  presentInScoringDomain: boolean;
  omissionExposed: boolean;
}): boolean {
  if (!input.presentInScoringDomain) return false;
  if (
    input.supportStatus === "supported-semantically" ||
    input.supportStatus === "supported-structurally"
  ) {
    return false;
  }
  return !input.omissionExposed;
}

function damageConversionTexts(effect: ParsedPassiveEffect): boolean {
  return (
    effect.sourceText !== undefined &&
    effect.targetText !== undefined &&
    /damage/i.test(effect.sourceText) &&
    /damage/i.test(effect.targetText)
  );
}

function statClauses(raw: string): readonly string[] {
  const clauses = raw
    .split(/\r?\n/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0);
  return clauses.length === 0 ? [raw] : clauses;
}

function outgoingLessDamageEffect(effect: ParsedPassiveEffect): boolean {
  return (
    effect.operation === "less" &&
    mentionsDamage(effect) &&
    effect.direction !== "taken"
  );
}

function clauseLooksLikeOutgoingLessDamage(clause: string): boolean {
  if (!/% less\b/i.test(clause)) return false;
  if (!/\bdamage\b/i.test(clause)) return false;
  if (/\btaken\b/i.test(clause)) return false;
  if (/^take\b/i.test(clause)) return false;
  return true;
}

function clauseLooksLikeDamageConversion(clause: string): boolean {
  return /\bdamage\b/i.test(clause) && /convert/i.test(clause);
}

function lineLeavesGapVisible(raw: string): boolean {
  const line = parsePassiveStatLine(raw);
  return line.status === "unrecognized" || semanticPassiveStats(line) === null;
}

export function highPriorityFamilyReport(
  nodes: readonly Pick<PassiveNode, "id" | "rawStats">[],
): readonly HighPriorityFamilyReport[] {
  let moreDamage = false;
  let lessDamage = false;
  let lessDamagePresent = false;
  let lessDamageExposed = false;
  let damageReduction = false;
  let gainAsExtra = false;
  let damageConversion = false;
  let otherConversion = false;
  let damageConversionPresent = false;
  let damageConversionExposed = false;
  let conditionalDamage = false;
  let elementalPenetration = false;
  let maximumResistance = false;
  let reservation = false;

  for (const node of nodes) {
    for (const raw of node.rawStats) {
      const expression = parsePassiveStatExpression(raw);
      const gapVisible = lineLeavesGapVisible(raw);
      if (expression === null) {
        for (const clause of statClauses(raw)) {
          if (clauseLooksLikeOutgoingLessDamage(clause)) {
            lessDamagePresent = true;
            if (gapVisible) lessDamageExposed = true;
          }
          if (clauseLooksLikeDamageConversion(clause)) {
            damageConversionPresent = true;
            if (gapVisible) damageConversionExposed = true;
          }
        }
        continue;
      }
      for (const effect of expression.effects) {
        const damage = mentionsDamage(effect);
        const conditional = effect.clauses.some(
          (clause) => clause.role === "condition",
        );
        if (
          effect.operation === "more" &&
          damage &&
          effect.direction !== "taken"
        ) {
          moreDamage = true;
        }
        if (outgoingLessDamageEffect(effect)) {
          lessDamage = true;
          lessDamagePresent = true;
        }
        if (isDamageTaken(effect)) damageReduction = true;
        if (effect.operation === "gain-as-extra") gainAsExtra = true;
        if (effect.operation === "conversion") {
          damageConversionPresent = true;
          if (damageConversionTexts(effect)) damageConversion = true;
          else {
            otherConversion = true;
            if (gapVisible) damageConversionExposed = true;
          }
        }
        if (conditional && damage) conditionalDamage = true;
        if (
          effect.operation === "penetration" &&
          effect.targetText !== undefined &&
          /elemental/i.test(effect.targetText) &&
          !/fire|cold|lightning|chaos/i.test(effect.targetText)
        ) {
          elementalPenetration = true;
        }
        if (
          effect.markups.some(
            (markup) => markup.sourceId === "MaximumResistances",
          )
        ) {
          maximumResistance = true;
        }
        if (
          effect.markups.some((markup) => markup.sourceId === "Reservation")
        ) {
          reservation = true;
        }
      }
    }
  }

  const status = (
    supported: boolean,
    partial = false,
  ): HighPriorityFamilyStatus => {
    if (supported) return "supported-semantically";
    if (partial) return "partially-supported";
    return "still-unsupported";
  };

  const report = (
    familyId: HighPriorityFamilyReport["familyId"],
    supportStatus: HighPriorityFamilyStatus,
    presentInScoringDomain: boolean,
    omissionExposed: boolean,
    reason: string,
  ): HighPriorityFamilyReport => {
    const blocking = highPriorityFamilyBlocks({
      supportStatus,
      presentInScoringDomain,
      omissionExposed,
    });
    return {
      familyId,
      status: supportStatus,
      supportStatus,
      presentInScoringDomain,
      omissionExposed,
      blocking,
      reason,
    };
  };

  return [
    report(
      "more-damage",
      status(moreDamage),
      moreDamage,
      false,
      moreDamage
        ? "Outgoing more-damage occurs and is represented."
        : "Outgoing more-damage does not occur in passive-node rawStats.",
    ),
    report(
      "less-damage",
      status(lessDamage),
      lessDamagePresent,
      lessDamageExposed,
      lessDamage
        ? "Outgoing less-damage occurs and is represented."
        : !lessDamagePresent
          ? "Outgoing less-damage does not occur in passive-node rawStats."
          : lessDamageExposed
            ? "Outgoing less-damage occurs, but its line stays visible to path coverage."
            : "Outgoing less-damage occurs and path coverage would not show the gap.",
    ),
    report(
      "damage-reduction",
      status(damageReduction),
      damageReduction,
      false,
      damageReduction
        ? "Incoming damage occurs and is represented."
        : "Incoming damage does not occur in passive-node rawStats.",
    ),
    report(
      "gain-as-extra",
      status(gainAsExtra),
      gainAsExtra,
      false,
      gainAsExtra
        ? "Gain-as-extra occurs and is represented."
        : "Gain-as-extra does not occur in passive-node rawStats.",
    ),
    report(
      "damage-conversion",
      status(damageConversion, otherConversion),
      damageConversionPresent,
      damageConversionExposed,
      damageConversion
        ? "Damage-type conversion occurs and is represented."
        : !damageConversionPresent
          ? "Damage-type conversion does not occur in passive-node rawStats."
          : damageConversionExposed
            ? "Damage-type conversion is partial. The unsupported line stays visible to path coverage."
            : "Damage-type conversion occurs and path coverage would not show the gap.",
    ),
    report(
      "conditional-damage",
      status(conditionalDamage),
      conditionalDamage,
      false,
      conditionalDamage
        ? "Conditional damage occurs and is represented."
        : "Conditional damage does not occur in passive-node rawStats.",
    ),
    report(
      "elemental-resistance-penetration",
      status(elementalPenetration),
      elementalPenetration,
      false,
      elementalPenetration
        ? "Elemental resistance penetration occurs and is represented."
        : "Elemental resistance penetration does not occur in passive-node rawStats.",
    ),
    report(
      "maximum-resistance",
      status(maximumResistance),
      maximumResistance,
      false,
      maximumResistance
        ? "Maximum resistance occurs and is represented."
        : "Maximum resistance does not occur in passive-node rawStats.",
    ),
    report(
      "reservation",
      status(reservation),
      reservation,
      false,
      reservation
        ? "Reservation occurs and is represented."
        : "Reservation does not occur in passive-node rawStats.",
    ),
  ];
}

export function structuralOperationsPresent(
  nodes: readonly Pick<PassiveNode, "id" | "rawStats">[],
): readonly string[] {
  const found = new Set<string>();
  for (const node of nodes) {
    for (const raw of node.rawStats) {
      const expression = parsePassiveStatExpression(raw);
      if (expression === null) continue;
      for (const effect of expression.effects) found.add(effect.operation);
    }
  }
  return [...found].sort((left, right) => left.localeCompare(right));
}

function percent(part: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return Math.round((part / total) * 1000) / 10;
}

export function passiveStatSemanticCoverage(
  nodes: readonly Pick<PassiveNode, "id" | "rawStats">[],
): PassiveStatSemanticCoverage {
  let lineCount = 0;
  let recognizedLineCount = 0;
  let semanticLineCount = 0;
  const bySemanticId = new Map<string, number>();

  for (const node of nodes) {
    for (const raw of node.rawStats) {
      lineCount += 1;
      const line = parsePassiveStatLine(raw);
      if (line.status !== "recognized") {
        continue;
      }
      recognizedLineCount += 1;
      const semantics = semanticPassiveStats(line);
      if (semantics === null) {
        continue;
      }
      semanticLineCount += 1;
      for (const semantic of semantics) {
        bySemanticId.set(
          semantic.semanticId,
          (bySemanticId.get(semantic.semanticId) ?? 0) + 1,
        );
      }
    }
  }

  return {
    nodeCount: nodes.length,
    lineCount,
    recognizedLineCount,
    semanticLineCount,
    unrecognizedLineCount: lineCount - recognizedLineCount,
    extractionCoveragePercent: percent(recognizedLineCount, lineCount),
    semanticCoveragePercent: percent(semanticLineCount, lineCount),
    semanticById: [...bySemanticId.entries()]
      .map(([semanticId, count]) => ({ semanticId, count }))
      .sort((left, right) => left.semanticId.localeCompare(right.semanticId)),
  };
}

export function decideStatScoringReadiness(input: {
  lineCount: number;
  recognizedLineCount: number;
  semanticLineCount: number;
  semanticCounts: Readonly<Record<string, number>>;
  unsupportedHighPriorityFamilies?: readonly string[];
  partiallySupportedFamilies?: readonly string[];
  structuralOperations?: readonly string[];
  highPriorityFamilies?: readonly HighPriorityFamilyReport[];
}): StatScoringReadiness {
  const familyReports = input.highPriorityFamilies;
  const unsupported =
    familyReports !== undefined
      ? familyReports
          .filter((family) => family.blocking)
          .map((family) => family.familyId)
      : (input.unsupportedHighPriorityFamilies ??
        UNSUPPORTED_HIGH_PRIORITY_FAMILIES);
  const partial =
    familyReports !== undefined
      ? familyReports
          .filter((family) => family.supportStatus === "partially-supported")
          .map((family) => family.familyId)
      : (input.partiallySupportedFamilies ?? []);
  const structural = new Set(input.structuralOperations ?? []);
  const supportedFamilies = REQUIRED_SEMANTIC_IDS.filter(
    (semanticId) => (input.semanticCounts[semanticId] ?? 0) > 0,
  );
  const missingFamilies = REQUIRED_SEMANTIC_IDS.filter(
    (semanticId) => (input.semanticCounts[semanticId] ?? 0) === 0,
  );
  const missingOperations = REQUIRED_STRUCTURAL_OPERATIONS.filter(
    (operation) => !structural.has(operation),
  );
  const meetsTarget =
    input.lineCount > 0 &&
    input.recognizedLineCount * 100 >=
      input.lineCount * EXTRACTION_COVERAGE_TARGET_PERCENT;
  const reasons: string[] = [];
  if (!meetsTarget) {
    reasons.push(
      `Extraction coverage is below the ${EXTRACTION_COVERAGE_TARGET_PERCENT}% working target.`,
    );
  }
  for (const semanticId of missingFamilies) {
    reasons.push(`Required semantic family ${semanticId} has no parsed lines.`);
  }
  for (const operation of missingOperations) {
    reasons.push(`Structured operation ${operation} is not represented yet.`);
  }
  for (const familyId of unsupported) {
    reasons.push(`High-priority family ${familyId} is not supported yet.`);
  }
  const ready =
    meetsTarget &&
    missingFamilies.length === 0 &&
    missingOperations.length === 0 &&
    unsupported.length === 0;

  return {
    status: ready ? "ready" : "not-ready",
    extractionCoverage: percent(input.recognizedLineCount, input.lineCount),
    semanticCoverage: percent(input.semanticLineCount, input.lineCount),
    supportedFamilies,
    unsupportedHighPriorityFamilies: [...unsupported],
    partiallySupportedFamilies: [...partial],
    familyReports: input.highPriorityFamilies ?? [],
    reasons,
  };
}

export function assessStatScoringReadiness(
  nodes: readonly Pick<PassiveNode, "id" | "rawStats">[],
): StatScoringReadiness {
  const coverage = passiveStatSemanticCoverage(nodes);
  const report = highPriorityFamilyReport(nodes);
  return decideStatScoringReadiness({
    lineCount: coverage.lineCount,
    recognizedLineCount: coverage.recognizedLineCount,
    semanticLineCount: coverage.semanticLineCount,
    semanticCounts: Object.fromEntries(
      coverage.semanticById.map((entry) => [entry.semanticId, entry.count]),
    ),
    highPriorityFamilies: report,
    structuralOperations: structuralOperationsPresent(nodes),
  });
}
