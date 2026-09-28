import { readFileSync } from "node:fs";
import path from "node:path";
import {
  assessCommunityAugmentationModel,
  COMMUNITY_MODEL_PATCH,
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
  "augmentation-4.5.5.3.json",
);
const model = assessCommunityAugmentationModel({
  snapshotChecksum: report.snapshotChecksum ?? "",
  sourceCommit: report.sourceCommit ?? "",
  communityPatch: COMMUNITY_MODEL_PATCH,
});
if (!model.ok) {
  console.error(`${model.code}: ${model.message}`);
  process.exitCode = 1;
} else {
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as {
    checksum?: string;
    validation?: string;
  };
  const mismatches: string[] = [];
  if (artifact.checksum !== model.checksum) {
    mismatches.push("artifact checksum differs");
  }
  if (artifact.validation !== "blocked") {
    mismatches.push("artifact validation is not blocked");
  }
  console.log(
    JSON.stringify(
      {
        mechanicId: model.mechanicId,
        modelKind: model.modelKind,
        validation: model.validation,
        officialEvidence: model.officialEvidence,
        probabilityStatus: model.probabilityStatus,
        step021: model.step021,
        communityPatch: model.binding.communityPatch,
        checksum: model.checksum,
        differential: model.differential,
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
