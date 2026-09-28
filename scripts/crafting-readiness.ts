import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  CRAFTING_SETUP_MESSAGE,
  assessPlannerReadiness,
  buildCraftingCompatibilityReport,
  parseCraftingSnapshot,
  summarizePresentation,
  indexCraftingSnapshot,
} from "@poe2-helper/crafting-data";

const root = process.cwd();
const snapshotPath = path.join(root, "var", "crafting-data", "snapshot.json");
const compatibilityPath = path.join(
  root,
  "docs",
  "data-snapshots",
  "crafting",
  "compatibility.json",
);
const manifestPath = path.join(
  root,
  "docs",
  "data-snapshots",
  "crafting",
  "manifest.json",
);

if (!existsSync(snapshotPath)) {
  console.error(`snapshot-unavailable: ${CRAFTING_SETUP_MESSAGE}`);
  process.exitCode = 1;
} else {
  const parsed = parseCraftingSnapshot(
    JSON.parse(readFileSync(snapshotPath, "utf8")),
  );
  if (!parsed.ok) {
    console.error(`${parsed.error.code}: ${parsed.error.message}`);
    process.exitCode = 1;
  } else {
    const report = buildCraftingCompatibilityReport(parsed.value);
    const readiness = assessPlannerReadiness(parsed.value, report);
    mkdirSync(path.dirname(compatibilityPath), { recursive: true });
    writeFileSync(compatibilityPath, `${JSON.stringify(report, null, 2)}\n`);
    if (existsSync(manifestPath) && readiness.ok) {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<
        string,
        unknown
      >;
      delete manifest.productionPromoted;
      delete manifest.promotionBlocker;
      manifest.promotion = {
        normalized: true,
        validated: true,
        plannerApproved: readiness.value.plannerReadiness === "ready",
        distributionApproved: false,
      };
      manifest.plannerReadiness = readiness.value.plannerReadiness;
      manifest.compatibilityReport =
        "docs/data-snapshots/crafting/compatibility.json";
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    }
    if (!readiness.ok) {
      console.error(`${readiness.error.code}: ${readiness.error.message}`);
      process.exitCode = 1;
    } else {
      const presentation = summarizePresentation(
        indexCraftingSnapshot(parsed.value),
      );
      console.log(
        JSON.stringify(
          {
            snapshot: parsed.value.checksum,
            semanticReadiness: readiness.value.semanticReadiness,
            plannerReadiness: readiness.value.plannerReadiness,
            presentationReadiness: readiness.value.presentationReadiness,
            distributionReadiness: readiness.value.distributionReadiness,
            conclusion: report.conclusion,
            supportedItemClasses:
              readiness.value.snapshotProvenance.supportedItemClasses,
            blockedCapabilities: readiness.value.blockedCapabilities,
            presentation,
          },
          null,
          2,
        ),
      );
    }
  }
}
