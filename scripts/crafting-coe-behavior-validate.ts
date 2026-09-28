import { readFileSync } from "node:fs";
import path from "node:path";
import {
  assessCommunityBehavior,
  COMMUNITY_BEHAVIOR_DISPLAY_TOLERANCE,
  COMMUNITY_MODEL_PATCH,
  oneStageChance,
} from "@poe2-helper/crafting-mechanics";

const root = process.cwd();
const report = JSON.parse(
  readFileSync(
    path.join(root, "docs", "data-snapshots", "crafting", "compatibility.json"),
    "utf8",
  ),
) as { snapshotChecksum?: string; sourceCommit?: string };
const artifactPath = path.join(
  root,
  "docs",
  "data-snapshots",
  "crafting",
  "community-models",
  "augmentation-behavioral-validation-4.5.5.3.json",
);
const behavior = assessCommunityBehavior({
  snapshotChecksum: report.snapshotChecksum ?? "",
  sourceCommit: report.sourceCommit ?? "",
  communityPatch: COMMUNITY_MODEL_PATCH,
});
if (!behavior.ok) {
  console.error(`${behavior.code}: ${behavior.message}`);
  process.exitCode = 1;
} else {
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as {
    checksum?: string;
    validation?: string;
    selectionModel?: string;
    probabilitySample?: {
      totalClassWeight?: number;
      totalSpawnWeight?: number;
      rows?: { classWeight?: number; spawnWeight?: number }[];
    };
  };
  const mismatches: string[] = [];
  if (artifact.checksum !== behavior.checksum) {
    mismatches.push("artifact checksum differs");
  }
  if (artifact.validation !== "blocked") {
    mismatches.push("artifact validation is not blocked");
  }
  if (artifact.selectionModel !== "one-stage") {
    mismatches.push("artifact selection model is not one-stage");
  }
  const sample = artifact.probabilitySample;
  const comparisons = (sample?.rows ?? []).map((row) => {
    const reconstructed =
      row.classWeight !== undefined && sample?.totalClassWeight !== undefined
        ? oneStageChance(row.classWeight, sample.totalClassWeight)
        : null;
    const spawn =
      row.spawnWeight !== undefined && sample?.totalSpawnWeight !== undefined
        ? oneStageChance(row.spawnWeight, sample.totalSpawnWeight)
        : null;
    return { reconstructed, spawn };
  });
  if (
    comparisons.length < 3 ||
    comparisons.some(
      (row) =>
        row.reconstructed === null ||
        row.spawn === null ||
        Math.abs(row.reconstructed - row.spawn) <=
          COMMUNITY_BEHAVIOR_DISPLAY_TOLERANCE,
    )
  ) {
    mismatches.push(
      "a captured chance is inside the spawn-weight display tolerance",
    );
  }
  const zeroMod = behavior.cases.filter(
    (entry) => entry.existingSide === "none",
  );
  if (zeroMod.some((entry) => entry.observedCount !== entry.buddyCount)) {
    mismatches.push(
      "a zero-mod pool does not match the local inspection count",
    );
  }
  console.log(
    JSON.stringify(
      {
        mechanicId: behavior.mechanicId,
        validation: behavior.validation,
        officialEvidence: behavior.officialEvidence,
        selectionModel: behavior.selectionModel,
        slotRule: behavior.slotRule,
        probabilityStatus: behavior.probabilityStatus,
        step021: behavior.step021,
        checksum: behavior.checksum,
        reconstructedChance: comparisons.map((row) => row.reconstructed),
        spawnChance: comparisons[0]?.spawn ?? null,
        mismatches,
      },
      null,
      2,
    ),
  );
  if (mismatches.length > 0) {
    process.exitCode = 1;
  }
}
