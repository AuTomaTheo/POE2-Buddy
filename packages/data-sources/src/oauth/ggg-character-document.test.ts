import { describe, expect, it } from "vitest";
import { GggOAuthError } from "./ggg-oauth";
import {
  normalizeGggCharacterDocument,
  parseGggCharacterList,
  type GggTreePin,
} from "./ggg-character-document";
import { createLiveGggCharacterProvider } from "./ggg-live-provider";
import {
  GGG_CHARACTER_SCOPE,
  GGG_OAUTH_CLIENT_TYPE,
  gggCookieIsSecure,
  gggLiveImportPublicStatus,
  readGggLiveImportReadiness,
} from "./ggg-oauth";

const now = new Date("2026-09-27T00:00:00.000Z");
const tree: GggTreePin = {
  nodeIds: new Set([101, 103]),
  source: "passive-tree-export",
  version: "0.5.5",
  commit: "abc123",
};

function item(overrides: Record<string, unknown> = {}) {
  return {
    verified: true,
    w: 1,
    h: 1,
    icon: "https://example.test/icon.png",
    name: "Sample",
    typeLine: "Sample",
    baseType: "Sample",
    identified: true,
    ilvl: 10,
    ...overrides,
  };
}

function document(overrides: Record<string, unknown> = {}) {
  return {
    id: "a".repeat(64),
    name: "Imported Witch",
    class: "Witch",
    level: 24,
    league: "Standard",
    passives: {
      hashes: [101],
      specialisations: { set1: [], set2: [103], set3: [] },
      quest_stats: ["Sample quest"],
    },
    equipment: [
      item({
        inventoryId: "Weapon1",
        name: "Sample Wand",
        typeLine: "Wand",
        baseType: "Wand",
        rarity: "Rare",
        explicitMods: [{ description: "Adds 1 to 2 Fire Damage" }],
      }),
    ],
    skills: [
      item({
        name: "Spark",
        typeLine: "Spark",
        baseType: "Spark",
        socketedItems: [
          item({
            support: true,
            name: "",
            typeLine: "Added Fire Damage",
            baseType: "Added Fire Damage",
          }),
        ],
      }),
    ],
    jewels: [
      item({
        name: "Crimson Jewel",
        typeLine: "Crimson Jewel",
        baseType: "Crimson Jewel",
      }),
    ],
    ...overrides,
  };
}

describe("GGG character normalization", () => {
  it("requires an explicit enable flag in addition to credentials", () => {
    const credentials = {
      GGG_CLIENT_ID: "test-client-id",
      GGG_CLIENT_SECRET: "test-secret-value",
      GGG_REDIRECT_URI: "http://localhost:3000/api/auth/ggg/callback",
      GGG_CONTACT: "local-test",
    };
    expect(readGggLiveImportReadiness(credentials).status).toBe("disabled");
    expect(readGggLiveImportReadiness(credentials)).toMatchObject({
      reason: "not-enabled",
    });
    const ready = readGggLiveImportReadiness({
      ...credentials,
      GGG_LIVE_IMPORT: "enabled",
    });
    expect(ready).toMatchObject({
      status: "ready",
      clientType: GGG_OAUTH_CLIENT_TYPE,
      scope: GGG_CHARACTER_SCOPE,
    });
    expect(JSON.stringify(gggLiveImportPublicStatus(ready))).not.toContain(
      "test-secret-value",
    );
    expect(gggCookieIsSecure("http:", "development")).toBe(false);
    expect(gggCookieIsSecure("http:", "production")).toBe(true);
    expect(gggCookieIsSecure("https:", "development")).toBe(true);
  });

  it("parses a character list and rejects a malformed list", () => {
    expect(
      parseGggCharacterList({
        characters: [
          {
            id: "a".repeat(64),
            name: "Imported Witch",
            class: "Witch",
            level: 24,
            league: "Standard",
          },
        ],
      }),
    ).toEqual([
      {
        id: "a".repeat(64),
        name: "Imported Witch",
        level: 24,
        className: "Witch",
        league: "Standard",
      },
    ]);
    expect(() =>
      parseGggCharacterList({ characters: [{ name: "A" }] }),
    ).toThrow(GggOAuthError);
  });

  it("normalizes one character without guessing missing fields", () => {
    const imported = normalizeGggCharacterDocument(document(), tree, now);
    expect(imported.character.allocatedPassiveIds).toEqual([101]);
    expect(imported.character.weaponSetSpecialisations.set2).toEqual([103]);
    expect(imported.character.ascendancy).toBeUndefined();
    expect(imported.character.skills).toEqual([
      {
        name: "Spark",
        baseType: "Spark",
        supportNames: ["Added Fire Damage"],
      },
    ]);
    expect(imported.character.equipment).toEqual([
      {
        slot: "Weapon1",
        name: "Sample Wand",
        baseType: "Wand",
        rarity: "Rare",
        rawText: "Adds 1 to 2 Fire Damage",
      },
      {
        slot: "Jewel",
        name: "Crimson Jewel",
        baseType: "Crimson Jewel",
      },
    ]);
    expect(imported.sourceMetadata).toMatchObject({
      source: "ggg",
      providerCharacterId: "a".repeat(64),
      league: "Standard",
      passiveTreeVersion: "0.5.5",
      passiveTreeCommit: "abc123",
    });
    expect(JSON.stringify(imported)).not.toContain("access_token");
    expect(imported.compatibility).toEqual({
      status: "compatible",
      unknownPassiveIds: [],
      unavailable: ["ascendancy"],
    });
    expect(normalizeGggCharacterDocument(document(), tree, now)).toEqual(
      imported,
    );
  });

  it("keeps unknown passive ids and records absent sections", () => {
    const imported = normalizeGggCharacterDocument(
      document({
        skills: undefined,
        equipment: undefined,
        jewels: undefined,
        passives: { hashes: [101, 999] },
      }),
      tree,
      now,
    );
    expect(imported.character.allocatedPassiveIds).toEqual([101, 999]);
    expect(imported.character.skills).toEqual([]);
    expect(imported.compatibility.status).toBe("incompatible");
    expect(imported.compatibility.unknownPassiveIds).toEqual([999]);
    expect(imported.compatibility.unavailable).toEqual([
      "ascendancy",
      "weapon-set specialisations",
      "quest stats",
      "skills",
      "equipment",
      "jewels",
    ]);
  });

  it("rejects a document that is missing a required field", () => {
    const source = document();
    const withoutName = {
      id: source.id,
      class: source.class,
      level: source.level,
      league: source.league,
      passives: source.passives,
      equipment: source.equipment,
      skills: source.skills,
      jewels: source.jewels,
    };
    expect(() => normalizeGggCharacterDocument(withoutName, tree, now)).toThrow(
      GggOAuthError,
    );
  });

  it("does not retry an authentication failure and isolates a provider error", async () => {
    const readiness = readGggLiveImportReadiness({
      GGG_CLIENT_ID: "test-client-id",
      GGG_CLIENT_SECRET: "test-secret-value",
      GGG_REDIRECT_URI: "http://localhost:3000/api/auth/ggg/callback",
      GGG_CONTACT: "local-test",
      GGG_LIVE_IMPORT: "enabled",
    });
    expect(readiness.status).toBe("ready");
    if (readiness.status !== "ready") return;

    let calls = 0;
    const provider = createLiveGggCharacterProvider({
      readiness,
      accessToken: "test-access-token",
      tree,
      sleep: async () => undefined,
      fetchImpl: async () => {
        calls += 1;
        return new Response("nope", { status: 401 });
      },
    });
    await expect(provider.listCharacters()).rejects.toMatchObject({
      failureKind: "provider",
      httpStatus: 401,
    });
    expect(calls).toBe(1);
  });
});
