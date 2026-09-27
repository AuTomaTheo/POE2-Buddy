import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const GGG_AUTHORIZE_URL = "https://www.pathofexile.com/oauth/authorize";
export const GGG_TOKEN_URL = "https://www.pathofexile.com/oauth/token";
export const GGG_CHARACTER_API_URL =
  "https://api.pathofexile.com/character/poe2";
export const GGG_CHARACTER_SCOPE = "account:characters";
export const GGG_OAUTH_CLIENT_TYPE = "confidential";
export const GGG_OAUTH_SESSION_COOKIE = "poe2_ggg_oauth";
export const GGG_OAUTH_SESSION_TTL_MS = 10 * 60 * 1000;
export const GGG_ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60;
export const GGG_LIVE_IMPORT_ENABLED = "enabled";

const ENV_NAMES = [
  "GGG_CLIENT_ID",
  "GGG_CLIENT_SECRET",
  "GGG_REDIRECT_URI",
] as const;

export type GggOAuthEnvName = (typeof ENV_NAMES)[number];

export type GggOAuthConfig =
  | { status: "missing"; missing: GggOAuthEnvName[] }
  | { status: "invalid"; variable: GggOAuthEnvName; message: string }
  | {
      status: "configured";
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };

export type GggOAuthFailureKind =
  "configuration" | "request" | "disabled" | "provider";

export class GggOAuthError extends Error {
  readonly failureKind: GggOAuthFailureKind;
  readonly httpStatus: number | undefined;

  constructor(
    message: string,
    failureKind: GggOAuthFailureKind,
    httpStatus?: number,
  ) {
    super(message);
    this.name = "GggOAuthError";
    this.failureKind = failureKind;
    this.httpStatus = httpStatus;
  }
}

export type GggOAuthPendingSession = {
  id: string;
  state: string;
  codeVerifier: string;
  codeChallenge: string;
  scope: typeof GGG_CHARACTER_SCOPE;
  createdAt: string;
  expiresAt: string;
};

export type GggOAuthSessionStore = {
  save(session: GggOAuthPendingSession): void;
  read(id: string): GggOAuthPendingSession | undefined;
  take(id: string): GggOAuthPendingSession | undefined;
};

type EnvSource = Record<string, string | undefined>;

export function readGggOAuthConfig(env: EnvSource): GggOAuthConfig {
  const values = new Map<GggOAuthEnvName, string>();
  const missing: GggOAuthEnvName[] = [];

  for (const name of ENV_NAMES) {
    const trimmed = env[name]?.trim() ?? "";
    if (trimmed.length === 0) missing.push(name);
    else values.set(name, trimmed);
  }

  if (missing.length > 0) return { status: "missing", missing };

  const clientId = values.get("GGG_CLIENT_ID");
  const clientSecret = values.get("GGG_CLIENT_SECRET");
  const redirectUri = values.get("GGG_REDIRECT_URI");
  if (!clientId || !clientSecret || !redirectUri) {
    return { status: "missing", missing: [...ENV_NAMES] };
  }

  const clientIdError = credentialError("GGG_CLIENT_ID", clientId);
  if (clientIdError) {
    return {
      status: "invalid",
      variable: "GGG_CLIENT_ID",
      message: clientIdError,
    };
  }
  const secretError = credentialError("GGG_CLIENT_SECRET", clientSecret);
  if (secretError) {
    return {
      status: "invalid",
      variable: "GGG_CLIENT_SECRET",
      message: secretError,
    };
  }
  const redirectError = redirectUriError(redirectUri);
  if (redirectError) {
    return {
      status: "invalid",
      variable: "GGG_REDIRECT_URI",
      message: redirectError,
    };
  }

  return { status: "configured", clientId, clientSecret, redirectUri };
}

export function createGggOAuthPendingSession(options?: {
  now?: Date;
  randomBytes?: (size: number) => Buffer;
}): GggOAuthPendingSession {
  const now = options?.now ?? new Date();
  const bytes = options?.randomBytes ?? randomBytes;
  const codeVerifier = bytes(32).toString("base64url");
  return {
    id: bytes(32).toString("base64url"),
    state: bytes(32).toString("base64url"),
    codeVerifier,
    codeChallenge: codeChallengeForVerifier(codeVerifier),
    scope: GGG_CHARACTER_SCOPE,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + GGG_OAUTH_SESSION_TTL_MS).toISOString(),
  };
}

export function codeChallengeForVerifier(verifier: string): string {
  return createHash("sha256").update(verifier).digest().toString("base64url");
}

export function createGggOAuthSessionStore(options?: {
  now?: () => Date;
}): GggOAuthSessionStore {
  const sessions = new Map<string, GggOAuthPendingSession>();
  const now = options?.now ?? (() => new Date());

  function current(id: string): GggOAuthPendingSession | undefined {
    const session = sessions.get(id);
    if (!session) return undefined;
    if (Date.parse(session.expiresAt) <= now().getTime()) {
      sessions.delete(id);
      return undefined;
    }
    return session;
  }

  return {
    save(session) {
      sessions.set(session.id, session);
    },
    read(id) {
      return current(id);
    },
    take(id) {
      const session = current(id);
      if (session) sessions.delete(id);
      return session;
    },
  };
}

/**
 * Builds the documented authorization URL. Callers that still have the live
 * provider disabled must not send the browser to this URL.
 */
export function buildGggAuthorizeUrl(
  config: Extract<GggOAuthConfig, { status: "configured" }>,
  session: GggOAuthPendingSession,
): URL {
  const url = new URL(GGG_AUTHORIZE_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GGG_CHARACTER_SCOPE);
  url.searchParams.set("state", session.state);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("code_challenge", session.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}

export function gggOAuthSessionCookie(
  sessionId: string,
  secure: boolean,
  maxAgeSeconds = GGG_OAUTH_SESSION_TTL_MS / 1000,
): string {
  const parts = [
    `${GGG_OAUTH_SESSION_COOKIE}=${sessionId}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/api/auth/ggg",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function gggOAuthSessionIdFromCookie(
  header: string | null,
): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    if (name !== GGG_OAUTH_SESSION_COOKIE) continue;
    const value = part.slice(separator + 1).trim();
    return value.length > 0 ? value : null;
  }
  return null;
}

export function oauthStateMatches(expected: string, received: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export type GggLiveImportReadiness =
  | {
      status: "disabled";
      reason:
        | "missing-credentials"
        | "invalid-configuration"
        | "missing-contact"
        | "not-enabled";
      message: string;
      missing?: readonly string[];
    }
  | {
      status: "ready";
      clientId: string;
      clientSecret: string;
      redirectUri: string;
      contact: string;
      clientType: typeof GGG_OAUTH_CLIENT_TYPE;
      scope: typeof GGG_CHARACTER_SCOPE;
    };

const NOT_ENABLED_MESSAGE =
  "Live GGG authorization is disabled. Set GGG_LIVE_IMPORT=enabled only after an approved client is reviewed. No authorization request was sent.";

/**
 * Live calls require a configured confidential client, a contact, and
 * GGG_LIVE_IMPORT=enabled. Credentials alone do not enable the network path.
 */
export function readGggLiveImportReadiness(
  env: EnvSource,
): GggLiveImportReadiness {
  const config = readGggOAuthConfig(env);
  if (config.status === "missing") {
    return {
      status: "disabled",
      reason: "missing-credentials",
      message: `GGG OAuth is not configured. Set ${config.missing.join(", ")}. No authorization request was sent.`,
      missing: config.missing,
    };
  }
  if (config.status === "invalid") {
    return {
      status: "disabled",
      reason: "invalid-configuration",
      message: config.message,
    };
  }

  const contact = env.GGG_CONTACT?.trim() ?? "";
  if (contact.length === 0) {
    return {
      status: "disabled",
      reason: "missing-contact",
      message:
        "Set GGG_CONTACT before live GGG requests. No authorization request was sent.",
      missing: ["GGG_CONTACT"],
    };
  }
  if (contact.length > 200 || /[\r\n]/.test(contact)) {
    return {
      status: "disabled",
      reason: "invalid-configuration",
      message: "GGG_CONTACT is not a usable contact value.",
    };
  }
  if (env.GGG_LIVE_IMPORT?.trim() !== GGG_LIVE_IMPORT_ENABLED) {
    return {
      status: "disabled",
      reason: "not-enabled",
      message: NOT_ENABLED_MESSAGE,
    };
  }

  return {
    status: "ready",
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
    contact,
    clientType: GGG_OAUTH_CLIENT_TYPE,
    scope: GGG_CHARACTER_SCOPE,
  };
}

export function gggLiveImportPublicStatus(readiness: GggLiveImportReadiness): {
  enabled: boolean;
  message: string;
} {
  if (readiness.status === "disabled") {
    return { enabled: false, message: readiness.message };
  }
  return {
    enabled: true,
    message: "Live GGG character import is available.",
  };
}

export function gggUserAgent(clientId: string, contact: string): string {
  return `OAuth ${clientId}/0.1.0 (contact: ${contact})`;
}

export function gggCookieIsSecure(
  protocol: string,
  nodeEnv: string | undefined,
): boolean {
  return protocol === "https:" || nodeEnv === "production";
}

export type GggAccessSession = {
  id: string;
  accessToken: string;
  expiresAt: string;
  scope: typeof GGG_CHARACTER_SCOPE;
};

export type GggAccessSessionStore = {
  save(session: GggAccessSession): void;
  read(id: string): GggAccessSession | undefined;
  delete(id: string): void;
};

export function createGggAccessSessionStore(options?: {
  now?: () => Date;
}): GggAccessSessionStore {
  const sessions = new Map<string, GggAccessSession>();
  const now = options?.now ?? (() => new Date());

  return {
    save(session) {
      sessions.set(session.id, session);
    },
    read(id) {
      const session = sessions.get(id);
      if (!session) return undefined;
      if (Date.parse(session.expiresAt) <= now().getTime()) {
        sessions.delete(id);
        return undefined;
      }
      return session;
    },
    delete(id) {
      sessions.delete(id);
    },
  };
}

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1),
  expires_in: z.number().int().positive(),
  scope: z.string().optional(),
});

export async function exchangeGggAuthorizationCode(options: {
  readiness: Extract<GggLiveImportReadiness, { status: "ready" }>;
  session: GggOAuthPendingSession;
  code: string;
  fetchImpl?: typeof fetch;
  now?: Date;
  randomBytes?: (size: number) => Buffer;
}): Promise<GggAccessSession> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    client_id: options.readiness.clientId,
    client_secret: options.readiness.clientSecret,
    grant_type: "authorization_code",
    code: options.code,
    redirect_uri: options.readiness.redirectUri,
    scope: GGG_CHARACTER_SCOPE,
    code_verifier: options.session.codeVerifier,
  });
  let response: Response;
  try {
    response = await fetchImpl(GGG_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": gggUserAgent(
          options.readiness.clientId,
          options.readiness.contact,
        ),
      },
      body,
      redirect: "error",
    });
  } catch (error) {
    throw providerTransportError(error);
  }

  if (!response.ok) {
    throw tokenHttpError(response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new GggOAuthError(
      "The GGG token response was not valid JSON.",
      "provider",
      502,
    );
  }

  const parsed = tokenResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new GggOAuthError(
      "The GGG token response did not match the expected document.",
      "provider",
      502,
    );
  }
  if (
    parsed.data.scope !== undefined &&
    !parsed.data.scope.split(" ").includes(GGG_CHARACTER_SCOPE)
  ) {
    throw new GggOAuthError(
      "The GGG token did not include the account:characters scope.",
      "provider",
      403,
    );
  }

  const now = options.now ?? new Date();
  const lifetimeSeconds = Math.min(
    parsed.data.expires_in,
    GGG_ACCESS_TOKEN_MAX_AGE_SECONDS,
  );
  const bytes = options.randomBytes ?? randomBytes;
  return {
    id: bytes(32).toString("base64url"),
    accessToken: parsed.data.access_token,
    expiresAt: new Date(now.getTime() + lifetimeSeconds * 1000).toISOString(),
    scope: GGG_CHARACTER_SCOPE,
  };
}

function tokenHttpError(status: number): GggOAuthError {
  if (status === 401) {
    return new GggOAuthError(
      "The GGG authorization code was rejected.",
      "provider",
      401,
    );
  }
  if (status === 403) {
    return new GggOAuthError(
      "The GGG token request was forbidden.",
      "provider",
      403,
    );
  }
  return new GggOAuthError(
    "The GGG token request failed.",
    "provider",
    status >= 500 ? 503 : 502,
  );
}

function providerTransportError(error: unknown): GggOAuthError {
  if (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  ) {
    return new GggOAuthError("The GGG request timed out.", "provider", 504);
  }
  return new GggOAuthError("The GGG request failed.", "provider", 503);
}

function credentialError(name: GggOAuthEnvName, value: string): string | null {
  if (value.length > 256 || /[\s\u0000-\u001F\u007F]/.test(value)) {
    return `${name} is not a usable credential value.`;
  }
  return null;
}

function redirectUriError(value: string): string | null {
  if (value.length > 500) {
    return "GGG_REDIRECT_URI must be an absolute http(s) URL.";
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "GGG_REDIRECT_URI must be an absolute http(s) URL.";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "GGG_REDIRECT_URI must be an absolute http(s) URL.";
  }
  if (url.username.length > 0 || url.password.length > 0) {
    return "GGG_REDIRECT_URI must not include credentials.";
  }
  if (url.hash.length > 0) {
    return "GGG_REDIRECT_URI must not include a fragment.";
  }
  return null;
}
