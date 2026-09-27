import type { PassiveNode } from "@poe2-helper/domain";
import { parsePassiveStatLine } from "./stats.js";

export type UnrecognizedStatFamily = {
  familyId: string;
  totalOccurrences: number;
  distinctLines: number;
  examples: readonly string[];
};

export type UnrecognizedStatInventory = {
  lineCount: number;
  families: readonly UnrecognizedStatFamily[];
};

export type UnrecognizedStatOccurrence = {
  raw: string;
  nodeId: number;
  nodeName: string;
};

const EXAMPLE_LIMIT = 3;

/**
 * First matching rule wins. Each unrecognized line is in exactly one family.
 * The rules describe the text. They do not assign a scoring category.
 */
export function unrecognizedStatFamilyId(raw: string): string {
  const markup = raw.match(/\[[^\]]+\]/g) ?? [];
  const numbers = raw.match(/-?\d+(?:\.\d+)?/g) ?? [];
  if (numbers.length > 1) return "multiple-numeric-values";
  if (markup.length > 1) return "multiple-markup-tokens";
  if (/\bwhile\b/i.test(raw)) return "while";
  if (/\bif\b/i.test(raw)) return "if";
  if (/\bwhen\b/i.test(raw)) return "when";
  if (/\bagainst\b/i.test(raw)) return "against";
  if (/\bper\b/i.test(raw)) return "per";
  if (/\bwith\b/i.test(raw)) return "with";
  if (/\bfor\b/i.test(raw)) return "for";
  if (/% more\b/.test(raw)) return "more";
  if (/% less\b/.test(raw)) return "less";
  if (/\breduced\b/.test(raw)) return "reduced";
  if (/as extra|as additional/i.test(raw)) return "gain-as-extra";
  if (/penetrat/i.test(raw)) return "penetration";
  if (/convert/i.test(raw)) return "conversion";
  if (/\bchance\b/i.test(raw)) return "chance";
  if (/Minion/.test(raw)) return "minion";
  if (/Resistance/.test(raw)) return "resistance";
  if (/\bLife\b/.test(raw)) return "life";
  if (/Energy Shield|EnergyShield/.test(raw)) return "energy-shield";
  if (/Deflect|Deflection/.test(raw)) return "deflection";
  if (/\bEvasion\b/.test(raw)) return "evasion";
  if (/\bArmour\b/.test(raw)) return "armour";
  if (/\bBlock\b/.test(raw)) return "block";
  if (/Critical/.test(raw)) return "critical";
  if (/Movement Speed/.test(raw)) return "movement-speed";
  if (/Cast Speed/.test(raw)) return "cast-speed";
  if (/Attack\] Speed|Attack Speed/.test(raw)) return "attack-speed";
  if (/Projectile/.test(raw)) return "projectile";
  if (numbers.length === 0) return "no-numeric-value";
  if (/% increased\b/.test(raw)) return "increased-unstructured";
  if (/^\+\d+/.test(raw)) return "flat-unstructured";
  return "unclassified";
}

export function unrecognizedStatInventory(
  nodes: readonly Pick<PassiveNode, "id" | "rawStats">[],
): UnrecognizedStatInventory {
  const families = new Map<string, { total: number; distinct: Set<string> }>();
  let lineCount = 0;

  for (const node of nodes) {
    for (const raw of node.rawStats) {
      if (parsePassiveStatLine(raw).status !== "unrecognized") {
        continue;
      }
      lineCount += 1;
      const familyId = unrecognizedStatFamilyId(raw);
      const bucket = families.get(familyId) ?? {
        total: 0,
        distinct: new Set<string>(),
      };
      bucket.total += 1;
      bucket.distinct.add(raw);
      families.set(familyId, bucket);
    }
  }

  return {
    lineCount,
    families: [...families.entries()]
      .map(([familyId, bucket]) => {
        const examples = [...bucket.distinct].sort((left, right) =>
          left.localeCompare(right),
        );
        return {
          familyId,
          totalOccurrences: bucket.total,
          distinctLines: bucket.distinct.size,
          examples: examples.slice(0, EXAMPLE_LIMIT),
        };
      })
      .sort((left, right) => {
        if (right.totalOccurrences !== left.totalOccurrences) {
          return right.totalOccurrences - left.totalOccurrences;
        }
        return left.familyId.localeCompare(right.familyId);
      }),
  };
}

export function unrecognizedStatOccurrences(
  nodes: readonly Pick<PassiveNode, "id" | "name" | "rawStats">[],
): readonly UnrecognizedStatOccurrence[] {
  const occurrences: UnrecognizedStatOccurrence[] = [];
  for (const node of nodes) {
    for (const raw of node.rawStats) {
      if (parsePassiveStatLine(raw).status !== "unrecognized") {
        continue;
      }
      occurrences.push({ raw, nodeId: node.id, nodeName: node.name });
    }
  }
  return occurrences.sort((left, right) => {
    if (left.nodeId !== right.nodeId) {
      return left.nodeId - right.nodeId;
    }
    return left.raw.localeCompare(right.raw);
  });
}
