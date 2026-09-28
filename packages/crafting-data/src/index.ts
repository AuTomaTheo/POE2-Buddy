export {
  CRAFTING_DATA_SCHEMA_VERSION,
  KNOWN_DOMAINS,
  KNOWN_GENERATION_TYPES,
  PARTIAL_READINESS_REASONS,
} from "./version.js";
export {
  CRAFTING_ERROR_CODES,
  craftingFailure,
  type CraftingError,
  type CraftingErrorCode,
  type CraftingResult,
} from "./errors.js";
export {
  parseCraftingSnapshot,
  type BaseItem,
  type CraftingSnapshot,
  type ModifierRecord,
  type StatRange,
  type TranslationRecord,
  type WeightRule,
} from "./schema.js";
export {
  normalizeCraftingSource,
  spotCheckSourceRecords,
  type RawCraftingSource,
} from "./normalize.js";
export {
  evaluateSourcePool,
  indexCraftingSnapshot,
  lookupTranslation,
  querySourcePool,
  requirePlannerCompatibility,
  resolveBase,
  resolveGearBase,
  shareModifierGroup,
  translateModifier,
  type BaseResolution,
  type EligibilityResult,
  type IndexedCraftingData,
  type ModifierTranslation,
  type SourcePoolResult,
} from "./query.js";
export { diffCraftingSnapshots, type SnapshotDiff } from "./diff.js";
export {
  CRAFTING_COMPATIBILITY_POLICY_VERSION,
  CRAFTING_SETUP_MESSAGE,
  PLANNER_REQUIRED_CAPABILITIES,
  PLANNER_SUPPORTED_ITEM_CLASSES,
  PLANNER_UNSUPPORTED_ITEM_CLASSES,
  assessPlannerReadiness,
  buildCraftingCompatibilityReport,
  crossCheckCraftingSnapshot,
  evaluateCapabilityChecks,
  presentModifier,
  summarizePresentation,
  type CapabilityStatus,
  type CompatibilityCheck,
  type CraftPlannerReadiness,
  type CraftingCompatibilityReport,
  type ModifierPresentation,
} from "./planner.js";
