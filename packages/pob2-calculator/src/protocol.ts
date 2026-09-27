import { z } from "zod";
import { CALCULATOR_ERROR_CODES } from "./errors.js";
import { ALLOCATION_MODES, CALCULATOR_PROTOCOL_VERSION } from "./metrics.js";

export const skillIdentitySchema = z
  .object({
    name: z.string().nullable(),
    effectId: z.string().nullable(),
    sourceGem: z.string().nullable(),
    skillTypes: z.array(z.string()),
    baseFlags: z.array(z.string()),
  })
  .strict();

export type SkillIdentity = z.infer<typeof skillIdentitySchema>;

export const allocationReportSchema = z
  .object({
    requestedNodeIds: z.array(z.number().int()),
    expectedNodeIds: z.array(z.number().int()),
    actuallyAllocatedNodeIds: z.array(z.number().int()),
    unexpectedNodeIds: z.array(z.number().int()),
    missingNodeIds: z.array(z.number().int()),
    allocationMode: z.enum(ALLOCATION_MODES),
  })
  .strict();

export type AllocationReport = z.infer<typeof allocationReportSchema>;

export const workerResponseSchema = z
  .object({
    ok: z.boolean(),
    requestId: z.string().min(1),
    protocolVersion: z.literal(CALCULATOR_PROTOCOL_VERSION),
    pobVersion: z.string().min(1).optional(),
    treeKey: z.string().min(1).optional(),
    error: z
      .object({
        code: z.enum(CALCULATOR_ERROR_CODES),
      })
      .strict()
      .optional(),
    allocation: allocationReportSchema.optional(),
    baseline: z
      .object({
        metrics: z.record(z.string(), z.number()),
        skill: skillIdentitySchema,
      })
      .strict()
      .optional(),
    candidate: z
      .object({
        metrics: z.record(z.string(), z.number()),
        skill: skillIdentitySchema,
        allocatedNodeIds: z.array(z.number().int()),
        allocationMode: z.enum(ALLOCATION_MODES),
      })
      .strict()
      .optional(),
    item: z
      .object({
        slot: z.string().min(1),
        metrics: z.record(z.string(), z.number()),
        skill: skillIdentitySchema,
        baselineItemId: z.number().int().nullable(),
        baselineItemRaw: z.string().nullable(),
        restoredItemId: z.number().int().nullable(),
      })
      .strict()
      .optional(),
    restoreMetrics: z.record(z.string(), z.number()).optional(),
    weaponSetNodes: z
      .array(
        z
          .object({
            id: z.number().int(),
            allocMode: z.number().int(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export type WorkerResponse = z.infer<typeof workerResponseSchema>;

export const MAX_CANDIDATE_NODES = 50;
export const MAX_CANDIDATE_BATCH = 50;

export function parseWorkerResponse(value: unknown): WorkerResponse | null {
  const parsed = workerResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
