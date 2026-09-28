import { readFileSync } from "node:fs";
import path from "node:path";
import { loadPlannerInputs } from "@poe2-helper/crafting-planner";
import {
  ADD_RANDOM_EXPLICIT_ID,
  assessSimulationRegistry,
  buildAddRandomExplicitPool,
  comparedCurrencyTexts,
  essenceBodyNameRecords,
  SIMULATION_DECISION,
} from "@poe2-helper/crafting-mechanics";

const root = process.cwd();
const reportPath = path.join(
  root,
  "docs",
  "data-snapshots",
  "crafting",
  "compatibility.json",
);
const artifactPath = path.join(
  root,
  "docs",
  "data-snapshots",
  "crafting",
  "mechanics",
  "simulator-readiness.json",
);
const sourcePath = path.join(
  root,
  "var",
  "crafting-source",
  "data",
  "base_items.json",
);
const modsPath = path.join(root, "var", "crafting-source", "data", "mods.json");

const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
  snapshotChecksum?: string;
  sourceCommit?: string;
};
const registry = assessSimulationRegistry({
  snapshotChecksum: report.snapshotChecksum ?? "",
  sourceCommit: report.sourceCommit ?? "",
});
if (!registry.ok) {
  console.error(`${registry.code}: ${registry.message}`);
  process.exitCode = 1;
} else {
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as {
    decision?: string;
    selectedMechanicId?: string | null;
  };
  const mismatches: string[] = [];
  if (artifact.decision !== registry.decision) {
    mismatches.push("artifact decision differs");
  }
  if (artifact.selectedMechanicId !== null) {
    mismatches.push("artifact selects a mechanic");
  }
  if (registry.decision !== SIMULATION_DECISION) {
    mismatches.push("registry decision differs");
  }

  const bases = JSON.parse(readFileSync(sourcePath, "utf8")) as Record<
    string,
    { properties?: { description?: string; directions?: string } }
  >;
  for (const currency of comparedCurrencyTexts) {
    const record = bases[currency.currencyRecordId];
    if (record?.properties?.description !== currency.description) {
      mismatches.push(`${currency.currencyRecordId} description differs`);
    }
    if (record?.properties?.directions !== currency.directions) {
      mismatches.push(`${currency.currencyRecordId} directions differ`);
    }
  }
  const mods = JSON.parse(readFileSync(modsPath, "utf8")) as Record<
    string,
    { name?: string; domain?: string }
  >;
  for (const id of essenceBodyNameRecords) {
    const mod = mods[id];
    if (mod?.name !== "Essence of the Body" || mod.domain !== "monster") {
      mismatches.push(
        `${id} is no longer a monster-domain Essence of the Body`,
      );
    }
  }

  const loaded = loadPlannerInputs(
    path.join(root, "var", "crafting-data", "snapshot.json"),
    reportPath,
  );
  const samples = loaded.ok
    ? ["Rusted Cuirass", "Iron Ring"].map((name) => {
        const base = loaded.snapshot.bases.find((entry) => entry.name === name);
        if (!base) {
          return { name, code: "base-unresolved" };
        }
        const pool = buildAddRandomExplicitPool(
          loaded.snapshot,
          loaded.report,
          {
            baseId: base.id,
            itemLevel: 82,
            rarity: "magic",
            explicitModifierIds: [],
          },
        );
        if (!pool.ok) {
          return { name, code: pool.code, message: pool.message };
        }
        return {
          name,
          itemClass: base.itemClass,
          stateTransitionStatus: pool.stateTransitionStatus,
          poolStatus: pool.poolStatus,
          selectionRuleStatus: pool.selectionRuleStatus,
          probabilityStatus: pool.probabilityStatus,
          supportedScope: "magic item with zero explicit modifier ids",
          finalMechanicCandidateCount: pool.finalMechanicCandidateIds.length,
          simulatable: false,
        };
      })
    : [{ code: loaded.code, message: loaded.message }];

  console.log(
    JSON.stringify(
      {
        decision: registry.decision,
        selectedMechanicId: registry.selectedMechanicId,
        step021: registry.step021,
        mechanics: registry.mechanics.map((mechanic) => ({
          mechanicId: mechanic.mechanicId,
          displayName: mechanic.displayName,
          readiness: mechanic.readiness,
          pool: mechanic.pool,
          probabilityStatus: mechanic.probabilityStatus,
          supportedScope: mechanic.supportedScope,
        })),
        samples,
        mismatches,
      },
      null,
      2,
    ),
  );
  if (mismatches.length > 0 || !loaded.ok) {
    process.exitCode = 1;
  }
  if (
    registry.mechanics.some(
      (mechanic) =>
        mechanic.mechanicId === ADD_RANDOM_EXPLICIT_ID &&
        mechanic.readiness === "ready-for-simulation",
    )
  ) {
    process.exitCode = 1;
  }
}
