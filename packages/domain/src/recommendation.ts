import { z } from "zod";
import { passiveNodeIdSchema } from "./passive-tree";
import { gameDataVersionSchema } from "./version";

export const optimizationObjectiveSchema = z.enum([
  "offensive",
  "defensive",
  "balanced",
]);

export type OptimizationObjective = z.infer<typeof optimizationObjectiveSchema>;

/**
 * One term in a heuristic score. `supported: false` means the stat was seen
 * but not scored. A missing amount stays null instead of becoming zero.
 */
export const statContributionSchema = z
  .object({
    statId: z.string().min(1),
    label: z.string().min(1),
    amount: z.number().finite().nullable(),
    weight: z.number().finite(),
    contribution: z.number().finite(),
    supported: z.boolean(),
  })
  .strict();

export type StatContribution = z.infer<typeof statContributionSchema>;

export const candidatePathSchema = z
  .object({
    nodeIds: z.array(passiveNodeIdSchema),
    pointCost: z.number().int().nonnegative(),
    heuristicScore: z.number().finite(),
    heuristicScorePerPoint: z.number().finite(),
    contributions: z.array(statContributionSchema),
    warnings: z.array(z.string()),
  })
  .strict();

export type CandidatePath = z.infer<typeof candidatePathSchema>;

export const recommendationSchema = z
  .object({
    objective: optimizationObjectiveSchema,
    pointBudget: z.number().int().nonnegative(),
    paths: z.array(candidatePathSchema),
    gameDataVersion: gameDataVersionSchema,
    optimizerVersion: z.string().min(1),
    scoreKind: z.literal("heuristic"),
  })
  .strict()
  .superRefine((recommendation, context) => {
    recommendation.paths.forEach((path, index) => {
      if (path.pointCost > recommendation.pointBudget) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Path ${index} costs ${path.pointCost} points, above the budget of ${recommendation.pointBudget}.`,
          path: ["paths", index, "pointCost"],
        });
      }
    });
  });

export type Recommendation = z.infer<typeof recommendationSchema>;

export function parseRecommendation(value: unknown): Recommendation {
  return recommendationSchema.parse(value);
}
