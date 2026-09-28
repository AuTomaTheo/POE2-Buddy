"use server";

import {
  findCraftTargets,
  listCraftBases,
  planCraftTargetRequest,
} from "../server/craft-plan";

export async function loadCraftBases(itemClass: string) {
  return listCraftBases(itemClass);
}

export async function searchCraftTargetOptions(query: string) {
  return findCraftTargets(query);
}

export async function submitCraftTargets(input: {
  baseId: string;
  itemLevel: number;
  targets: (
    | { kind: "stat"; statId: string; minimumValue?: number }
    | { kind: "modifier"; modifierId: string }
  )[];
}) {
  return planCraftTargetRequest(input);
}
