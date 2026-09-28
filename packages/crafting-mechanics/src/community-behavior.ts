import { createHash } from "node:crypto";
import { z } from "zod";

import { ADD_RANDOM_EXPLICIT_ID } from "./version.js";
import {
  SIMULATION_SNAPSHOT_CHECKSUM,
  SIMULATION_SOURCE_COMMIT,
} from "./registry.js";
import {
  COMMUNITY_MODEL_LABEL,
  COMMUNITY_MODEL_PATCH,
} from "./community-model.js";

export const COMMUNITY_BEHAVIOR_DISPLAY_TOLERANCE = 0.0001;

const semanticFacts = {
  mechanicId: ADD_RANDOM_EXPLICIT_ID,
  modelKind: "community-derived",
  validation: "blocked",
  communityPatch: COMMUNITY_MODEL_PATCH,
  selectionModel: "one-stage",
  slotRule: "one-prefix-and-one-suffix",
  captureMethod: "public-client-reconstruction",
  zeroModPools: {
    rustedCuirass82: { observed: 144, buddy: 144, prefixes: 59, suffixes: 85 },
    rustedCuirass1: { observed: 10, buddy: 10 },
    ironRing82: { observed: 203, buddy: 203, prefixes: 100, suffixes: 103 },
    witheredWand82: { observed: 118, buddy: 118, prefixes: 52, suffixes: 66 },
  },
  occupiedSide: {
    onePrefixRemaining: { prefixes: 0, suffixes: 85 },
    oneSuffixRemaining: { prefixes: 59, suffixes: 0 },
  },
  probabilitySample: {
    totalClassWeight: 124500,
    totalSpawnWeight: 144,
    rows: [
      { modifierId: "ChaosResist1", classWeight: 250, spawnWeight: 1 },
      { modifierId: "IncreasedSpirit8", classWeight: 100, spawnWeight: 1 },
      { modifierId: "Strength1", classWeight: 1000, spawnWeight: 1 },
    ],
  },
  probabilityStatus: "blocked",
} as const;

export const COMMUNITY_BEHAVIOR_CHECKSUM = `sha256:${createHash("sha256")
  .update(JSON.stringify(semanticFacts))
  .digest("hex")}` as const;

const behaviorSchema = z
  .object({
    ok: z.literal(true),
    mechanicId: z.literal(ADD_RANDOM_EXPLICIT_ID),
    modelKind: z.literal("community-derived"),
    validation: z.literal("blocked"),
    officialEvidence: z.literal("blocked"),
    selectionModel: z.literal("one-stage"),
    slotRule: z.literal("one-prefix-and-one-suffix"),
    probabilityStatus: z.literal("blocked"),
    step021: z.literal("BLOCKED"),
    checksum: z.literal(COMMUNITY_BEHAVIOR_CHECKSUM),
    binding: z
      .object({
        snapshotChecksum: z.literal(SIMULATION_SNAPSHOT_CHECKSUM),
        sourceCommit: z.literal(SIMULATION_SOURCE_COMMIT),
        communityPatch: z.literal(COMMUNITY_MODEL_PATCH),
        communityLabel: z.literal(COMMUNITY_MODEL_LABEL),
        observedOn: z.literal("2026-09-27"),
        captureMethod: z.literal("public-client-reconstruction"),
        dataQuery: z.literal("1790085021"),
        workerQuery: z.literal("1790355360"),
      })
      .strict(),
    cases: z
      .array(
        z
          .object({
            caseId: z.enum(["A", "B", "C", "D", "E", "F"]),
            baseName: z.string(),
            itemLevel: z.number().int(),
            existingSide: z.enum(["none", "prefix", "suffix"]),
            observedCount: z.number().int().nonnegative(),
            buddyCount: z.number().int().nonnegative(),
            prefixCount: z.number().int().nonnegative(),
            suffixCount: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .length(6),
    probabilitySample: z
      .object({
        caseId: z.literal("A"),
        totalClassWeight: z.literal(124500),
        totalSpawnWeight: z.literal(144),
        rows: z
          .array(
            z
              .object({
                modifierId: z.string(),
                classWeight: z.number().int().positive(),
                spawnWeight: z.literal(1),
                reconstructedChance: z.number(),
                spawnChance: z.number(),
                absoluteDifference: z.number(),
                withinDisplayTolerance: z.literal(false),
              })
              .strict(),
          )
          .length(3),
      })
      .strict(),
    limitations: z.array(z.string()).min(1),
  })
  .strict();

const behaviorErrorSchema = z
  .object({
    ok: z.literal(false),
    code: z.enum(["provenance-mismatch", "patch-mismatch"]),
    message: z.string(),
  })
  .strict();

export function oneStageChance(
  weight: number,
  totalWeight: number,
): number | null {
  if (
    !Number.isFinite(weight) ||
    !Number.isFinite(totalWeight) ||
    weight < 0 ||
    totalWeight <= 0
  ) {
    return null;
  }
  return weight / totalWeight;
}

export function equalSideTwoStageChance(
  weight: number,
  sideWeight: number,
): number | null {
  const withinSide = oneStageChance(weight, sideWeight);
  if (withinSide === null) {
    return null;
  }
  return 0.5 * withinSide;
}

export function openMagicSides(existingSide: "none" | "prefix" | "suffix"): {
  prefix: boolean;
  suffix: boolean;
} {
  if (existingSide === "prefix") {
    return { prefix: false, suffix: true };
  }
  if (existingSide === "suffix") {
    return { prefix: true, suffix: false };
  }
  return { prefix: true, suffix: true };
}

export function assessCommunityBehavior(input: {
  snapshotChecksum: string;
  sourceCommit: string;
  communityPatch: string;
}): z.infer<typeof behaviorSchema> | z.infer<typeof behaviorErrorSchema> {
  if (
    input.snapshotChecksum !== SIMULATION_SNAPSHOT_CHECKSUM ||
    input.sourceCommit !== SIMULATION_SOURCE_COMMIT
  ) {
    return behaviorErrorSchema.parse({
      ok: false,
      code: "provenance-mismatch",
      message:
        "The behavioral record does not match this snapshot checksum or source commit.",
    });
  }
  if (input.communityPatch !== COMMUNITY_MODEL_PATCH) {
    return behaviorErrorSchema.parse({
      ok: false,
      code: "patch-mismatch",
      message: `Community patch ${input.communityPatch} is not the observed patch ${COMMUNITY_MODEL_PATCH}.`,
    });
  }
  const spawnChance = oneStageChance(1, 144);
  if (spawnChance === null) {
    throw new Error("The recorded Augmentation sample has no spawn chance.");
  }
  const rows = (
    [
      ["ChaosResist1", 250],
      ["IncreasedSpirit8", 100],
      ["Strength1", 1000],
    ] as const
  ).map(([modifierId, classWeight]) => {
    const reconstructedChance = oneStageChance(classWeight, 124500);
    if (reconstructedChance === null) {
      throw new Error("The recorded Augmentation sample has no class chance.");
    }
    const absoluteDifference = Math.abs(reconstructedChance - spawnChance);
    return {
      modifierId,
      classWeight,
      spawnWeight: 1 as const,
      reconstructedChance,
      spawnChance,
      absoluteDifference,
      withinDisplayTolerance:
        absoluteDifference <= COMMUNITY_BEHAVIOR_DISPLAY_TOLERANCE,
    };
  });
  return behaviorSchema.parse({
    ok: true,
    mechanicId: ADD_RANDOM_EXPLICIT_ID,
    modelKind: "community-derived",
    validation: "blocked",
    officialEvidence: "blocked",
    selectionModel: "one-stage",
    slotRule: "one-prefix-and-one-suffix",
    probabilityStatus: "blocked",
    step021: "BLOCKED",
    checksum: COMMUNITY_BEHAVIOR_CHECKSUM,
    binding: {
      snapshotChecksum: SIMULATION_SNAPSHOT_CHECKSUM,
      sourceCommit: SIMULATION_SOURCE_COMMIT,
      communityPatch: COMMUNITY_MODEL_PATCH,
      communityLabel: COMMUNITY_MODEL_LABEL,
      observedOn: "2026-09-27",
      captureMethod: "public-client-reconstruction",
      dataQuery: "1790085021",
      workerQuery: "1790355360",
    },
    cases: [
      {
        caseId: "A",
        baseName: "Rusted Cuirass",
        itemLevel: 82,
        existingSide: "none",
        observedCount: 144,
        buddyCount: 144,
        prefixCount: 59,
        suffixCount: 85,
      },
      {
        caseId: "B",
        baseName: "Rusted Cuirass",
        itemLevel: 82,
        existingSide: "prefix",
        observedCount: 85,
        buddyCount: 85,
        prefixCount: 0,
        suffixCount: 85,
      },
      {
        caseId: "C",
        baseName: "Rusted Cuirass",
        itemLevel: 82,
        existingSide: "suffix",
        observedCount: 59,
        buddyCount: 59,
        prefixCount: 59,
        suffixCount: 0,
      },
      {
        caseId: "D",
        baseName: "Rusted Cuirass",
        itemLevel: 1,
        existingSide: "none",
        observedCount: 10,
        buddyCount: 10,
        prefixCount: 3,
        suffixCount: 7,
      },
      {
        caseId: "E",
        baseName: "Iron Ring",
        itemLevel: 82,
        existingSide: "none",
        observedCount: 203,
        buddyCount: 203,
        prefixCount: 100,
        suffixCount: 103,
      },
      {
        caseId: "F",
        baseName: "Withered Wand",
        itemLevel: 82,
        existingSide: "none",
        observedCount: 118,
        buddyCount: 118,
        prefixCount: 52,
        suffixCount: 66,
      },
    ],
    probabilitySample: {
      caseId: "A",
      totalClassWeight: 124500,
      totalSpawnWeight: 144,
      rows,
    },
    limitations: [
      "The in-editor browser could not open the calculator, so chances were reconstructed from the public client weight draw.",
      "Class weight is not a scale of RePoE spawn weight, and the class-weight table was not copied.",
      "Magic side capacity closes the whole side, so same-group blocking was not isolated.",
      "Greater and Perfect minimum modifier levels stay tool properties.",
      "The direct-evidence model stays blocked.",
    ],
  });
}
