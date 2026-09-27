import {
  gearItemContext,
  noteBaseDefence,
  type GearItemContext,
} from "./item-context";
import { parseGearModifier, type ParsedGearModifier } from "./parse-modifier";

export type GearItemSections = {
  rarity: string | null;
  itemLevel: number | null;
  quality: number | null;
  corrupted: boolean;
  modifiers: readonly ParsedGearModifier[];
  otherLines: readonly string[];
};

const PROPERTY_LINE =
  /^(?:Armour|Evasion Rating|Energy Shield|Ward|Block|Requires|Level|LevelReq|Str|Dex|Int|Sockets|Rune Sockets|Quality|Item Level|Rarity|Implicits|Radius|Limited to|League|Variant|Charm Slots|Critical Hit Chance|Attacks per Second|Reload Time|Physical Damage|Fire Damage|Cold Damage|Lightning Damage|Chaos Damage|Elemental Damage|Accuracy|Spirit):/i;

function contentLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== "--------");
}

function isProperty(line: string): boolean {
  return PROPERTY_LINE.test(line);
}

function numberFrom(line: string, label: string): number | null {
  if (!line.startsWith(label)) return null;
  const value = Number(line.slice(label.length).trim().replace("%", ""));
  return Number.isInteger(value) ? value : null;
}

export function parseGearItemText(
  rawText: string | null | undefined,
  context: GearItemContext = gearItemContext(null),
): GearItemSections {
  if (!rawText || rawText.trim().length === 0) {
    return {
      rarity: null,
      itemLevel: null,
      quality: null,
      corrupted: false,
      modifiers: [],
      otherLines: [],
    };
  }

  const lines = contentLines(rawText);
  for (const line of lines) noteBaseDefence(line, context);
  if (!lines.some((line) => line.startsWith("Rarity:"))) {
    return {
      rarity: null,
      itemLevel: null,
      quality: null,
      corrupted: false,
      modifiers: lines.map((line) =>
        parseGearModifier(line, "explicit", context),
      ),
      otherLines: [],
    };
  }

  let rarity: string | null = null;
  let itemLevel: number | null = null;
  let quality: number | null = null;
  let corrupted = false;
  let implicitRemaining: number | null = null;
  const modifiers: ParsedGearModifier[] = [];
  const otherLines: string[] = [];

  for (const line of lines) {
    if (line === "Corrupted") {
      corrupted = true;
      continue;
    }
    const implicitHeader = /^Implicits:\s*(\d+)/i.exec(line);
    if (implicitHeader?.[1]) {
      implicitRemaining = Number(implicitHeader[1]);
      continue;
    }
    if (line.startsWith("Rarity:")) {
      rarity = line.slice("Rarity:".length).trim() || null;
      continue;
    }
    if (line.startsWith("Item Level:")) {
      itemLevel = numberFrom(line, "Item Level:");
      continue;
    }
    if (line.startsWith("Quality:")) {
      quality = numberFrom(line, "Quality:");
      continue;
    }
    if (implicitRemaining === null) {
      if (!isProperty(line)) otherLines.push(line);
      continue;
    }
    if (isProperty(line)) continue;
    const section = implicitRemaining > 0 ? "implicit" : "explicit";
    if (implicitRemaining > 0) implicitRemaining -= 1;
    modifiers.push(parseGearModifier(line, section, context));
  }

  return { rarity, itemLevel, quality, corrupted, modifiers, otherLines };
}
