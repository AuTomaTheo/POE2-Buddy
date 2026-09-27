export {
  GEAR_NORMALIZATION_VERSION,
  analyzeEquipment,
  analyzeItem,
  assessGearReadiness,
} from "./analyze-equipment.js";
export type {
  AnalyzedGearItem,
  GearAnalysis,
  GearAnalysisInput,
  GearConfidence,
  GearDiagnostic,
  GearDiagnosticCode,
  GearReadiness,
  GearReadinessStatus,
} from "./analyze-equipment.js";
export { GEAR_MODIFIER_FAMILIES } from "./families.js";
export { GEAR_LOCALITY_RULES } from "./locality.js";
export type { GearLocalityMode } from "./locality.js";
export type {
  GearLocality,
  GearOperation,
  GearSemanticId,
  GearUnit,
} from "./families.js";
export { normalizeGearItem, normalizeGearItems } from "./normalize-item.js";
export type {
  CategorizedGearModifier,
  GearItemInput,
  GearModifier,
  GearStatCategory,
  NormalizedGearItem,
  UnknownGearModifier,
} from "./normalize-item.js";
export { parseGearModifier } from "./parse-modifier.js";
export type {
  GearModifierSection,
  ParsedGearModifier,
} from "./parse-modifier.js";
export {
  CANONICAL_GEAR_SLOTS,
  TRACKED_GEAR_SLOTS,
  canonicalGearSlot,
  gearSlotLabel,
} from "./slots.js";
export type { CanonicalGearSlot } from "./slots.js";
