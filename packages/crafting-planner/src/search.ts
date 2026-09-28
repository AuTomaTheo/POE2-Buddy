import type { CraftingSnapshot } from "@poe2-helper/crafting-data";

const SEARCH_LIMIT = 20;

export type TargetSearchHit = {
  kind: "stat" | "modifier";
  id: string;
  label: string;
  affixKind?: "prefix" | "suffix" | "other";
};

export function searchCraftTargets(
  snapshot: CraftingSnapshot,
  query: string,
): TargetSearchHit[] {
  if (query.length < 2) {
    return [];
  }
  const hits: TargetSearchHit[] = [];
  const seenStats = new Set<string>();
  for (const modifier of snapshot.modifiers) {
    if (
      modifier.id.includes(query) ||
      (modifier.name !== null && modifier.name.includes(query))
    ) {
      hits.push({
        kind: "modifier",
        id: modifier.id,
        label: modifier.name ?? modifier.id,
        affixKind: modifier.affixKind,
      });
    }
    if (modifier.affixKind === "other") {
      continue;
    }
    for (const stat of modifier.stats) {
      if (seenStats.has(stat.id) || !stat.id.includes(query)) {
        continue;
      }
      seenStats.add(stat.id);
      hits.push({ kind: "stat", id: stat.id, label: stat.id });
    }
  }
  hits.sort((left, right) => {
    if (left.id < right.id) {
      return -1;
    }
    if (left.id > right.id) {
      return 1;
    }
    if (left.kind < right.kind) {
      return -1;
    }
    if (left.kind > right.kind) {
      return 1;
    }
    return 0;
  });
  return hits.slice(0, SEARCH_LIMIT);
}
