import { z } from "zod";
import { gameDataVersionSchema } from "./version";

/** Numeric passive skill graph id. Official tree exports call this `skill`. */
export const passiveNodeIdSchema = z.number().int().nonnegative();

export type PassiveNodeId = z.infer<typeof passiveNodeIdSchema>;

/**
 * Structural kind from the official tree export flags.
 * A node may have more than one. Ascendancy membership is stored separately
 * in `ascendancyId`, because an ascendancy node can also be a notable or socket.
 */
export const passiveNodeKindSchema = z.enum([
  "small",
  "notable",
  "keystone",
  "jewel-socket",
  "mastery",
  "attribute",
  "ascendancy-start",
  "unknown",
]);

export type PassiveNodeKind = z.infer<typeof passiveNodeKindSchema>;

export const passiveNodeSchema = z
  .object({
    id: passiveNodeIdSchema,
    name: z.string(),
    rawStats: z.array(z.string()),
    neighborIds: z.array(passiveNodeIdSchema),
    kinds: z.array(passiveNodeKindSchema).min(1),
    sourceFlags: z.array(z.string().min(1)),
    ascendancyId: z.string().min(1).optional(),
    position: z
      .object({
        x: z.number().finite(),
        y: z.number().finite(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((node, context) => {
    if (new Set(node.kinds).size !== node.kinds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Node ${node.id} lists a kind more than once.`,
        path: ["kinds"],
      });
    }
    if (node.kinds.includes("small") && node.kinds.length > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Node ${node.id} cannot be small and another kind at the same time.`,
        path: ["kinds"],
      });
    }
    if (node.kinds.includes("unknown") && node.kinds.length > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Node ${node.id} cannot be unknown and another kind at the same time.`,
        path: ["kinds"],
      });
    }
  });

export type PassiveNode = z.infer<typeof passiveNodeSchema>;

export const passiveEdgeSchema = z
  .object({
    fromNodeId: passiveNodeIdSchema,
    toNodeId: passiveNodeIdSchema,
  })
  .strict()
  .refine((edge) => edge.fromNodeId !== edge.toNodeId, {
    message: "A passive edge cannot connect a node to itself.",
  });

export type PassiveEdge = z.infer<typeof passiveEdgeSchema>;

/**
 * One class from the official `classes` array and the skill node where that
 * class begins. `classIndex` is the position in that array.
 */
export const classStartSchema = z
  .object({
    classIndex: z.number().int().nonnegative(),
    className: z.string().min(1),
    nodeId: passiveNodeIdSchema,
  })
  .strict();

export type ClassStart = z.infer<typeof classStartSchema>;

export const passiveTreeSnapshotSchema = z
  .object({
    version: gameDataVersionSchema,
    nodes: z.array(passiveNodeSchema),
    edges: z.array(passiveEdgeSchema),
    classStarts: z.array(classStartSchema),
  })
  .strict()
  .superRefine((tree, context) => {
    validatePassiveTreeReferences(tree, context);
    validateClassStarts(tree, context);
  });

export type PassiveTreeSnapshot = z.infer<typeof passiveTreeSnapshotSchema>;

export function parsePassiveTreeSnapshot(value: unknown): PassiveTreeSnapshot {
  return passiveTreeSnapshotSchema.parse(value);
}

function undirectedEdgeKey(left: number, right: number): string {
  return left < right ? `${left}-${right}` : `${right}-${left}`;
}

function validatePassiveTreeReferences(
  tree: {
    nodes: Array<{ id: number; neighborIds: number[] }>;
    edges: Array<{ fromNodeId: number; toNodeId: number }>;
  },
  context: z.RefinementCtx,
): void {
  const nodesById = new Map<number, Set<number>>();

  for (const node of tree.nodes) {
    if (nodesById.has(node.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate passive node id ${node.id}.`,
        path: ["nodes"],
      });
    }
    nodesById.set(node.id, new Set(node.neighborIds));
  }

  const edgeKeys = new Set<string>();
  for (const edge of tree.edges) {
    if (!nodesById.has(edge.fromNodeId) || !nodesById.has(edge.toNodeId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Edge ${edge.fromNodeId}-${edge.toNodeId} references an unknown node.`,
        path: ["edges"],
      });
      continue;
    }

    const key = undirectedEdgeKey(edge.fromNodeId, edge.toNodeId);
    if (edgeKeys.has(key)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate undirected edge ${key}.`,
        path: ["edges"],
      });
    }
    edgeKeys.add(key);
  }

  for (const node of tree.nodes) {
    const seenNeighbors = new Set<number>();
    for (const neighborId of node.neighborIds) {
      if (neighborId === node.id) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Node ${node.id} cannot list itself as a neighbor.`,
          path: ["nodes"],
        });
      }
      if (seenNeighbors.has(neighborId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Node ${node.id} lists neighbor ${neighborId} more than once.`,
          path: ["nodes"],
        });
      }
      seenNeighbors.add(neighborId);

      const neighbor = nodesById.get(neighborId);
      if (!neighbor) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Node ${node.id} lists unknown neighbor ${neighborId}.`,
          path: ["nodes"],
        });
        continue;
      }

      if (!neighbor.has(node.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Neighbor link ${node.id} to ${neighborId} is not returned.`,
          path: ["nodes"],
        });
      }

      if (!edgeKeys.has(undirectedEdgeKey(node.id, neighborId))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Neighbor link ${node.id} to ${neighborId} has no matching edge.`,
          path: ["edges"],
        });
      }
    }
  }

  for (const edge of tree.edges) {
    const fromNode = nodesById.get(edge.fromNodeId);
    if (fromNode && !fromNode.has(edge.toNodeId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Edge ${edge.fromNodeId}-${edge.toNodeId} is missing from neighborIds.`,
        path: ["edges"],
      });
    }
  }
}

function validateClassStarts(
  tree: {
    nodes: Array<{ id: number }>;
    classStarts: Array<{
      classIndex: number;
      className: string;
      nodeId: number;
    }>;
  },
  context: z.RefinementCtx,
): void {
  const nodeIds = new Set(tree.nodes.map((node) => node.id));
  const seenIndexes = new Set<number>();

  for (const classStart of tree.classStarts) {
    if (seenIndexes.has(classStart.classIndex)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate class start index ${classStart.classIndex}.`,
        path: ["classStarts"],
      });
    }
    seenIndexes.add(classStart.classIndex);

    if (!nodeIds.has(classStart.nodeId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Class ${classStart.className} starts at unknown node ${classStart.nodeId}.`,
        path: ["classStarts"],
      });
    }
  }
}
