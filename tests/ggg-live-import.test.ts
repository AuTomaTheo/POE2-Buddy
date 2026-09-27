import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GGG_AUTHORIZE_URL,
  GGG_OAUTH_SESSION_COOKIE,
  GGG_TOKEN_URL,
  createGggAccessSessionStore,
  createGggOAuthPendingSession,
  createGggOAuthSessionStore,
  readGggLiveImportReadiness,
} from "@poe2-helper/data-sources";
import { describe, expect, it } from "vitest";
import {
  handleGggAuthCallback,
  handleGggAuthStart,
  handleGggCharacterImport,
  handleGggDisconnect,
} from "../apps/web/src/server/ggg-auth-route";

const clientSecret = "test-secret-value";
const accessToken = "test-access-token";
const refreshToken = "test-refresh-token";
const authorizationCode = "test-authorization-code";

function ready() {
  const readiness = readGggLiveImportReadiness({
    GGG_CLIENT_ID: "test-client-id",
    GGG_CLIENT_SECRET: clientSecret,
    GGG_REDIRECT_URI: "http://localhost:3000/api/auth/ggg/callback",
    GGG_CONTACT: "local-test",
    GGG_LIVE_IMPORT: "enabled",
  });
  if (readiness.status !== "ready") {
    throw new Error("expected a ready test configuration");
  }
  return readiness;
}

function tokenFetch(calls: { url: string; body: string }[]) {
  return async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    calls.push({
      url: String(input),
      body: init?.body instanceof URLSearchParams ? init.body.toString() : "",
    });
    return new Response(
      JSON.stringify({
        access_token: accessToken,
        token_type: "bearer",
        expires_in: 120,
        scope: "account:characters",
        refresh_token: refreshToken,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
}

describe("live GGG import gate", () => {
  it("redirects only when live import is explicitly enabled", async () => {
    const store = createGggOAuthSessionStore();
    const response = await handleGggAuthStart(ready(), store, { secure: true });
    expect(response.status).toBe(302);
    const location = response.headers.get("location") ?? "";
    expect(location.startsWith(GGG_AUTHORIZE_URL)).toBe(true);
    expect(location).toContain("code_challenge_method=S256");
    expect(location).toContain("scope=account%3Acharacters");
    expect(location).not.toContain(clientSecret);
    expect(location).not.toContain("code_verifier");
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/api/auth/ggg");
    expect(cookie).toContain("Secure");
    expect(cookie).not.toContain(clientSecret);
  });

  it("does not exchange a code after a bad or expired state", async () => {
    let seed = 2;
    const now = new Date("2026-09-27T00:00:00.000Z");
    let clock = now;
    const store = createGggOAuthSessionStore({ now: () => clock });
    const pending = createGggOAuthPendingSession({
      now,
      randomBytes: (size) => Buffer.alloc(size, seed++),
    });
    store.save(pending);
    const cookie = `${GGG_OAUTH_SESSION_COOKIE}=${pending.id}`;
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      throw new Error("token exchange was attempted");
    };
    const tokens = createGggAccessSessionStore();

    const mismatch = await handleGggAuthCallback(
      new URL(
        `http://localhost/api/auth/ggg/callback?code=${authorizationCode}&state=wrong`,
      ),
      cookie,
      store,
      { readiness: ready(), tokens, fetchImpl },
    );
    expect(mismatch.status).toBe(400);
    expect(calls).toBe(0);
    expect(store.read(pending.id)).toBeDefined();

    clock = new Date(now.getTime() + 10 * 60 * 1000);
    const expired = await handleGggAuthCallback(
      new URL(
        `http://localhost/api/auth/ggg/callback?code=${authorizationCode}&state=${pending.state}`,
      ),
      cookie,
      store,
      { readiness: ready(), tokens, fetchImpl },
    );
    expect(expired.status).toBe(400);
    expect(calls).toBe(0);
  });

  it("stores the access token only on the server and clears it locally", async () => {
    let seed = 5;
    const store = createGggOAuthSessionStore();
    const pending = createGggOAuthPendingSession({
      randomBytes: (size) => Buffer.alloc(size, seed++),
    });
    store.save(pending);
    const calls: { url: string; body: string }[] = [];
    const tokens = createGggAccessSessionStore({
      now: () => new Date("2026-09-27T00:00:00.000Z"),
    });
    const response = await handleGggAuthCallback(
      new URL(
        `http://localhost/api/auth/ggg/callback?code=${authorizationCode}&state=${pending.state}`,
      ),
      `${GGG_OAUTH_SESSION_COOKIE}=${pending.id}`,
      store,
      {
        readiness: ready(),
        tokens,
        fetchImpl: tokenFetch(calls),
        secure: true,
        now: new Date("2026-09-27T00:00:00.000Z"),
      },
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(GGG_TOKEN_URL);
    expect(calls[0]?.body).toContain(clientSecret);
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).not.toContain(accessToken);
    expect(body).not.toContain(refreshToken);
    expect(body).not.toContain(authorizationCode);
    expect(body).not.toContain(clientSecret);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("Secure");
    expect(cookie).not.toContain(accessToken);
    expect(store.read(pending.id)).toBeUndefined();
    const sessionId = cookie.split(";")[0]?.split("=")[1] ?? "";
    expect(tokens.read(sessionId)?.accessToken).toBe(accessToken);
    expect(JSON.stringify(tokens.read(sessionId))).not.toContain(refreshToken);

    const cleared = await handleGggDisconnect(cookie, store, tokens, true);
    expect(tokens.read(sessionId)).toBeUndefined();
    const clearedBody = await cleared.json();
    expect(clearedBody).toMatchObject({ revokedAtProvider: false });
    expect(cleared.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("imports one character without returning the access token", async () => {
    const tokens = createGggAccessSessionStore({
      now: () => new Date("2026-09-27T00:00:00.000Z"),
    });
    tokens.save({
      id: "server-session",
      accessToken,
      expiresAt: "2026-09-27T01:00:00.000Z",
      scope: "account:characters",
    });
    const response = await handleGggCharacterImport({
      name: "Imported Witch",
      readiness: ready(),
      cookieHeader: `${GGG_OAUTH_SESSION_COOKIE}=server-session`,
      tokens,
      tree: {
        nodeIds: new Set([101]),
        source: "passive-tree-export",
        version: "0.5.5",
      },
      now: new Date("2026-09-27T00:00:00.000Z"),
      fetchImpl: async (_input, init) => {
        expect(new Headers(init?.headers).get("authorization")).toBe(
          `Bearer ${accessToken}`,
        );
        return new Response(
          JSON.stringify({
            character: {
              id: "b".repeat(64),
              name: "Imported Witch",
              class: "Witch",
              level: 10,
              passives: { hashes: [101, 404] },
            },
          }),
          { status: 200 },
        );
      },
    });
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).not.toContain(accessToken);
    expect(body).toContain("incompatible");
    expect(body).toContain("404");
  });

  it("keeps fixture analysis source off the live character client", () => {
    const repositoryRoot = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
    );
    const analysis = readFileSync(
      path.join(repositoryRoot, "apps/web/src/server/analyze-passive-build.ts"),
      "utf8",
    );
    expect(analysis).not.toContain("createLiveGggCharacterProvider");
    expect(analysis).not.toContain("GGG_TOKEN_URL");
  });
});
