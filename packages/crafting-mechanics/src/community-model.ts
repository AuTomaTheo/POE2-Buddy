import { createHash } from "node:crypto";
import { z } from "zod";

import { ADD_RANDOM_EXPLICIT_ID } from "./version.js";
import {
  SIMULATION_SNAPSHOT_CHECKSUM,
  SIMULATION_SOURCE_COMMIT,
} from "./registry.js";

export const COMMUNITY_MODEL_PATCH = "4.5.5.3" as const;
export const COMMUNITY_MODEL_LABEL = "0.5.5.3" as const;

const semanticFacts = {
  mechanicId: ADD_RANDOM_EXPLICIT_ID,
  modelKind: "community-derived",
  validation: "blocked",
  communityPatch: COMMUNITY_MODEL_PATCH,
  communityLabel: COMMUNITY_MODEL_LABEL,
  sourceCommit: SIMULATION_SOURCE_COMMIT,
  snapshotChecksum: SIMULATION_SNAPSHOT_CHECKSUM,
  inspectionIdsPresentInCommunityDictionary: {
    "Rusted Cuirass": { inspection: 144, present: 144 },
    "Iron Ring": { inspection: 203, present: 203 },
    "Withered Wand": { inspection: 118, present: 118 },
  },
  positiveSpawnWeightPrefixSuffixAtItemLevel82: {
    "Rusted Cuirass": { buddy: 913, missingFromCommunityDictionary: 692 },
    "Iron Ring": { buddy: 984, missingFromCommunityDictionary: 692 },
  },
  distinctPowerToSpawnWeightRatios: {
    "Rusted Cuirass": 134,
    "Iron Ring": 121,
  },
  mappedAffixKindMismatches: 0,
  greaterMinimumModifierLevel: 44,
  perfectMinimumModifierLevel: 70,
  probabilityStatus: "blocked",
} as const;

export const COMMUNITY_MODEL_CHECKSUM = `sha256:${createHash("sha256")
  .update(JSON.stringify(semanticFacts))
  .digest("hex")}` as const;

export const communityModelSchema = z
  .object({
    ok: z.literal(true),
    mechanicId: z.literal(ADD_RANDOM_EXPLICIT_ID),
    modelKind: z.literal("community-derived"),
    validation: z.literal("blocked"),
    officialEvidence: z.literal("blocked"),
    probabilityStatus: z.literal("blocked"),
    step021: z.literal("BLOCKED"),
    checksum: z.literal(COMMUNITY_MODEL_CHECKSUM),
    binding: z
      .object({
        snapshotChecksum: z.literal(SIMULATION_SNAPSHOT_CHECKSUM),
        sourceCommit: z.literal(SIMULATION_SOURCE_COMMIT),
        communityPatch: z.literal(COMMUNITY_MODEL_PATCH),
        communityLabel: z.literal(COMMUNITY_MODEL_LABEL),
        observedOn: z.literal("2026-09-27"),
      })
      .strict(),
    limitations: z.array(z.string()).min(1),
    differential: z
      .object({
        rustedCuirassInspectionPresent: z.literal(144),
        ironRingInspectionPresent: z.literal(203),
        witheredWandInspectionPresent: z.literal(118),
        bodyDistinctPowerRatios: z.literal(134),
        ringDistinctPowerRatios: z.literal(121),
        greaterMinimumModifierLevel: z.literal(44),
        perfectMinimumModifierLevel: z.literal(70),
      })
      .strict(),
  })
  .strict();

export const communityModelErrorSchema = z
  .object({
    ok: z.literal(false),
    code: z.enum(["provenance-mismatch", "patch-mismatch"]),
    message: z.string(),
  })
  .strict();

export function assessCommunityAugmentationModel(input: {
  snapshotChecksum: string;
  sourceCommit: string;
  communityPatch: string;
}):
  | z.infer<typeof communityModelSchema>
  | z.infer<typeof communityModelErrorSchema> {
  if (
    input.snapshotChecksum !== SIMULATION_SNAPSHOT_CHECKSUM ||
    input.sourceCommit !== SIMULATION_SOURCE_COMMIT
  ) {
    return communityModelErrorSchema.parse({
      ok: false,
      code: "provenance-mismatch",
      message:
        "The community-model record does not match this snapshot checksum or source commit.",
    });
  }
  if (input.communityPatch !== COMMUNITY_MODEL_PATCH) {
    return communityModelErrorSchema.parse({
      ok: false,
      code: "patch-mismatch",
      message: `Community patch ${input.communityPatch} is not the observed patch ${COMMUNITY_MODEL_PATCH}.`,
    });
  }
  return communityModelSchema.parse({
    ok: true,
    mechanicId: ADD_RANDOM_EXPLICIT_ID,
    modelKind: "community-derived",
    validation: "blocked",
    officialEvidence: "blocked",
    probabilityStatus: "blocked",
    step021: "BLOCKED",
    checksum: COMMUNITY_MODEL_CHECKSUM,
    binding: {
      snapshotChecksum: SIMULATION_SNAPSHOT_CHECKSUM,
      sourceCommit: SIMULATION_SOURCE_COMMIT,
      communityPatch: COMMUNITY_MODEL_PATCH,
      communityLabel: COMMUNITY_MODEL_LABEL,
      observedOn: "2026-09-27",
    },
    limitations: [
      "Craft of Exile power is not a single scale of the RePoE spawn weight.",
      "Dictionary overlap is not an Orb of Augmentation candidate pool.",
      "No calculator probability was reproduced.",
      "Greater and Perfect minimum modifier levels are tool properties, not item text.",
      "The direct-evidence model stays blocked.",
    ],
    differential: {
      rustedCuirassInspectionPresent: 144,
      ironRingInspectionPresent: 203,
      witheredWandInspectionPresent: 118,
      bodyDistinctPowerRatios: 134,
      ringDistinctPowerRatios: 121,
      greaterMinimumModifierLevel: 44,
      perfectMinimumModifierLevel: 70,
    },
  });
}

export function probabilityStatusForCommunityWeight(
  weightStatus: "match" | "scaled-equivalent" | "mismatch" | "unavailable",
): "blocked" {
  switch (weightStatus) {
    case "unavailable":
    case "mismatch":
    case "match":
    case "scaled-equivalent":
      return "blocked";
  }
}
