import { readFileSync } from "node:fs";
import path from "node:path";
import {
  COMMUNITY_WEIGHT_PATCH,
  COMMUNITY_WEIGHT_SCHEMA_VERSION,
  communityWeightChecksum,
  type CommunityWeightRecord,
} from "@poe2-helper/crafting-mechanics";

const root = process.cwd();
const manifest = JSON.parse(
  readFileSync(
    path.join(
      root,
      "docs",
      "data-snapshots",
      "crafting",
      "community-weights",
      "manifest.json",
    ),
    "utf8",
  ),
) as {
  checksum?: string;
  step021?: string;
  samples?: { modifierId: string; weight: number; probability: number }[];
};
const current = JSON.parse(
  readFileSync(
    path.join(
      root,
      "var",
      "crafting-community-weights",
      "current-4.5.5.3.json",
    ),
    "utf8",
  ),
) as { patch?: string; records?: CommunityWeightRecord[]; checksum?: string };

const failures: string[] = [];
if (current.patch !== COMMUNITY_WEIGHT_PATCH) {
  failures.push("local weight patch drifted");
}
const checksum = communityWeightChecksum(current.records ?? []);
if (checksum !== current.checksum || checksum !== manifest.checksum) {
  failures.push("weight checksum drifted");
}
if (manifest.step021?.includes("BLOCKED")) {
  failures.push("promoted manifest is blocked");
}
for (const sample of manifest.samples ?? []) {
  const record = current.records?.find(
    (row) =>
      row.modifierId === sample.modifierId && row.scope === "body-armour-str",
  );
  if (!record || record.weight !== sample.weight) {
    failures.push(`${sample.modifierId} is missing from the local snapshot`);
  }
}
console.log(
  JSON.stringify(
    {
      schemaVersion: COMMUNITY_WEIGHT_SCHEMA_VERSION,
      checksum,
      step021: manifest.step021,
      failures,
    },
    null,
    2,
  ),
);
if (failures.length > 0) {
  process.exitCode = 1;
}
