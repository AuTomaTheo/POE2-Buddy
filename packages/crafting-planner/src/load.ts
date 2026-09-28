import { readFileSync } from "node:fs";

import {
  CRAFTING_COMPATIBILITY_POLICY_VERSION,
  type CraftingCompatibilityReport,
  type CraftingSnapshot,
  parseCraftingSnapshot,
} from "@poe2-helper/crafting-data";
import { z } from "zod";

import { plannerErrorSchema } from "./schema.js";
import { PLANNER_SETUP_MESSAGE } from "./version.js";

const capabilitySchema = z.enum(["compatible", "incompatible", "unknown"]);

const reportSchema = z
  .object({
    policyVersion: z.literal(CRAFTING_COMPATIBILITY_POLICY_VERSION),
    snapshotChecksum: z.string(),
    schemaVersion: z.number(),
    sourceCommit: z.string(),
    buddyPassiveTreePin: z.literal("0.5.5"),
    evidenceSource: z.string(),
    checks: z.array(z.unknown()),
    capabilities: z.record(capabilitySchema),
    conclusion: capabilitySchema,
    unresolved: z.array(z.string()),
    supportedItemClasses: z.array(z.string()),
    unsupportedItemClasses: z.array(
      z.object({ itemClass: z.string(), reason: z.string() }),
    ),
    distributionReadiness: z.literal("blocked"),
    localDevelopmentOnly: z.boolean(),
    modGroupExclusivity: capabilitySchema,
    generationWeights: capabilitySchema,
  })
  .passthrough();

export function loadPlannerInputs(
  snapshotPath: string,
  reportPath: string,
):
  | {
      ok: true;
      snapshot: CraftingSnapshot;
      report: CraftingCompatibilityReport;
    }
  | ReturnType<typeof plannerErrorSchema.parse> {
  let snapshotText: string;
  try {
    snapshotText = readFileSync(snapshotPath, "utf8");
  } catch {
    return plannerErrorSchema.parse({
      ok: false,
      code: "snapshot-unavailable",
      message: PLANNER_SETUP_MESSAGE,
      setup: PLANNER_SETUP_MESSAGE,
    });
  }
  const snapshot = parseCraftingSnapshot(JSON.parse(snapshotText));
  if (!snapshot.ok) {
    return plannerErrorSchema.parse({
      ok: false,
      code:
        snapshot.error.code === "snapshot-incompatible"
          ? "snapshot-incompatible"
          : "snapshot-unavailable",
      message: snapshot.error.message,
      setup: PLANNER_SETUP_MESSAGE,
    });
  }
  let reportText: string;
  try {
    reportText = readFileSync(reportPath, "utf8");
  } catch {
    return plannerErrorSchema.parse({
      ok: false,
      code: "planner-not-ready",
      message:
        "The crafting compatibility report is missing. Run npm run crafting:readiness.",
      setup: PLANNER_SETUP_MESSAGE,
      compatibilityPolicyVersion: CRAFTING_COMPATIBILITY_POLICY_VERSION,
    });
  }
  const report = reportSchema.safeParse(JSON.parse(reportText));
  if (!report.success) {
    return plannerErrorSchema.parse({
      ok: false,
      code: "planner-not-ready",
      message: "The crafting compatibility report is not usable.",
      setup: PLANNER_SETUP_MESSAGE,
      compatibilityPolicyVersion: CRAFTING_COMPATIBILITY_POLICY_VERSION,
    });
  }
  return {
    ok: true,
    snapshot: snapshot.value,
    report: report.data as CraftingCompatibilityReport,
  };
}
