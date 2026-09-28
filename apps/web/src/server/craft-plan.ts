import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  indexCraftingSnapshot,
  type CraftingCompatibilityReport,
  type CraftingSnapshot,
  type IndexedCraftingData,
} from "@poe2-helper/crafting-data";
import {
  loadPlannerInputs,
  planCraftTargets,
  searchCraftTargets,
  type PlannerResponse,
  type TargetSearchHit,
} from "@poe2-helper/crafting-planner";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

const snapshotPath = path.join(root, "var", "crafting-data", "snapshot.json");
const reportPath = path.join(
  root,
  "docs",
  "data-snapshots",
  "crafting",
  "compatibility.json",
);

type Session = {
  snapshotMtime: number;
  reportMtime: number;
  snapshot: CraftingSnapshot;
  report: CraftingCompatibilityReport;
  indexed: IndexedCraftingData;
};

let session: Session | null = null;

function openSession():
  | { ok: true; session: Session }
  | { ok: false; error: Extract<PlannerResponse, { ok: false }> } {
  let snapshotMtime = -1;
  let reportMtime = -1;
  try {
    snapshotMtime = statSync(snapshotPath).mtimeMs;
  } catch {
    snapshotMtime = -1;
  }
  try {
    reportMtime = statSync(reportPath).mtimeMs;
  } catch {
    reportMtime = -1;
  }
  if (
    session &&
    session.snapshotMtime === snapshotMtime &&
    session.reportMtime === reportMtime &&
    snapshotMtime >= 0
  ) {
    return { ok: true, session };
  }
  const loaded = loadPlannerInputs(snapshotPath, reportPath);
  if (!loaded.ok) {
    session = null;
    return { ok: false, error: loaded };
  }
  session = {
    snapshotMtime,
    reportMtime,
    snapshot: loaded.snapshot,
    report: loaded.report,
    indexed: indexCraftingSnapshot(loaded.snapshot),
  };
  return { ok: true, session };
}

export function listCraftBases(
  itemClass: string,
):
  | { ok: true; bases: { id: string; name: string }[] }
  | { ok: false; error: Extract<PlannerResponse, { ok: false }> } {
  const opened = openSession();
  if (!opened.ok) {
    return opened;
  }
  const bases = opened.session.snapshot.bases
    .filter((base) => base.itemClass === itemClass)
    .map((base) => ({ id: base.id, name: base.name }))
    .sort((left, right) => {
      if (left.name < right.name) {
        return -1;
      }
      if (left.name > right.name) {
        return 1;
      }
      if (left.id < right.id) {
        return -1;
      }
      if (left.id > right.id) {
        return 1;
      }
      return 0;
    });
  return { ok: true, bases };
}

export function findCraftTargets(
  query: string,
):
  | { ok: true; hits: TargetSearchHit[] }
  | { ok: false; error: Extract<PlannerResponse, { ok: false }> } {
  const opened = openSession();
  if (!opened.ok) {
    return opened;
  }
  return { ok: true, hits: searchCraftTargets(opened.session.snapshot, query) };
}

export function planCraftTargetRequest(input: {
  baseId: string;
  itemLevel: number;
  targets: (
    | { kind: "stat"; statId: string; minimumValue?: number }
    | { kind: "modifier"; modifierId: string }
  )[];
}): PlannerResponse {
  const opened = openSession();
  if (!opened.ok) {
    return opened.error;
  }
  return planCraftTargets(opened.session.snapshot, opened.session.report, {
    base: { id: input.baseId },
    itemLevel: input.itemLevel,
    targets: input.targets,
  });
}
