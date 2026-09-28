import type { CraftingSnapshot } from "./schema.js";
import { stableStringify } from "./canonical.js";

export type SnapshotDiff = {
  basesAdded: string[];
  basesRemoved: string[];
  basesChanged: string[];
  modsAdded: string[];
  modsRemoved: string[];
  modsChanged: string[];
  statsAdded: string[];
  statsRemoved: string[];
  statsChanged: string[];
  domainsAdded: string[];
  generationTypesAdded: string[];
  unknownValuesAdded: string[];
  safety: "unclassified";
};

export function diffCraftingSnapshots(
  before: CraftingSnapshot,
  after: CraftingSnapshot,
): SnapshotDiff {
  const beforeBases = new Map(before.bases.map((base) => [base.id, base]));
  const afterBases = new Map(after.bases.map((base) => [base.id, base]));
  const beforeMods = new Map(before.modifiers.map((mod) => [mod.id, mod]));
  const afterMods = new Map(after.modifiers.map((mod) => [mod.id, mod]));
  const beforeStats = statSignatures(before);
  const afterStats = statSignatures(after);

  return {
    basesAdded: addedKeys(beforeBases, afterBases),
    basesRemoved: addedKeys(afterBases, beforeBases),
    basesChanged: changedKeys(beforeBases, afterBases),
    modsAdded: addedKeys(beforeMods, afterMods),
    modsRemoved: addedKeys(afterMods, beforeMods),
    modsChanged: changedKeys(beforeMods, afterMods),
    statsAdded: addedKeys(beforeStats, afterStats),
    statsRemoved: addedKeys(afterStats, beforeStats),
    statsChanged: changedKeys(beforeStats, afterStats),
    domainsAdded: addedValues(domainsOf(before), domainsOf(after)),
    generationTypesAdded: addedValues(
      generationTypesOf(before),
      generationTypesOf(after),
    ),
    unknownValuesAdded: [],
    safety: "unclassified",
  };
}

function statSignatures(snapshot: CraftingSnapshot): Map<string, string> {
  const grouped = new Map<string, string[]>();
  for (const modifier of snapshot.modifiers) {
    modifier.stats.forEach((stat, index) => {
      const list = grouped.get(stat.id) ?? [];
      list.push(`${modifier.id}:${index}:${stat.min}:${stat.max}`);
      grouped.set(stat.id, list);
    });
  }
  const signatures = new Map<string, string>();
  for (const [id, list] of grouped) {
    signatures.set(id, [...list].sort().join("|"));
  }
  return signatures;
}

function domainsOf(snapshot: CraftingSnapshot): Set<string> {
  const domains = new Set<string>();
  for (const base of snapshot.bases) {
    if (base.domain) {
      domains.add(base.domain);
    }
  }
  for (const modifier of snapshot.modifiers) {
    if (modifier.domain) {
      domains.add(modifier.domain);
    }
  }
  return domains;
}

function generationTypesOf(snapshot: CraftingSnapshot): Set<string> {
  return new Set(snapshot.modifiers.map((modifier) => modifier.generationType));
}

function addedKeys<T>(before: Map<string, T>, after: Map<string, T>): string[] {
  return [...after.keys()].filter((key) => !before.has(key)).sort();
}

function changedKeys<T>(
  before: Map<string, T>,
  after: Map<string, T>,
): string[] {
  const changed: string[] = [];
  for (const [key, afterValue] of after) {
    const beforeValue = before.get(key);
    if (beforeValue === undefined) {
      continue;
    }
    if (stableStringify(beforeValue) !== stableStringify(afterValue)) {
      changed.push(key);
    }
  }
  return changed.sort();
}

function addedValues(before: Set<string>, after: Set<string>): string[] {
  return [...after].filter((value) => !before.has(value)).sort();
}
