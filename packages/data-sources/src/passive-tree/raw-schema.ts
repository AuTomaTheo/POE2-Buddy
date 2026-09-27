import { z } from "zod";

const numericSkillIdSchema = z.union([
  z.number().int().nonnegative(),
  z.string().regex(/^\d+$/),
]);

const edgeEndpointSchema = z.union([numericSkillIdSchema, z.literal("root")]);

/**
 * Flags that become `PassiveNode.kinds`.
 * The order is the order stored on a node when several are present.
 */
export const PASSIVE_KIND_FLAGS = [
  ["isKeystone", "keystone"],
  ["isNotable", "notable"],
  ["isJewelSocket", "jewel-socket"],
  ["isMastery", "mastery"],
  ["isGenericAttribute", "attribute"],
  ["isAscendancyStart", "ascendancy-start"],
] as const;

/** Export flags that are kept, but are not structural kinds. */
export const PASSIVE_SOURCE_FLAGS = [
  "isBlighted",
  "isFree",
  "isMultipleChoice",
  "isMultipleChoiceOption",
] as const;

const knownIsFlags = new Set<string>([
  ...PASSIVE_KIND_FLAGS.map(([flag]) => flag),
  ...PASSIVE_SOURCE_FLAGS,
]);

const optionalTrueFlag = z.literal(true).optional();

export const skillTreeExportNodeSchema = z
  .object({
    skill: z.number().int().nonnegative().optional(),
    name: z.string().optional(),
    stats: z.array(z.string()).optional(),
    out: z.array(numericSkillIdSchema),
    in: z.array(numericSkillIdSchema),
    x: z.number().finite().optional(),
    y: z.number().finite().optional(),
    ascendancyId: z.string().min(1).optional(),
    classStartIndex: z.array(z.number().int().nonnegative()).optional(),
    isKeystone: optionalTrueFlag,
    isNotable: optionalTrueFlag,
    isJewelSocket: optionalTrueFlag,
    isMastery: optionalTrueFlag,
    isGenericAttribute: optionalTrueFlag,
    isAscendancyStart: optionalTrueFlag,
    isBlighted: optionalTrueFlag,
    isFree: optionalTrueFlag,
    isMultipleChoice: optionalTrueFlag,
    isMultipleChoiceOption: optionalTrueFlag,
  })
  .passthrough()
  .superRefine((node, context) => {
    for (const key of Object.keys(node)) {
      if (!key.startsWith("is") || knownIsFlags.has(key)) {
        continue;
      }
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unrecognized passive node flag ${key}.`,
        path: [key],
      });
    }

    const hasSkill = node.skill !== undefined;
    if (hasSkill && (node.name === undefined || node.stats === undefined)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Passive node ${node.skill} is missing name or stats.`,
        path: ["skill"],
      });
    }
  });

export const skillTreeExportSchema = z
  .object({
    classes: z.array(
      z
        .object({
          name: z.string().min(1),
        })
        .passthrough(),
    ),
    nodes: z.record(z.string(), skillTreeExportNodeSchema),
    edges: z.array(
      z
        .object({
          from: edgeEndpointSchema,
          to: edgeEndpointSchema,
        })
        .passthrough(),
    ),
  })
  .passthrough();

export type SkillTreeExport = z.infer<typeof skillTreeExportSchema>;
export type SkillTreeExportNode = z.infer<typeof skillTreeExportNodeSchema>;

export function parseSkillTreeExport(value: unknown): SkillTreeExport {
  const result = skillTreeExportSchema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `Passive tree export schema is incompatible: ${result.error.message}`,
    );
  }
  return result.data;
}
