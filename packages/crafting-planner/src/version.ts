export const CRAFTING_PLANNER_VERSION = 1 as const;

export const PLANNER_SETUP_MESSAGE = `Crafting data is not prepared.
Run:
npm run refresh:crafting-data
npm run crafting:readiness`;

export const COEXISTENCE_WARNING =
  "Targets are evaluated independently. Modifier coexistence and full craft feasibility are not validated yet.";

export const INDIVIDUAL_ONLY_WARNING =
  "Individual target eligibility only. Modifier coexistence has not been validated.";

export const SPAWN_WEIGHT_WARNING =
  "Spawn weight is source-pool metadata, not a crafting probability.";

export const NO_ELIGIBLE_MESSAGE =
  "No source-pool eligible modifier was found for this base and item level.";

export const CANDIDATE_ORDERING =
  "eligible, then unresolved, then ineligible; prefix, then suffix, then other; required item level ascending; modifier id. This order is not a quality ranking." as const;
