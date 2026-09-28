export const CRAFTING_DATA_SCHEMA_VERSION = 1 as const;

/**
 * Closed set of domain strings observed in repoe-fork/poe2
 * commit b818b843337cae43b090b272fd98bbc0fd3a34f3.
 * The string "undefined" is a source value, distinct from a missing field.
 * A value outside this set fails snapshot promotion.
 */
export const KNOWN_DOMAINS = [
  "affliction_jewel",
  "area",
  "atlas",
  "chest",
  "crafted",
  "delve_area",
  "desecrated",
  "dummy",
  "expedition_relic",
  "flask",
  "heist_area",
  "heist_npc",
  "heist_trinket",
  "incursion_limb",
  "item",
  "leaguestone",
  "map_device",
  "memory_line",
  "misc",
  "monster",
  "sanctified_relic",
  "sanctum_relic",
  "sentinel",
  "strongbox",
  "synthesis_a",
  "synthesis_bonus",
  "synthesis_globals",
  "tablet",
  "ultimatum_key",
  "undefined",
  "vault_key",
  "veiled",
  "watchstone",
] as const;

/**
 * Closed set of generation_type strings observed in the same commit.
 * A value outside this set fails snapshot promotion.
 */
export const KNOWN_GENERATION_TYPES = [
  "azmeri_empowered_monster",
  "bestiary",
  "blight",
  "bloodlines",
  "corrupted",
  "delve_area",
  "essence",
  "expedition_logbook",
  "instilled",
  "monster_affliction",
  "nemesis",
  "prefix",
  "scourge_gimmick",
  "suffix",
  "synthesis_a",
  "synthesis_bonus",
  "synthesis_globals",
  "talisman",
  "tempest",
  "torment",
  "unique",
] as const;

export const KNOWN_DOMAIN_SET = new Set<string>(KNOWN_DOMAINS);
export const KNOWN_GENERATION_TYPE_SET = new Set<string>(
  KNOWN_GENERATION_TYPES,
);

export const PARTIAL_READINESS_REASONS = [
  "Spawn-weight matching follows Path of Building Community (PoE2) 0.23.1 ItemClass:GetModSpawnWeight. That is community evidence, not an official Grinding Gear Games statement.",
  "Only the item domain is mapped for source-pool eligibility. Other known domains stay unresolved.",
  "English templates keep source markup. Conditional wording stays unresolved.",
  "A loaded snapshot is not planner approval. Planner approval is a separate checksum-bound record.",
  "The pinned export contains no generation-weight rules. The field is preserved and is not a probability.",
] as const;
