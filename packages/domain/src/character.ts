import { z } from "zod";
import { passiveNodeIdSchema } from "./passive-tree";
import { gameDataVersionSchema } from "./version";

/**
 * Weapon-set passive specialisations from the official character document.
 * Keys are `set1`, `set2`, and `set3`. These ids are not part of the shared allocation.
 */
export const weaponSetSpecialisationsSchema = z
  .object({
    set1: z.array(passiveNodeIdSchema),
    set2: z.array(passiveNodeIdSchema),
    set3: z.array(passiveNodeIdSchema),
  })
  .strict();

export type WeaponSetSpecialisations = z.infer<
  typeof weaponSetSpecialisationsSchema
>;

/**
 * Minimal skill record. PoE2 character skills arrive as items; mod parsing is later.
 */
export const normalizedSkillSchema = z
  .object({
    name: z.string().min(1),
    baseType: z.string().min(1).optional(),
    supportNames: z.array(z.string().min(1)).min(1).optional(),
  })
  .strict();

export type NormalizedSkill = z.infer<typeof normalizedSkillSchema>;

/**
 * Minimal equipped-item record. `slot` is the inventory id, such as `Weapon1`.
 * Raw modifier text is preserved. Gear classification reads it later and does not remove it.
 */
export const normalizedItemSchema = z
  .object({
    slot: z.string().min(1),
    name: z.string().min(1),
    baseType: z.string().min(1).optional(),
    rarity: z.string().min(1).optional(),
    rawText: z.string().optional(),
  })
  .strict();

export type NormalizedItem = z.infer<typeof normalizedItemSchema>;

/**
 * Name and class shown before a full character document is loaded.
 * This is not an OAuth token or an account profile.
 */
export const characterSummarySchema = z
  .object({
    id: z.string().min(1).optional(),
    name: z.string().min(1),
    level: z.number().int().positive(),
    className: z.string().min(1),
    league: z.string().min(1).optional(),
  })
  .strict();

export type CharacterSummary = z.infer<typeof characterSummarySchema>;

export const characterBuildSnapshotSchema = z
  .object({
    name: z.string().min(1).optional(),
    level: z.number().int().positive(),
    className: z.string().min(1),
    ascendancy: z.string().min(1).optional(),
    allocatedPassiveIds: z.array(passiveNodeIdSchema),
    weaponSetSpecialisations: weaponSetSpecialisationsSchema,
    questStats: z.array(z.string()),
    skills: z.array(normalizedSkillSchema),
    equipment: z.array(normalizedItemSchema),
    sourceVersion: gameDataVersionSchema,
  })
  .strict();

export type CharacterBuildSnapshot = z.infer<
  typeof characterBuildSnapshotSchema
>;

export function parseCharacterBuildSnapshot(
  value: unknown,
): CharacterBuildSnapshot {
  return characterBuildSnapshotSchema.parse(value);
}
