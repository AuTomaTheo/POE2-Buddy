import {
  GggOAuthError,
  LIVE_GGG_CHARACTER_IMPORT_MESSAGE,
  buildGggAuthorizeUrl,
  createDisabledGggCharacterProvider,
  createGggAccessSessionStore,
  createGggOAuthPendingSession,
  createGggOAuthSessionStore,
  createLiveGggCharacterProvider,
  exchangeGggAuthorizationCode,
  gggOAuthSessionCookie,
  gggOAuthSessionIdFromCookie,
  oauthStateMatches,
  type GggAccessSessionStore,
  type GggLiveImportReadiness,
  type GggOAuthSessionStore,
  type GggTreePin,
} from "@poe2-helper/data-sources";

export const LIVE_GGG_AUTHORIZATION_MESSAGE =
  "Live GGG authorization is disabled. This build does not redirect to Grinding Gear Games or exchange authorization codes.";

const sessions = createGggOAuthSessionStore();
const accessSessions = createGggAccessSessionStore();

export function serverGggOAuthSessionStore(): GggOAuthSessionStore {
  return sessions;
}

export function serverGggAccessSessionStore(): GggAccessSessionStore {
  return accessSessions;
}

export async function handleGggAuthStart(
  readiness: GggLiveImportReadiness,
  store: GggOAuthSessionStore,
  options?: { now?: Date; secure?: boolean },
): Promise<Response> {
  if (readiness.status === "disabled") {
    return json(
      {
        error: readiness.message,
        ...(readiness.missing ? { missing: readiness.missing } : {}),
      },
      503,
    );
  }

  const session = createGggOAuthPendingSession({ now: options?.now });
  store.save(session);
  const authorizeUrl = buildGggAuthorizeUrl(
    {
      status: "configured",
      clientId: readiness.clientId,
      clientSecret: readiness.clientSecret,
      redirectUri: readiness.redirectUri,
    },
    session,
  );
  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.toString(),
      "Set-Cookie": gggOAuthSessionCookie(session.id, options?.secure ?? false),
    },
  });
}

export async function handleGggAuthCallback(
  url: URL,
  cookieHeader: string | null,
  store: GggOAuthSessionStore,
  options: {
    readiness: GggLiveImportReadiness;
    tokens: GggAccessSessionStore;
    fetchImpl?: typeof fetch;
    now?: Date;
    secure?: boolean;
  },
): Promise<Response> {
  const sessionId = gggOAuthSessionIdFromCookie(cookieHeader);
  if (!sessionId) {
    return json(
      { error: "No OAuth session is available for this callback." },
      400,
    );
  }

  const session = store.read(sessionId);
  if (!session) {
    return json(
      { error: "No OAuth session is available for this callback." },
      400,
    );
  }

  const state = url.searchParams.get("state") ?? "";
  if (!oauthStateMatches(session.state, state)) {
    return json({ error: "The OAuth state does not match this session." }, 400);
  }

  store.take(sessionId);
  const providerError = url.searchParams.get("error");
  if (providerError === "access_denied") {
    return json({ error: "Authorization was declined." }, 400);
  }
  if (providerError) {
    return json({ error: "Authorization was not completed." }, 400);
  }
  const code = url.searchParams.get("code");
  if (!code) {
    return json(
      { error: "The authorization callback did not include a code." },
      400,
    );
  }
  if (options.readiness.status !== "ready") {
    return json(
      {
        error:
          "Live GGG authorization is disabled. The authorization code was not exchanged.",
      },
      503,
    );
  }

  try {
    const access = await exchangeGggAuthorizationCode({
      readiness: options.readiness,
      session,
      code,
      fetchImpl: options.fetchImpl,
      now: options.now,
    });
    options.tokens.save(access);
    return json({ connected: true }, 200, {
      "Set-Cookie": gggOAuthSessionCookie(
        access.id,
        options.secure ?? false,
        accessLifetimeSeconds(access.expiresAt, options.now ?? new Date()),
      ),
    });
  } catch (error) {
    return oauthErrorResponse(error);
  }
}

export async function handleGggDisconnect(
  cookieHeader: string | null,
  store: GggOAuthSessionStore,
  tokens: GggAccessSessionStore,
  secure: boolean,
): Promise<Response> {
  const sessionId = gggOAuthSessionIdFromCookie(cookieHeader);
  if (sessionId) {
    store.take(sessionId);
    tokens.delete(sessionId);
  }
  return json(
    {
      disconnected: true,
      revokedAtProvider: false,
      message:
        "Local GGG session state was cleared. The token was not revoked at Grinding Gear Games.",
    },
    200,
    { "Set-Cookie": gggOAuthSessionCookie("", secure, 0) },
  );
}

export async function handleGggCharactersGet(options: {
  readiness: GggLiveImportReadiness;
  cookieHeader: string | null;
  tokens: GggAccessSessionStore;
  fetchImpl?: typeof fetch;
}): Promise<Response> {
  if (options.readiness.status !== "ready") {
    return disabledCharacters();
  }
  const access = readAccess(options.cookieHeader, options.tokens);
  if (!access) {
    return json(
      { error: "Connect a GGG account before listing characters." },
      401,
    );
  }
  try {
    const provider = createLiveGggCharacterProvider({
      readiness: options.readiness,
      accessToken: access.accessToken,
      tree: { nodeIds: new Set(), source: "unused" },
      fetchImpl: options.fetchImpl,
    });
    return json({ characters: await provider.listCharacters() }, 200);
  } catch (error) {
    return oauthErrorResponse(error);
  }
}

export async function handleGggCharacterImport(options: {
  name: string;
  readiness: GggLiveImportReadiness;
  cookieHeader: string | null;
  tokens: GggAccessSessionStore;
  tree: GggTreePin;
  fetchImpl?: typeof fetch;
  now?: Date;
}): Promise<Response> {
  if (options.readiness.status !== "ready") {
    return disabledCharacters();
  }
  const access = readAccess(options.cookieHeader, options.tokens);
  if (!access) {
    return json(
      { error: "Connect a GGG account before importing a character." },
      401,
    );
  }
  try {
    const provider = createLiveGggCharacterProvider({
      readiness: options.readiness,
      accessToken: access.accessToken,
      tree: options.tree,
      fetchImpl: options.fetchImpl,
      now: options.now ? () => options.now ?? new Date() : undefined,
    });
    const imported = await provider.getCharacter(options.name);
    return json(imported, 200);
  } catch (error) {
    return oauthErrorResponse(error);
  }
}

async function disabledCharacters(): Promise<Response> {
  try {
    await createDisabledGggCharacterProvider().listCharacters();
  } catch (error) {
    const message =
      error instanceof GggOAuthError
        ? error.message
        : LIVE_GGG_CHARACTER_IMPORT_MESSAGE;
    return json({ error: message }, 503);
  }
  return json({ error: LIVE_GGG_CHARACTER_IMPORT_MESSAGE }, 503);
}

function readAccess(
  cookieHeader: string | null,
  tokens: GggAccessSessionStore,
) {
  const sessionId = gggOAuthSessionIdFromCookie(cookieHeader);
  if (!sessionId) return undefined;
  return tokens.read(sessionId);
}

function accessLifetimeSeconds(expiresAt: string, now: Date): number {
  return Math.max(
    0,
    Math.floor((Date.parse(expiresAt) - now.getTime()) / 1000),
  );
}

function oauthErrorResponse(error: unknown): Response {
  if (error instanceof GggOAuthError) {
    return json({ error: error.message }, error.httpStatus ?? 503);
  }
  return json({ error: "GGG character data is unavailable." }, 503);
}

function json(
  body: unknown,
  status: number,
  headers?: Record<string, string>,
): Response {
  return Response.json(body, { status, headers });
}
