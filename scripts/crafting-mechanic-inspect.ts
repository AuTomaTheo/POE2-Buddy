import path from "node:path";
import { loadPlannerInputs } from "@poe2-helper/crafting-planner";
import {
  ADD_RANDOM_EXPLICIT_ID,
  addRandomExplicitDefinition,
  buildAddRandomExplicitPool,
} from "@poe2-helper/crafting-mechanics";

const mechanicId = process.argv[2];
if (mechanicId !== ADD_RANDOM_EXPLICIT_ID) {
  console.error(
    `Usage: npm run crafting:mechanic:inspect -- ${ADD_RANDOM_EXPLICIT_ID}`,
  );
  process.exitCode = 1;
} else {
  const root = process.cwd();
  const loaded = loadPlannerInputs(
    path.join(root, "var", "crafting-data", "snapshot.json"),
    path.join(root, "docs", "data-snapshots", "crafting", "compatibility.json"),
  );
  if (!loaded.ok) {
    console.error(`${loaded.code}: ${loaded.message}`);
    process.exitCode = 1;
  } else {
    const samples = ["Rusted Cuirass", "Iron Ring"].map((name) => {
      const base = loaded.snapshot.bases.find((entry) => entry.name === name);
      if (!base) {
        return { name, code: "base-unresolved" };
      }
      const pool = buildAddRandomExplicitPool(loaded.snapshot, loaded.report, {
        baseId: base.id,
        itemLevel: 82,
        rarity: "magic",
        explicitModifierIds: [],
      });
      if (!pool.ok) {
        return { name, code: pool.code, message: pool.message };
      }
      return {
        name,
        baseId: base.id,
        itemClass: base.itemClass,
        stateTransitionStatus: pool.stateTransitionStatus,
        poolStatus: pool.poolStatus,
        candidatePoolStatus: pool.candidatePoolStatus,
        conflictStatus: pool.conflictStatus,
        conflictRuleStatus: pool.conflictRuleStatus,
        slotRuleStatus: pool.slotRuleStatus,
        weightStatus: pool.weightStatus,
        spawnWeightStatus: pool.spawnWeightStatus,
        generationWeightStatus: pool.generationWeightStatus,
        selectionRuleStatus: pool.selectionRuleStatus,
        probabilityStatus: pool.probabilityStatus,
        inspectionCandidateCount: pool.inspectionCandidateIds.length,
        finalMechanicCandidateCount: pool.finalMechanicCandidateIds.length,
        unresolvedCandidateCount: pool.unresolved.length,
        blockers: pool.blockers,
        sampleInspectionIds: pool.inspectionCandidateIds.slice(0, 5),
        checksum: pool.provenance.snapshotChecksum,
        semanticsVersion: pool.semanticsVersion,
      };
    });
    console.log(
      JSON.stringify(
        {
          mechanicId: addRandomExplicitDefinition.id,
          displayName: addRandomExplicitDefinition.displayName,
          semanticsVersion: addRandomExplicitDefinition.semanticsVersion,
          probabilityStatus:
            addRandomExplicitDefinition.outcomeRules.probabilityStatus,
          samples,
        },
        null,
        2,
      ),
    );
  }
}
