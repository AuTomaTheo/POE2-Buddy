/**
 * Skill-role facts taken from Path of Building (PoE2) 0.23.1 (2026-07-28).
 * `support` and the display-effect order come from `Data/Gems.lua` and `Data/Skills`.
 * This is not a damage calculator. An unknown skill id stays unresolved.
 */

export type Pob2EffectFact = {
  name: string;
  support: boolean;
  hideFromSideBar: boolean;
  hasGlobalEffect: boolean;
};

export type Pob2GemFact = {
  displayEffectIds: readonly string[];
};

const effects: Record<string, Pob2EffectFact> = {
  FireballPlayer: {
    name: "Fireball",
    support: false,
    hideFromSideBar: false,
    hasGlobalEffect: false,
  },
  SparkPlayer: {
    name: "Spark",
    support: false,
    hideFromSideBar: false,
    hasGlobalEffect: false,
  },
  ShockwaveTotemPlayer: {
    name: "Shockwave Totem",
    support: false,
    hideFromSideBar: false,
    hasGlobalEffect: false,
  },
  ShockwaveTotemQuakePlayer: {
    name: "Shockwave Slam",
    support: false,
    hideFromSideBar: false,
    hasGlobalEffect: false,
  },
  SupportMagnifiedAreaPlayerTwo: {
    name: "Magnified Area II",
    support: true,
    hideFromSideBar: false,
    hasGlobalEffect: false,
  },
  SupportAddedLightningDamagePlayer: {
    name: "Lightning Attunement",
    support: true,
    hideFromSideBar: false,
    hasGlobalEffect: false,
  },
  SupportRapidAttacksPlayerThree: {
    name: "Rapid Attacks III",
    support: true,
    hideFromSideBar: false,
    hasGlobalEffect: false,
  },
};

const gemsBySkillId: Record<string, Pob2GemFact> = {
  FireballPlayer: { displayEffectIds: ["FireballPlayer"] },
  SparkPlayer: { displayEffectIds: ["SparkPlayer"] },
  ShockwaveTotemPlayer: {
    displayEffectIds: ["ShockwaveTotemPlayer", "ShockwaveTotemQuakePlayer"],
  },
  SupportMagnifiedAreaPlayerTwo: { displayEffectIds: [] },
  SupportAddedLightningDamagePlayer: { displayEffectIds: [] },
  SupportRapidAttacksPlayerThree: { displayEffectIds: [] },
};

export function pob2EffectFact(skillId: string): Pob2EffectFact | null {
  return effects[skillId] ?? null;
}

export function pob2GemFact(skillId: string): Pob2GemFact | null {
  return gemsBySkillId[skillId] ?? null;
}
