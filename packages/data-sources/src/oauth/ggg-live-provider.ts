import type { CharacterSummary } from "@poe2-helper/domain";
import {
  GGG_CHARACTER_API_URL,
  GggOAuthError,
  gggUserAgent,
  type GggLiveImportReadiness,
} from "./ggg-oauth";
import {
  normalizeGggCharacterDocument,
  parseGggCharacterList,
  parseGggCharacterResponse,
  type GggCharacterImport,
  type GggTreePin,
} from "./ggg-character-document";
import type { GggCharacterProvider } from "./ggg-character-provider";

const MAX_GET_ATTEMPTS = 2;
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

export function createLiveGggCharacterProvider(options: {
  readiness: Extract<GggLiveImportReadiness, { status: "ready" }>;
  accessToken: string;
  tree: GggTreePin;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}): GggCharacterProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  const sleep = options.sleep ?? ((ms: number) => delay(ms));
  const userAgent = gggUserAgent(
    options.readiness.clientId,
    options.readiness.contact,
  );

  return {
    async listCharacters() {
      const payload = await getJson(
        GGG_CHARACTER_API_URL,
        options.accessToken,
        userAgent,
        fetchImpl,
        sleep,
      );
      return parseGggCharacterList(payload);
    },
    async getCharacter(name: string) {
      assertCharacterName(name);
      const payload = await getJson(
        `${GGG_CHARACTER_API_URL}/${encodeURIComponent(name)}`,
        options.accessToken,
        userAgent,
        fetchImpl,
        sleep,
      );
      return normalizeGggCharacterDocument(
        parseGggCharacterResponse(payload),
        options.tree,
        now(),
      );
    },
  };
}

export type { CharacterSummary, GggCharacterImport };

function assertCharacterName(name: string): void {
  if (
    name.length === 0 ||
    name.length > 64 ||
    /[\u0000-\u001F\u007F/?#\\]/.test(name)
  ) {
    throw new GggOAuthError(
      "That character name cannot be requested.",
      "request",
      400,
    );
  }
}

async function getJson(
  url: string,
  accessToken: string,
  userAgent: string,
  fetchImpl: typeof fetch,
  sleep: (ms: number) => Promise<void>,
): Promise<unknown> {
  if (!url.startsWith(`${GGG_CHARACTER_API_URL}`)) {
    throw new GggOAuthError(
      "The character URL is not allowed.",
      "request",
      400,
    );
  }
  let lastStatus = 503;
  for (let attempt = 1; attempt <= MAX_GET_ATTEMPTS; attempt += 1) {
    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": userAgent,
        },
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError")
      ) {
        throw new GggOAuthError("The GGG request timed out.", "provider", 504);
      }
      throw new GggOAuthError("The GGG request failed.", "provider", 503);
    }

    if (response.ok) {
      try {
        return await response.json();
      } catch {
        throw new GggOAuthError(
          "The GGG character response was not valid JSON.",
          "provider",
          502,
        );
      }
    }

    lastStatus = response.status;
    if (!RETRY_STATUSES.has(response.status) || attempt === MAX_GET_ATTEMPTS) {
      throw characterHttpError(response.status);
    }
    await sleep(200);
  }
  throw characterHttpError(lastStatus);
}

function characterHttpError(status: number): GggOAuthError {
  if (status === 401) {
    return new GggOAuthError(
      "The GGG access token was rejected.",
      "provider",
      401,
    );
  }
  if (status === 403) {
    return new GggOAuthError(
      "The GGG token does not allow character access.",
      "provider",
      403,
    );
  }
  if (status === 404) {
    return new GggOAuthError("That character was not found.", "provider", 404);
  }
  if (status === 429) {
    return new GggOAuthError(
      "GGG rate limited the character request.",
      "provider",
      429,
    );
  }
  return new GggOAuthError(
    "GGG character data is unavailable.",
    "provider",
    503,
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
