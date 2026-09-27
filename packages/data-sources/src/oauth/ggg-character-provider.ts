import type {
  CharacterBuildSnapshot,
  CharacterSummary,
} from "@poe2-helper/domain";
import type { GggCharacterImport } from "./ggg-character-document";
import { GggOAuthError } from "./ggg-oauth";

export const LIVE_GGG_CHARACTER_IMPORT_MESSAGE =
  "Live GGG character import is disabled. This build does not call the Grinding Gear Games character API.";

/**
 * Account character access. The live implementation stays disabled until an
 * approved OAuth client exists and a later step performs the token exchange.
 */
export interface GggCharacterProvider {
  listCharacters(): Promise<CharacterSummary[]>;
  getCharacter(name: string): Promise<GggCharacterImport>;
}

export function createMockGggCharacterProvider(
  characters: readonly CharacterBuildSnapshot[],
): GggCharacterProvider {
  const byName = new Map<string, CharacterBuildSnapshot>();
  for (const character of characters) {
    const name = character.name;
    if (!name) {
      throw new GggOAuthError("A mock character needs a name.", "request");
    }
    if (byName.has(name)) {
      throw new GggOAuthError(
        "Mock character names must be unique.",
        "request",
      );
    }
    byName.set(name, character);
  }

  return {
    async listCharacters() {
      return [...byName.entries()].map(([name, character]) => ({
        name,
        level: character.level,
        className: character.className,
      }));
    },
    async getCharacter(name: string) {
      const found = byName.get(name);
      if (!found) {
        throw new GggOAuthError("No mock character has that name.", "request");
      }
      return mockImport(found);
    },
  };
}

function mockImport(character: CharacterBuildSnapshot): GggCharacterImport {
  const name = character.name ?? "fixture";
  return {
    summary: {
      name,
      level: character.level,
      className: character.className,
    },
    character,
    sourceMetadata: {
      source: "fixture",
      importedAt: character.sourceVersion.fetchedAt,
      providerCharacterId: `fixture:${name}`,
      league: null,
      passiveTreeSource: character.sourceVersion.source,
      passiveTreeVersion: character.sourceVersion.version ?? null,
      passiveTreeCommit: character.sourceVersion.commit ?? null,
    },
    compatibility: {
      status: "compatible",
      unknownPassiveIds: [],
      unavailable: [],
    },
  };
}

export function createDisabledGggCharacterProvider(): GggCharacterProvider {
  return {
    async listCharacters() {
      throw new GggOAuthError(LIVE_GGG_CHARACTER_IMPORT_MESSAGE, "disabled");
    },
    async getCharacter() {
      throw new GggOAuthError(LIVE_GGG_CHARACTER_IMPORT_MESSAGE, "disabled");
    },
  };
}
