import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  parseCraftingSnapshot,
  requirePlannerCompatibility,
} from "@poe2-helper/crafting-data";

const snapshotPath = path.join(
  process.cwd(),
  "var",
  "crafting-data",
  "snapshot.json",
);

if (!existsSync(snapshotPath)) {
  console.error(
    "snapshot-unavailable: No local crafting snapshot. Run npm run refresh:crafting-data.",
  );
  process.exitCode = 1;
} else {
  const parsed = parseCraftingSnapshot(
    JSON.parse(readFileSync(snapshotPath, "utf8")),
  );
  if (!parsed.ok) {
    console.error(`${parsed.error.code}: ${parsed.error.message}`);
    process.exitCode = 1;
  } else {
    const planner = requirePlannerCompatibility(parsed.value);
    console.log(
      JSON.stringify(
        {
          checksum: parsed.value.checksum,
          schemaVersion: parsed.value.schemaVersion,
          commit: parsed.value.provenance.commit,
          readiness: parsed.value.readiness,
          coverage: parsed.value.coverage,
          planner: planner.ok ? "open" : planner.error.code,
        },
        null,
        2,
      ),
    );
  }
}
