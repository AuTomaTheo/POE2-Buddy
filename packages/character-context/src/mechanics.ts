export const OFFENSIVE_MECHANICS = [
  "attack",
  "spell",
  "projectile",
  "melee",
  "area",
  "critical-strike",
  "elemental",
  "physical",
  "fire",
  "cold",
  "lightning",
  "chaos",
  "minion",
  "totem",
  "duration",
  "ailment",
  "channelled",
  "movement",
  "triggered",
] as const;

export const CONTEXT_MECHANIC_VALUES = [
  ...OFFENSIVE_MECHANICS,
  "life",
  "energy-shield",
  "armour",
  "evasion",
  "deflection",
  "block",
  "resistances",
  "avoidance",
  "recovery",
] as const;

export const DEFENSIVE_MECHANICS = [
  "life",
  "energy-shield",
  "armour",
  "evasion",
  "deflection",
  "block",
  "resistances",
  "avoidance",
  "recovery",
  "movement",
] as const;

export type OffensiveMechanic = (typeof OFFENSIVE_MECHANICS)[number];
export type DefensiveMechanic = (typeof DEFENSIVE_MECHANICS)[number];
export type ContextMechanic = OffensiveMechanic | DefensiveMechanic;

const OFFENSE = new Set<string>(OFFENSIVE_MECHANICS);
const DEFENSE = new Set<string>(DEFENSIVE_MECHANICS);

export function isOffensiveMechanic(value: string): value is OffensiveMechanic {
  return OFFENSE.has(value);
}

export function isDefensiveMechanic(value: string): value is DefensiveMechanic {
  return DEFENSE.has(value);
}

/**
 * Passive semantic ids already produced by the passive engine.
 * One id can support more than one mechanic. This is not a weight table.
 */
const PASSIVE_SEMANTIC_MECHANICS: Readonly<
  Record<string, readonly ContextMechanic[]>
> = {
  "projectile-damage": ["projectile"],
  "projectile-speed": ["projectile"],
  "critical-hit-chance": ["critical-strike"],
  "critical-damage-bonus": ["critical-strike"],
  "critical-spell-damage-bonus": ["critical-strike"],
  "critical-hit-chance-for-spells": ["critical-strike"],
  "critical-hit-chance-for-attacks": ["critical-strike"],
  "physical-damage": ["physical"],
  "elemental-damage": ["elemental"],
  "fire-damage": ["fire"],
  "cold-damage": ["cold"],
  "lightning-damage": ["lightning"],
  "chaos-damage": ["chaos"],
  "spell-damage": ["spell"],
  "cast-speed": ["spell"],
  "attack-damage": ["attack"],
  "attack-speed": ["attack"],
  accuracy: ["attack"],
  "melee-damage": ["melee"],
  "area-of-effect": ["area"],
  "minion-damage": ["minion"],
  "minion-maximum-life": ["minion"],
  "skill-effect-duration": ["duration"],
  "maximum-life": ["life"],
  "life-regeneration": ["life", "recovery"],
  "maximum-energy-shield": ["energy-shield"],
  armour: ["armour"],
  evasion: ["evasion"],
  deflection: ["deflection"],
  "block-chance": ["block"],
  "fire-resistance": ["resistances"],
  "cold-resistance": ["resistances"],
  "lightning-resistance": ["resistances"],
  "chaos-resistance": ["resistances"],
  "movement-speed": ["movement"],
  "mana-regeneration": ["recovery"],
};

/**
 * Gear semantic ids from the gear engine. A line is evidence only when the
 * caller has already marked it semantically understood.
 */
const GEAR_SEMANTIC_MECHANICS: Readonly<
  Record<string, readonly ContextMechanic[]>
> = {
  "increased-projectile-damage": ["projectile"],
  "projectile-skill-level": ["projectile"],
  "flat-physical-damage": ["physical"],
  "increased-physical-damage": ["physical"],
  "flat-fire-damage": ["fire"],
  "flat-fire-damage-to-attacks": ["fire", "attack"],
  "flat-cold-damage": ["cold"],
  "flat-lightning-damage": ["lightning"],
  "increased-elemental-damage": ["elemental"],
  "attack-speed": ["attack"],
  "cast-speed": ["spell"],
  "critical-hit-chance": ["critical-strike"],
  "critical-damage-bonus": ["critical-strike"],
  "maximum-life": ["life"],
  "maximum-energy-shield": ["energy-shield"],
  "increased-energy-shield": ["energy-shield"],
  armour: ["armour"],
  "increased-armour": ["armour"],
  evasion: ["evasion"],
  deflection: ["deflection"],
  "fire-resistance": ["resistances"],
  "cold-resistance": ["resistances"],
  "lightning-resistance": ["resistances"],
  "chaos-resistance": ["resistances"],
  "movement-speed": ["movement"],
};

const UNRESOLVED_LINE_MECHANICS: readonly {
  pattern: RegExp;
  mechanic: ContextMechanic;
}[] = [
  { pattern: /\bminions?\b/i, mechanic: "minion" },
  { pattern: /\barmou?r\b/i, mechanic: "armour" },
  { pattern: /\bevasion\b/i, mechanic: "evasion" },
  { pattern: /\bdeflection\b/i, mechanic: "deflection" },
  { pattern: /\benergy shield\b/i, mechanic: "energy-shield" },
  { pattern: /\bprojectiles?\b/i, mechanic: "projectile" },
  { pattern: /\bcritical\b/i, mechanic: "critical-strike" },
  { pattern: /\bphysical\b/i, mechanic: "physical" },
  { pattern: /\belemental\b/i, mechanic: "elemental" },
  { pattern: /\bfire\b/i, mechanic: "fire" },
  { pattern: /\bcold\b/i, mechanic: "cold" },
  { pattern: /\blightning\b/i, mechanic: "lightning" },
  { pattern: /\bchaos\b/i, mechanic: "chaos" },
  { pattern: /\bspells?\b/i, mechanic: "spell" },
  { pattern: /\battacks?\b/i, mechanic: "attack" },
  { pattern: /\bmelee\b/i, mechanic: "melee" },
  { pattern: /\btotems?\b/i, mechanic: "totem" },
  { pattern: /\bchannel(?:led|ed)\b/i, mechanic: "channelled" },
  { pattern: /\bailments?\b/i, mechanic: "ailment" },
  { pattern: /\blife\b/i, mechanic: "life" },
  { pattern: /\bblock\b/i, mechanic: "block" },
  { pattern: /\bresistances?\b/i, mechanic: "resistances" },
  { pattern: /\bduration\b/i, mechanic: "duration" },
  { pattern: /\btriggered\b/i, mechanic: "triggered" },
  { pattern: /\bmovement\b/i, mechanic: "movement" },
];

export function mechanicsForPassiveSemantic(
  semanticId: string,
): readonly ContextMechanic[] {
  return PASSIVE_SEMANTIC_MECHANICS[semanticId] ?? [];
}

export function mechanicsForGearSemantic(
  semanticId: string,
): readonly ContextMechanic[] {
  return GEAR_SEMANTIC_MECHANICS[semanticId] ?? [];
}

export function mechanicsMentionedByUnresolvedLine(
  rawText: string,
): readonly ContextMechanic[] {
  const found = new Set<ContextMechanic>();
  for (const entry of UNRESOLVED_LINE_MECHANICS) {
    if (entry.pattern.test(rawText)) found.add(entry.mechanic);
  }
  return [...found];
}
