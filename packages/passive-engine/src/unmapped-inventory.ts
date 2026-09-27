import type { PassiveNode } from "@poe2-helper/domain";
import type { ParsedPassiveEffect } from "./grammar.js";
import { semanticFamilyForEffect, semanticPassiveStats } from "./semantic.js";
import { parsePassiveStatLine, type RecognizedPassiveStat } from "./stats.js";

export type UnmappedStructuredFamily = {
  familyId: string;
  totalOccurrences: number;
  distinctLines: number;
  examples: readonly string[];
};

export type UnmappedStructuredInventory = {
  lineCount: number;
  families: readonly UnmappedStructuredFamily[];
};

const EXAMPLE_LIMIT = 3;

function effectFamilyId(effect: ParsedPassiveEffect): string {
  const source =
    effect.markups.length === 0
      ? "plain"
      : effect.markups.map((markup) => markup.sourceId).join("+");
  const clauses =
    effect.clauses.length === 0
      ? "none"
      : effect.clauses.map((clause) => clause.role).join("+");
  return `${effect.operation}.${source}.${clauses}`;
}

export function unmappedStructuredFamilyId(
  line: RecognizedPassiveStat,
): string {
  const effects = line.effects ?? [];
  const unmapped = effects.filter(
    (effect) => semanticFamilyForEffect(effect) === null,
  );
  const effect = unmapped[0] ?? effects[0];
  if (effect === undefined) return `template.${line.statId}`;
  return effectFamilyId(effect);
}

export function unmappedStructuredInventory(
  nodes: readonly Pick<PassiveNode, "id" | "rawStats">[],
): UnmappedStructuredInventory {
  const families = new Map<string, { total: number; distinct: Set<string> }>();
  let lineCount = 0;

  for (const node of nodes) {
    for (const raw of node.rawStats) {
      const line = parsePassiveStatLine(raw);
      if (line.status !== "recognized") continue;
      if (semanticPassiveStats(line) !== null) continue;
      lineCount += 1;
      const familyId = unmappedStructuredFamilyId(line);
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
      .map(([familyId, bucket]) => ({
        familyId,
        totalOccurrences: bucket.total,
        distinctLines: bucket.distinct.size,
        examples: [...bucket.distinct]
          .sort((left, right) => left.localeCompare(right))
          .slice(0, EXAMPLE_LIMIT),
      }))
      .sort((left, right) => {
        if (right.totalOccurrences !== left.totalOccurrences) {
          return right.totalOccurrences - left.totalOccurrences;
        }
        return left.familyId.localeCompare(right.familyId);
      }),
  };
}
