import type {
  GearLocality,
  GearOperation,
  GearSemanticId,
  GearUnit,
} from "./families";
import { gearItemContext, type GearItemContext } from "./item-context";
import { resolveGearLocality } from "./locality";

export type GearModifierSection =
  | "implicit"
  | "explicit"
  | "crafted"
  | "enchant"
  | "fractured"
  | "rune"
  | "unknown";

export type ParsedGearModifier = {
  rawText: string;
  parsed: boolean;
  semanticId: GearSemanticId | null;
  operation: GearOperation | null;
  amount: number | null;
  amountMax: number | null;
  unit: GearUnit | null;
  scope: string | null;
  condition: string | null;
  locality: GearLocality;
  sourceSection: GearModifierSection;
  semanticallyUnderstood: boolean;
  malformedMarker: boolean;
};

type Match = {
  semanticId: GearSemanticId;
  operation: GearOperation;
  amount: number;
  amountMax: number | null;
  unit: GearUnit;
  scope: string | null;
};

const SIGNED = String.raw`[+-]\d+`;
const PERCENT = String.raw`(\d+)% (increased|reduced)`;

function added(
  semanticId: GearSemanticId,
  amount: number,
  unit: GearUnit,
  scope: string | null = null,
): Match {
  return {
    semanticId,
    operation: "added",
    amount,
    amountMax: null,
    unit,
    scope,
  };
}

function scaled(
  semanticId: GearSemanticId,
  amount: number,
  operation: GearOperation,
  scope: string | null = null,
): Match {
  return {
    semanticId,
    operation,
    amount,
    amountMax: null,
    unit: "percent",
    scope,
  };
}

function matchBody(body: string): Match | null {
  const life = new RegExp(`^(${SIGNED}) to maximum Life$`).exec(body);
  if (life?.[1]) return added("maximum-life", Number(life[1]), "flat");

  const energy = new RegExp(`^(${SIGNED}) to maximum Energy Shield$`).exec(
    body,
  );
  if (energy?.[1]) {
    return added("maximum-energy-shield", Number(energy[1]), "flat");
  }

  const increasedEnergy = new RegExp(`^${PERCENT} Energy Shield$`).exec(body);
  if (increasedEnergy?.[1] && increasedEnergy[2]) {
    return scaled(
      "increased-energy-shield",
      Number(increasedEnergy[1]),
      increasedEnergy[2] === "reduced" ? "reduced" : "increased",
    );
  }

  const resistance = new RegExp(
    `^(${SIGNED})% to (Fire|Cold|Lightning|Chaos) Resistance$`,
  ).exec(body);
  if (resistance?.[1] && resistance[2]) {
    const element = resistance[2].toLowerCase();
    return added(
      `${element}-resistance` as GearSemanticId,
      Number(resistance[1]),
      "percent",
    );
  }

  const attribute = new RegExp(
    `^(${SIGNED}) to (Strength|Dexterity|Intelligence)$`,
  ).exec(body);
  if (attribute?.[1] && attribute[2]) {
    return added(
      attribute[2].toLowerCase() as GearSemanticId,
      Number(attribute[1]),
      "flat",
    );
  }

  const movement = new RegExp(`^${PERCENT} Movement Speed$`).exec(body);
  if (movement?.[1] && movement[2]) {
    return scaled(
      "movement-speed",
      Number(movement[1]),
      movement[2] === "reduced" ? "reduced" : "increased",
    );
  }

  const attackSpeed = new RegExp(`^${PERCENT} Attack Speed$`).exec(body);
  if (attackSpeed?.[1] && attackSpeed[2]) {
    return scaled(
      "attack-speed",
      Number(attackSpeed[1]),
      attackSpeed[2] === "reduced" ? "reduced" : "increased",
    );
  }

  const castSpeed = new RegExp(`^${PERCENT} Cast Speed$`).exec(body);
  if (castSpeed?.[1] && castSpeed[2]) {
    return scaled(
      "cast-speed",
      Number(castSpeed[1]),
      castSpeed[2] === "reduced" ? "reduced" : "increased",
    );
  }

  const critChance = new RegExp(`^${PERCENT} Critical Hit Chance$`).exec(body);
  if (critChance?.[1] && critChance[2]) {
    return scaled(
      "critical-hit-chance",
      Number(critChance[1]),
      critChance[2] === "reduced" ? "reduced" : "increased",
    );
  }

  const critDamage = new RegExp(`^(${SIGNED})% to Critical Damage Bonus$`).exec(
    body,
  );
  if (critDamage?.[1]) {
    return added("critical-damage-bonus", Number(critDamage[1]), "percent");
  }

  const addedDamage =
    /^Adds (\d+) to (\d+) (Physical|Fire|Cold|Lightning) Damage(?: to (Attacks|Spells))?$/.exec(
      body,
    );
  if (addedDamage?.[1] && addedDamage[2] && addedDamage[3]) {
    const element = addedDamage[3].toLowerCase();
    const scope = addedDamage[4]?.toLowerCase() ?? null;
    const semanticId = (
      scope === "attacks" && element === "fire"
        ? "flat-fire-damage-to-attacks"
        : `flat-${element}-damage`
    ) as GearSemanticId;
    return {
      semanticId,
      operation: "added",
      amount: Number(addedDamage[1]),
      amountMax: Number(addedDamage[2]),
      unit: "flat",
      scope,
    };
  }

  const elementalScope = new RegExp(
    `^${PERCENT} Elemental Damage with (Attacks|Spells)$`,
  ).exec(body);
  if (elementalScope?.[1] && elementalScope[2] && elementalScope[3]) {
    return scaled(
      "increased-elemental-damage",
      Number(elementalScope[1]),
      elementalScope[2] === "reduced" ? "reduced" : "increased",
      elementalScope[3].toLowerCase(),
    );
  }

  const increasedDamage = new RegExp(
    `^${PERCENT} (Physical|Elemental|Projectile) Damage$`,
  ).exec(body);
  if (increasedDamage?.[1] && increasedDamage[2] && increasedDamage[3]) {
    const kind = increasedDamage[3].toLowerCase();
    const projectile = kind === "projectile";
    return scaled(
      `increased-${kind}-damage` as GearSemanticId,
      Number(increasedDamage[1]),
      increasedDamage[2] === "reduced" ? "reduced" : "increased",
      projectile ? "projectile" : null,
    );
  }

  const projectileSkills = /^\+(\d+) to Level of all Projectile Skills$/.exec(
    body,
  );
  if (projectileSkills?.[1]) {
    return added(
      "projectile-skill-level",
      Number(projectileSkills[1]),
      "flat",
      "projectile",
    );
  }

  const spirit = new RegExp(`^(${SIGNED}) to Spirit$`).exec(body);
  if (spirit?.[1]) return added("spirit", Number(spirit[1]), "flat");

  const accuracy = new RegExp(`^(${SIGNED}) to Accuracy Rating$`).exec(body);
  if (accuracy?.[1]) {
    return added("accuracy", Number(accuracy[1]), "flat");
  }

  const armour = new RegExp(`^(${SIGNED}) to Armour$`).exec(body);
  if (armour?.[1]) return added("armour", Number(armour[1]), "flat");

  const increasedArmour = new RegExp(`^${PERCENT} Armour$`).exec(body);
  if (increasedArmour?.[1] && increasedArmour[2]) {
    return scaled(
      "increased-armour",
      Number(increasedArmour[1]),
      increasedArmour[2] === "reduced" ? "reduced" : "increased",
    );
  }

  const evasion = new RegExp(`^(${SIGNED}) to Evasion Rating$`).exec(body);
  if (evasion?.[1]) {
    return added("evasion", Number(evasion[1]), "flat");
  }

  const deflection = new RegExp(`^(${SIGNED}) to Deflection Rating$`).exec(
    body,
  );
  if (deflection?.[1]) {
    return added("deflection", Number(deflection[1]), "flat");
  }

  return null;
}

function splitCondition(line: string): {
  body: string;
  condition: string | null;
} {
  const match = /^(.*?) (while|if|against) (.+)$/i.exec(line);
  if (!match?.[1] || !match[2] || !match[3]) {
    return { body: line, condition: null };
  }
  return {
    body: match[1],
    condition: `${match[2].toLowerCase()} ${match[3]}`,
  };
}

function splitMarker(line: string): {
  body: string;
  section: GearModifierSection | null;
  malformedMarker: boolean;
} {
  if (!line.startsWith("{")) {
    return { body: line, section: null, malformedMarker: false };
  }
  const marker = /^\{(crafted|enchant|fractured|rune)\}(.*)$/i.exec(line);
  if (marker?.[1] && marker[2] !== undefined) {
    return {
      body: marker[2].trim(),
      section: marker[1].toLowerCase() as GearModifierSection,
      malformedMarker: false,
    };
  }
  return { body: line, section: "unknown", malformedMarker: true };
}

function withoutGlobalWord(body: string): string {
  return body
    .replace(/\bglobal\b/gi, " ")
    .replace(/ {2,}/g, " ")
    .trim();
}

function localityFor(
  match: Match,
  context: GearItemContext,
  rawLine: string,
): GearLocality {
  if (match.scope === "attacks" || match.scope === "spells") return "global";
  return resolveGearLocality(match.semanticId, context, rawLine);
}

export function parseGearModifier(
  rawText: string,
  sourceSection: GearModifierSection = "explicit",
  context: GearItemContext = gearItemContext(null),
): ParsedGearModifier {
  const marker = splitMarker(rawText.trim());
  const section = marker.section ?? sourceSection;
  if (marker.malformedMarker || marker.body.length === 0) {
    return unsupported(rawText, section, marker.malformedMarker);
  }
  const condition = splitCondition(marker.body);
  const match = matchBody(withoutGlobalWord(condition.body));
  if (!match) return unsupported(rawText, section, false);
  const locality = localityFor(match, context, rawText);
  const semanticallyUnderstood =
    locality !== "unknown" && condition.condition === null;
  return {
    rawText,
    parsed: true,
    semanticId: match.semanticId,
    operation: match.operation,
    amount: match.amount,
    amountMax: match.amountMax,
    unit: match.unit,
    scope: match.scope,
    condition: condition.condition,
    locality,
    sourceSection: section,
    semanticallyUnderstood,
    malformedMarker: false,
  };
}

function unsupported(
  rawText: string,
  sourceSection: GearModifierSection,
  malformedMarker: boolean,
): ParsedGearModifier {
  return {
    rawText,
    parsed: false,
    semanticId: null,
    operation: null,
    amount: null,
    amountMax: null,
    unit: null,
    scope: null,
    condition: null,
    locality: "unknown",
    sourceSection,
    semanticallyUnderstood: false,
    malformedMarker,
  };
}
