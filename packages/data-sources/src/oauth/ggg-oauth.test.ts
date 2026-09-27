import { createHash } from "node:crypto";
import { parseCharacterBuildSnapshot } from "@poe2-helper/domain";
import { describe, expect, it } from "vitest";
import {
  createDisabledGggCharacterProvider,
  createMockGggCharacterProvider,
} from "./ggg-character-provider";
import {
  GGG_AUTHORIZE_URL,
  GGG_CHARACTER_SCOPE,
  GGG_OAUTH_SESSION_TTL_MS,
  GggOAuthError,
  buildGggAuthorizeUrl,
  codeChallengeForVerifier,
  createGggOAuthPendingSession,
  createGggOAuthSessionStore,
  readGggOAuthConfig,
} from "./ggg-oauth";

const redirectUri = "http://localhost:3000/api/auth/ggg/callback";
const clientSecret = "test-secret-value";

function configuredEnv() {
  return {
    GGG_CLIENT_ID: "test-client-id",
    GGG_CLIENT_SECRET: clientSecret,
    GGG_REDIRECT_URI: redirectUri,
  };
}

describe("GGG OAuth shell", () => {
  it("reports missing configuration and does not invent credentials", () => {
    expect(readGggOAuthConfig({})).toEqual({
      status: "missing",
      missing: ["GGG_CLIENT_ID", "GGG_CLIENT_SECRET", "GGG_REDIRECT_URI"],
    });
    expect(
      readGggOAuthConfig({
        GGG_CLIENT_ID: "test-client-id",
        GGG_CLIENT_SECRET: "   ",
        GGG_REDIRECT_URI: redirectUri,
      }),
    ).toEqual({ status: "missing", missing: ["GGG_CLIENT_SECRET"] });
  });

  it("rejects an unusable redirect URI without echoing it", () => {
    const config = readGggOAuthConfig({
      ...configuredEnv(),
      GGG_REDIRECT_URI: "javascript:alert(1)",
    });
    expect(config).toEqual({
      status: "invalid",
      variable: "GGG_REDIRECT_URI",
      message: "GGG_REDIRECT_URI must be an absolute http(s) URL.",
    });
  });

  it("builds a PKCE authorization URL for the character scope only", () => {
    const config = readGggOAuthConfig(configuredEnv());
    expect(config.status).toBe("configured");
    if (config.status !== "configured") return;

    let seed = 3;
    const session = createGggOAuthPendingSession({
      randomBytes: (size) => Buffer.alloc(size, seed++),
    });
    expect(session.scope).toBe(GGG_CHARACTER_SCOPE);
    expect(session.state).not.toBe(session.codeVerifier);
    expect(session.codeChallenge).toBe(
      codeChallengeForVerifier(session.codeVerifier),
    );
    expect(session.codeChallenge).toBe(
      createHash("sha256")
        .update(session.codeVerifier)
        .digest()
        .toString("base64url"),
    );

    const url = buildGggAuthorizeUrl(config, session);
    expect(`${url.origin}${url.pathname}`).toBe(GGG_AUTHORIZE_URL);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe(GGG_CHARACTER_SCOPE);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.toString()).not.toContain(clientSecret);
    expect(url.toString()).not.toContain(session.codeVerifier);
    expect(url.toString()).not.toContain("oauth/token");
    expect([...url.searchParams.keys()].sort()).toEqual([
      "client_id",
      "code_challenge",
      "code_challenge_method",
      "redirect_uri",
      "response_type",
      "scope",
      "state",
    ]);
  });

  it("drops an expired pending session", () => {
    let now = new Date("2026-09-26T00:00:00.000Z");
    const store = createGggOAuthSessionStore({ now: () => now });
    const session = createGggOAuthPendingSession({
      now,
      randomBytes: (size) => Buffer.alloc(size, 4),
    });
    store.save(session);
    expect(store.read(session.id)?.state).toBe(session.state);
    now = new Date(now.getTime() + GGG_OAUTH_SESSION_TTL_MS);
    expect(store.read(session.id)).toBeUndefined();
  });

  it("serves named fixtures from the mock provider", async () => {
    const witch = parseCharacterBuildSnapshot({
      name: "Sample Witch",
      level: 24,
      className: "Witch",
      allocatedPassiveIds: [101],
      weaponSetSpecialisations: { set1: [], set2: [], set3: [] },
      questStats: [],
      skills: [],
      equipment: [],
      sourceVersion: {
        source: "fixture",
        version: "sample-1",
        fetchedAt: "2026-09-26T00:00:00.000Z",
      },
    });
    const provider = createMockGggCharacterProvider([witch]);
    await expect(provider.listCharacters()).resolves.toEqual([
      { name: "Sample Witch", level: 24, className: "Witch" },
    ]);
    await expect(provider.getCharacter("Sample Witch")).resolves.toMatchObject({
      character: witch,
      sourceMetadata: { source: "fixture" },
      compatibility: { status: "compatible", unknownPassiveIds: [] },
    });
    await expect(provider.getCharacter("Missing")).rejects.toBeInstanceOf(
      GggOAuthError,
    );
  });

  it("keeps the live character provider disabled", async () => {
    const provider = createDisabledGggCharacterProvider();
    await expect(provider.listCharacters()).rejects.toMatchObject({
      failureKind: "disabled",
      message:
        "Live GGG character import is disabled. This build does not call the Grinding Gear Games character API.",
    });
    await expect(provider.getCharacter("Sample Witch")).rejects.toMatchObject({
      failureKind: "disabled",
    });
  });
});
