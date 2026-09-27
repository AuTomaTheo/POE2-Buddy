import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GGG_OAUTH_SESSION_COOKIE,
  createGggAccessSessionStore,
  createGggOAuthPendingSession,
  createGggOAuthSessionStore,
  readGggLiveImportReadiness,
} from "@poe2-helper/data-sources";
import { describe, expect, it } from "vitest";
import {
  handleGggAuthCallback,
  handleGggAuthStart,
  handleGggCharactersGet,
} from "../apps/web/src/server/ggg-auth-route";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const clientSecret = "test-secret-value";
const authorizationCode = "test-authorization-code";

function configuredButDisabled() {
  return readGggLiveImportReadiness({
    GGG_CLIENT_ID: "test-client-id",
    GGG_CLIENT_SECRET: clientSecret,
    GGG_REDIRECT_URI: "http://localhost:3000/api/auth/ggg/callback",
    GGG_CONTACT: "local-test",
  });
}

function callbackOptions() {
  return {
    readiness: configuredButDisabled(),
    tokens: createGggAccessSessionStore(),
  };
}

describe("GGG auth routes", () => {
  it("does not start authorization when credentials are absent", async () => {
    const store = createGggOAuthSessionStore();
    const response = await handleGggAuthStart(
      readGggLiveImportReadiness({}),
      store,
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
    const body: unknown = await response.json();
    expect(body).toMatchObject({
      missing: ["GGG_CLIENT_ID", "GGG_CLIENT_SECRET", "GGG_REDIRECT_URI"],
    });
    expect(JSON.stringify(body)).not.toContain("pathofexile.com");
  });

  it("keeps a configured start from redirecting or exposing the secret", async () => {
    const store = createGggOAuthSessionStore();
    const response = await handleGggAuthStart(configuredButDisabled(), store, {
      secure: false,
    });
    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
    const body = await response.text();
    expect(body).toContain("Live GGG authorization is disabled");
    expect(body).not.toContain(clientSecret);
    expect(body).not.toContain("pathofexile.com");
    expect(body).not.toContain("code_verifier");
  });

  it("rejects a callback whose state does not match and does not exchange a code", async () => {
    let seed = 1;
    const store = createGggOAuthSessionStore();
    const pending = createGggOAuthPendingSession({
      randomBytes: (size) => Buffer.alloc(size, seed++),
    });
    store.save(pending);
    const cookie = `${GGG_OAUTH_SESSION_COOKIE}=${pending.id}`;

    const mismatch = await handleGggAuthCallback(
      new URL(
        `http://localhost/api/auth/ggg/callback?code=${authorizationCode}&state=wrong-state`,
      ),
      cookie,
      store,
      callbackOptions(),
    );
    expect(mismatch.status).toBe(400);
    expect(await mismatch.text()).not.toContain(authorizationCode);
    expect(store.read(pending.id)?.state).toBe(pending.state);

    const matched = await handleGggAuthCallback(
      new URL(
        `http://localhost/api/auth/ggg/callback?code=${authorizationCode}&state=${pending.state}`,
      ),
      cookie,
      store,
      callbackOptions(),
    );
    expect(matched.status).toBe(503);
    const matchedBody = await matched.text();
    expect(matchedBody).toContain("authorization code was not exchanged");
    expect(matchedBody).not.toContain(authorizationCode);
    expect(matchedBody).not.toContain(clientSecret);
    expect(store.read(pending.id)).toBeUndefined();
  });

  it("returns the disabled character provider message", async () => {
    const response = await handleGggCharactersGet({
      readiness: readGggLiveImportReadiness({}),
      cookieHeader: null,
      tokens: createGggAccessSessionStore(),
    });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error:
        "Live GGG character import is disabled. This build does not call the Grinding Gear Games character API.",
    });
  });

  it("keeps passive analysis off the OAuth routes", () => {
    const analysis = readFileSync(
      path.join(repositoryRoot, "apps/web/src/server/analyze-passive-build.ts"),
      "utf8",
    );
    const screen = readFileSync(
      path.join(repositoryRoot, "apps/web/src/app/analysis-screen.tsx"),
      "utf8",
    );
    const actions = readFileSync(
      path.join(repositoryRoot, "apps/web/src/app/actions.ts"),
      "utf8",
    );
    for (const source of [analysis, screen, actions]) {
      expect(source).not.toContain("ggg-auth-route");
      expect(source).not.toContain("GGG_CLIENT_SECRET");
      expect(source).not.toContain("pathofexile.com/oauth");
    }
  });
});
