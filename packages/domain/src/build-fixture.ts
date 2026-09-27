import { z } from "zod";
import { characterBuildSnapshotSchema } from "./character";
import { optimizationObjectiveSchema } from "./recommendation";

/**
 * What the user wants the later optimizer to aim for.
 * This is not part of the character snapshot. A live import can fill the
 * character without inventing a goal.
 */
export const buildGoalsSchema = z
  .object({
    objective: optimizationObjectiveSchema,
    pointBudget: z.number().int().nonnegative(),
  })
  .strict();

export type BuildGoals = z.infer<typeof buildGoalsSchema>;

export const buildFixtureSchema = z
  .object({
    character: characterBuildSnapshotSchema,
    goals: buildGoalsSchema,
  })
  .strict();

export type BuildFixture = z.infer<typeof buildFixtureSchema>;

export function parseBuildFixture(value: unknown): BuildFixture {
  return buildFixtureSchema.parse(value);
}
