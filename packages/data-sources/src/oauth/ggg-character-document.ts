import {
  parseCharacterBuildSnapshot,
  characterSummarySchema,
  type CharacterBuildSnapshot,
  type CharacterSummary,
  type PassiveNodeId,
} from "@poe2-helper/domain";
import { z } from "zod";
import { GggOAuthError } from "./ggg-oauth";

const gggItemModSchema = z.object({
  description: z.string(),
});

type GggItem = {
  verified: boolean;
  w: number;
  h: number;
  icon: string;
  name: string;
  typeLine: string;
  baseType: string;
  identified: boolean;
  ilvl: number;
  support?: boolean;
  rarity?: string;
  inventoryId?: string;
  explicitMods?: { description: string }[];
  socketedItems?: GggItem[];
};

const gggItemSchema: z.ZodType<GggItem> = z.lazy(() =>
  z.object({
    verified: z.boolean(),
    w: z.number().int().nonnegative(),
    h: z.number().int().nonnegative(),
    icon: z.string(),
    name: z.string(),
    typeLine: z.string().min(1),
    baseType: z.string().min(1),
    identified: z.boolean(),
    ilvl: z.number().int().nonnegative(),
    support: z.boolean().optional(),
    rarity: z.string().min(1).optional(),
    inventoryId: z.string().min(1).optional(),
    explicitMods: z.array(gggItemModSchema).optional(),
    socketedItems: z.array(gggItemSchema).optional(),
  }),
);

const passiveHashesSchema = z.array(z.number().int().nonnegative());

const gggCharacterDocumentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  class: z.string().min(1),
  level: z.number().int().positive(),
  league: z.string().min(1).optional(),
  equipment: z.array(gggItemSchema).optional(),
  skills: z.array(gggItemSchema).optional(),
  jewels: z.array(gggItemSchema).optional(),
  passives: z
    .object({
      hashes: passiveHashesSchema,
      specialisations: z
        .object({
          set1: passiveHashesSchema.optional(),
          set2: passiveHashesSchema.optional(),
          set3: passiveHashesSchema.optional(),
        })
        .optional(),
      quest_stats: z.array(z.string()).optional(),
    })
    .optional(),
});

const gggCharacterListSchema = z.object({
  characters: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      class: z.string().min(1),
      level: z.number().int().positive(),
      league: z.string().min(1).optional(),
    }),
  ),
});

const gggCharacterResponseSchema = z.object({
  character: gggCharacterDocumentSchema.nullable(),
});

export type GggTreePin = {
  nodeIds: ReadonlySet<number>;
  source: string;
  version?: string;
  commit?: string;
};

export type GggCharacterImport = {
  summary: CharacterSummary;
  character: CharacterBuildSnapshot;
  sourceMetadata: {
    source: "ggg" | "fixture";
    importedAt: string;
    providerCharacterId: string;
    league: string | null;
    passiveTreeSource: string | null;
    passiveTreeVersion: string | null;
    passiveTreeCommit: string | null;
  };
  compatibility: {
    status: "compatible" | "incompatible";
    unknownPassiveIds: number[];
    unavailable: string[];
  };
};

export function parseGggCharacterList(value: unknown): CharacterSummary[] {
  const parsed = gggCharacterListSchema.safeParse(value);
  if (!parsed.success) {
    throw new GggOAuthError(
      "The GGG character list did not match the expected document.",
      "provider",
      502,
    );
  }
  return parsed.data.characters.map((character) =>
    characterSummarySchema.parse({
      id: character.id,
      name: character.name,
      level: character.level,
      className: character.class,
      ...(character.league ? { league: character.league } : {}),
    }),
  );
}

export function parseGggCharacterResponse(value: unknown): unknown {
  const parsed = gggCharacterResponseSchema.safeParse(value);
  if (!parsed.success) {
    throw new GggOAuthError(
      "The GGG character response did not match the expected document.",
      "provider",
      502,
    );
  }
  if (!parsed.data.character) {
    throw new GggOAuthError("That character was not found.", "request", 404);
  }
  return parsed.data.character;
}

/**
 * Maps one validated character document onto the domain snapshot.
 * The published Character object has no ascendancy field, so ascendancy stays unavailable.
 * Unknown passive ids are kept and marked incompatible.
 */
export function normalizeGggCharacterDocument(
  value: unknown,
  tree: GggTreePin,
  now: Date,
): GggCharacterImport {
  const parsed = gggCharacterDocumentSchema.safeParse(value);
  if (!parsed.success) {
    throw new GggOAuthError(
      "The GGG character response did not match the expected document.",
      "provider",
      502,
    );
  }
  const document = parsed.data;
  const unavailable: string[] = ["ascendancy"];
  const passives = document.passives;
  const allocatedPassiveIds = passives?.hashes ?? [];
  if (!passives) unavailable.push("passive allocation");

  const specialisations = passives?.specialisations;
  const weaponSetSpecialisations = {
    set1: specialisations?.set1 ?? [],
    set2: specialisations?.set2 ?? [],
    set3: specialisations?.set3 ?? [],
  };
  if (!specialisations) unavailable.push("weapon-set specialisations");

  const questStats = passives?.quest_stats ?? [];
  if (!passives || passives.quest_stats === undefined) {
    unavailable.push("quest stats");
  }

  let skills: CharacterBuildSnapshot["skills"] = [];
  if (!document.skills) {
    unavailable.push("skills");
  } else {
    let unmarkedSockets = false;
    skills = document.skills.map((item) => {
      const supportNames = supportNamesFrom(item);
      if (item.socketedItems?.some((socketed) => socketed.support !== true)) {
        unmarkedSockets = true;
      }
      return {
        name: itemLabel(item),
        baseType: item.baseType,
        ...(supportNames.length > 0 ? { supportNames } : {}),
      };
    });
    if (unmarkedSockets) unavailable.push("unmarked socketed skill items");
  }

  let equipment: CharacterBuildSnapshot["equipment"] = [];
  if (!document.equipment) unavailable.push("equipment");
  else equipment = document.equipment.map((item) => equipmentFrom(item));
  if (!document.jewels) unavailable.push("jewels");
  else {
    equipment = [
      ...equipment,
      ...document.jewels.map((item) =>
        equipmentFrom(item, item.inventoryId ?? "Jewel"),
      ),
    ];
  }

  const unknownPassiveIds = uniqueUnknown(
    [
      ...allocatedPassiveIds,
      ...weaponSetSpecialisations.set1,
      ...weaponSetSpecialisations.set2,
      ...weaponSetSpecialisations.set3,
    ],
    tree.nodeIds,
  );

  const summary = characterSummarySchema.parse({
    id: document.id,
    name: document.name,
    level: document.level,
    className: document.class,
    ...(document.league ? { league: document.league } : {}),
  });
  const character = parseCharacterBuildSnapshot({
    name: document.name,
    level: document.level,
    className: document.class,
    allocatedPassiveIds,
    weaponSetSpecialisations,
    questStats,
    skills,
    equipment,
    sourceVersion: {
      source: "ggg",
      ...(tree.version ? { version: tree.version } : {}),
      ...(tree.commit ? { commit: tree.commit } : {}),
      fetchedAt: now.toISOString(),
    },
  });

  return {
    summary,
    character,
    sourceMetadata: {
      source: "ggg",
      importedAt: now.toISOString(),
      providerCharacterId: document.id,
      league: document.league ?? null,
      passiveTreeSource: tree.source,
      passiveTreeVersion: tree.version ?? null,
      passiveTreeCommit: tree.commit ?? null,
    },
    compatibility: {
      status: unknownPassiveIds.length === 0 ? "compatible" : "incompatible",
      unknownPassiveIds,
      unavailable,
    },
  };
}

function itemLabel(item: GggItem): string {
  return item.name.trim().length > 0 ? item.name : item.typeLine;
}

function supportNamesFrom(item: GggItem): string[] {
  return (item.socketedItems ?? [])
    .filter((socketed) => socketed.support === true)
    .map((socketed) => itemLabel(socketed));
}

function equipmentFrom(
  item: GggItem,
  slot = item.inventoryId ?? "unspecified",
): CharacterBuildSnapshot["equipment"][number] {
  const rawText = (item.explicitMods ?? [])
    .map((mod) => mod.description)
    .filter((description) => description.length > 0)
    .join("\n");
  return {
    slot,
    name: itemLabel(item),
    baseType: item.baseType,
    ...(item.rarity ? { rarity: item.rarity } : {}),
    ...(rawText.length > 0 ? { rawText } : {}),
  };
}

function uniqueUnknown(
  ids: readonly PassiveNodeId[],
  known: ReadonlySet<number>,
): number[] {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const id of ids) {
    if (known.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}
