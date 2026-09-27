import {
  parseEconomySnapshot,
  type EconomyLeague,
  type EconomySnapshot,
} from "@poe2-helper/domain";
import { z } from "zod";

export const POE_NINJA_ORIGIN = "https://poe.ninja";

export const POE2_EXCHANGE_TYPES = [
  "Currency",
  "Fragments",
  "Abyss",
  "UncutGems",
  "LineageSupportGems",
  "Essences",
  "SoulCores",
  "Idols",
  "Runes",
  "Ritual",
  "Expedition",
  "Delirium",
  "Breach",
  "Verisium",
] as const;

export const POE2_STASH_ITEM_TYPES = [
  "UniqueWeapons",
  "UniqueArmours",
  "UniqueAccessories",
  "UniqueFlasks",
  "UniqueCharms",
  "UniqueJewels",
  "UniqueSanctumRelics",
  "UniqueTablets",
  "PrecursorTablets",
] as const;

export type Poe2ExchangeType = (typeof POE2_EXCHANGE_TYPES)[number];
export type Poe2StashItemType = (typeof POE2_STASH_ITEM_TYPES)[number];

const LEAGUE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._-]*$/;
const DEFAULT_MAX_AGE_SECONDS = 300;
const MAX_RETRY_AFTER_MS = 5_000;
const MAX_ATTEMPTS = 3;

const leagueListSchema = z.array(
  z
    .object({
      id: z.string().min(1),
      name: z.string().min(1),
    })
    .passthrough(),
);

const exchangeOverviewSchema = z
  .object({
    lines: z.array(
      z
        .object({
          id: z.string().min(1),
          primaryValue: z.number().finite(),
          volumePrimaryValue: z.number().finite().optional(),
        })
        .passthrough(),
    ),
    core: z
      .object({
        primary: z.string().min(1),
        items: z
          .array(
            z
              .object({
                id: z.string().min(1),
                name: z.string().min(1),
                category: z.string().min(1).optional(),
              })
              .passthrough(),
          )
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

const stashOverviewSchema = z
  .object({
    lines: z.array(
      z
        .object({
          id: z.number().int().nonnegative(),
          name: z.string().min(1),
          category: z.string().min(1).optional(),
          primaryValue: z.number().finite(),
          listingCount: z.number().int().nonnegative().optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export class PoeNinjaError extends Error {
  readonly failureKind: "request" | "provider";
  readonly httpStatus: number | null;

  constructor(
    message: string,
    failureKind: "request" | "provider",
    httpStatus: number | null = null,
  ) {
    super(message);
    this.name = "PoeNinjaError";
    this.failureKind = failureKind;
    this.httpStatus = httpStatus;
  }
}

export type PoeNinjaFetch = (
  url: string,
  init: { headers: Record<string, string> },
) => Promise<Response>;

type CacheEntry = {
  body: string;
  etag: string | null;
  expiresAt: number;
};

export type PoeNinjaClient = {
  getLeagues: () => Promise<readonly EconomyLeague[]>;
  getExchangeOverview: (
    leagueId: string,
    type: Poe2ExchangeType,
  ) => Promise<EconomySnapshot>;
  getStashItemOverview: (
    leagueId: string,
    type: Poe2StashItemType,
  ) => Promise<EconomySnapshot>;
};

export function poeNinjaUserAgent(contact: string): string {
  const trimmed = contact.trim();
  if (trimmed.length === 0 || /[\r\n]/.test(trimmed)) {
    throw new PoeNinjaError(
      "poe.ninja requests need a contact in the User-Agent. Set POE2_NINJA_CONTACT.",
      "request",
    );
  }
  return `PoE2-Helper/0.1.0 (${trimmed})`;
}

export function createPoeNinjaClient(options: {
  userAgent: string;
  fetchImpl?: PoeNinjaFetch;
  now?: () => number;
  fetchedAt?: () => string;
  sleep?: (milliseconds: number) => Promise<void>;
}): PoeNinjaClient {
  if (
    options.userAgent.trim().length === 0 ||
    /[\r\n]/.test(options.userAgent)
  ) {
    throw new PoeNinjaError(
      "poe.ninja requests need a User-Agent that identifies the app and a contact.",
      "request",
    );
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  const fetchedAt = options.fetchedAt ?? (() => new Date().toISOString());
  const sleep =
    options.sleep ?? ((milliseconds: number) => delay(milliseconds));
  const cache = new Map<string, CacheEntry>();

  return {
    getLeagues: () =>
      loadLeagues(fetchImpl, cache, now, sleep, options.userAgent),
    getExchangeOverview: (leagueId, type) =>
      loadOverview({
        fetchImpl,
        cache,
        now,
        sleep,
        userAgent: options.userAgent,
        fetchedAt,
        leagueId,
        type,
        endpoint: "exchange",
      }),
    getStashItemOverview: (leagueId, type) =>
      loadOverview({
        fetchImpl,
        cache,
        now,
        sleep,
        userAgent: options.userAgent,
        fetchedAt,
        leagueId,
        type,
        endpoint: "stash-item",
      }),
  };
}

async function loadLeagues(
  fetchImpl: PoeNinjaFetch,
  cache: Map<string, CacheEntry>,
  now: () => number,
  sleep: (milliseconds: number) => Promise<void>,
  userAgent: string,
): Promise<readonly EconomyLeague[]> {
  const url = economyUrl("/poe2/api/economy/leagues");
  const body = await loadCachedJson(
    url,
    fetchImpl,
    cache,
    now,
    sleep,
    userAgent,
  );
  const parsed = leagueListSchema.safeParse(body);
  if (!parsed.success) {
    cache.delete(url);
    throw new PoeNinjaError(
      "poe.ninja league list does not match the expected schema.",
      "provider",
    );
  }
  return parsed.data.map((league) => ({ id: league.id, name: league.name }));
}

async function loadOverview(input: {
  fetchImpl: PoeNinjaFetch;
  cache: Map<string, CacheEntry>;
  now: () => number;
  sleep: (milliseconds: number) => Promise<void>;
  userAgent: string;
  fetchedAt: () => string;
  leagueId: string;
  type: string;
  endpoint: "exchange" | "stash-item";
}): Promise<EconomySnapshot> {
  assertLeagueId(input.leagueId);
  assertCategory(input.endpoint, input.type);
  const path =
    input.endpoint === "exchange"
      ? "/poe2/api/economy/exchange/current/overview"
      : "/poe2/api/economy/stash/current/item/overview";
  const url = economyUrl(path, {
    league: input.leagueId,
    type: input.type,
  });
  const body = await loadCachedJson(
    url,
    input.fetchImpl,
    input.cache,
    input.now,
    input.sleep,
    input.userAgent,
  );
  const snapshot =
    input.endpoint === "exchange"
      ? normalizeExchange(body, input.leagueId, input.type, input.fetchedAt())
      : normalizeStash(body, input.leagueId, input.type, input.fetchedAt());
  if (!snapshot) {
    input.cache.delete(url);
    throw new PoeNinjaError(
      "poe.ninja economy overview does not match the expected schema.",
      "provider",
    );
  }
  return parseEconomySnapshot(snapshot);
}

async function loadCachedJson(
  url: string,
  fetchImpl: PoeNinjaFetch,
  cache: Map<string, CacheEntry>,
  now: () => number,
  sleep: (milliseconds: number) => Promise<void>,
  userAgent: string,
): Promise<unknown> {
  const cached = cache.get(url);
  if (cached && now() < cached.expiresAt) {
    return JSON.parse(cached.body) as unknown;
  }
  const response = await requestWithRetry(
    url,
    fetchImpl,
    sleep,
    userAgent,
    cached?.etag ?? null,
  );
  if (response.status === 304) {
    if (!cached) {
      throw new PoeNinjaError(
        "poe.ninja returned 304 without a cached economy response.",
        "provider",
        304,
      );
    }
    cached.expiresAt = now() + cacheLifetime(response) * 1000;
    return JSON.parse(cached.body) as unknown;
  }
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    throw new PoeNinjaError(
      "poe.ninja economy response is not valid JSON.",
      "provider",
      response.status,
    );
  }
  cache.set(url, {
    body: text,
    etag: response.headers.get("etag"),
    expiresAt: now() + cacheLifetime(response) * 1000,
  });
  return body;
}

async function requestWithRetry(
  url: string,
  fetchImpl: PoeNinjaFetch,
  sleep: (milliseconds: number) => Promise<void>,
  userAgent: string,
  etag: string | null,
): Promise<Response> {
  let lastError: PoeNinjaError | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": userAgent,
    };
    if (etag) headers["If-None-Match"] = etag;
    let response: Response;
    try {
      response = await fetchImpl(url, { headers });
    } catch (error) {
      lastError = new PoeNinjaError(
        error instanceof Error ? error.message : "poe.ninja request failed.",
        "provider",
      );
      if (attempt === MAX_ATTEMPTS) break;
      await sleep(backoffMs(attempt));
      continue;
    }
    assertResponseUrl(response.url);
    if (response.status === 304 || response.ok) return response;
    lastError = new PoeNinjaError(
      `poe.ninja returned HTTP ${response.status}.`,
      "provider",
      response.status,
    );
    if (!shouldRetry(response.status) || attempt === MAX_ATTEMPTS) {
      throw lastError;
    }
    await sleep(retryDelayMs(response, attempt));
  }
  throw lastError ?? new PoeNinjaError("poe.ninja request failed.", "provider");
}

function normalizeExchange(
  value: unknown,
  leagueId: string,
  category: string,
  fetchedAt: string,
): EconomySnapshot | null {
  const parsed = exchangeOverviewSchema.safeParse(value);
  if (!parsed.success) return null;
  const names = new Map(
    (parsed.data.core.items ?? []).map((item) => [item.id, item]),
  );
  return {
    source: "https://poe.ninja",
    endpoint: "exchange",
    leagueId,
    category,
    referenceCurrency: parsed.data.core.primary,
    fetchedAt,
    lines: parsed.data.lines.map((line) => ({
      id: line.id,
      name: names.get(line.id)?.name ?? line.id,
      category: names.get(line.id)?.category ?? category,
      primaryValue: line.primaryValue,
      listingCount: null,
      volumePrimaryValue: line.volumePrimaryValue ?? null,
      kind: "exchange",
    })),
  };
}

function normalizeStash(
  value: unknown,
  leagueId: string,
  category: string,
  fetchedAt: string,
): EconomySnapshot | null {
  const parsed = stashOverviewSchema.safeParse(value);
  if (!parsed.success) return null;
  return {
    source: "https://poe.ninja",
    endpoint: "stash-item",
    leagueId,
    category,
    referenceCurrency: null,
    fetchedAt,
    lines: parsed.data.lines.map((line) => ({
      id: String(line.id),
      name: line.name,
      category: line.category ?? category,
      primaryValue: line.primaryValue,
      listingCount: line.listingCount ?? null,
      volumePrimaryValue: null,
      kind: "stash-item",
    })),
  };
}

function economyUrl(path: string, query?: Record<string, string>): string {
  if (
    path !== "/poe2/api/economy/leagues" &&
    path !== "/poe2/api/economy/exchange/current/overview" &&
    path !== "/poe2/api/economy/stash/current/item/overview"
  ) {
    throw new PoeNinjaError(
      "Only supported PoE2 economy endpoints can be requested.",
      "request",
    );
  }
  const url = new URL(path, POE_NINJA_ORIGIN);
  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function assertLeagueId(leagueId: string): void {
  if (!LEAGUE_PATTERN.test(leagueId) || leagueId.length > 80) {
    throw new PoeNinjaError(
      "League id must be a poe.ninja economy league name.",
      "request",
    );
  }
}

function assertCategory(
  endpoint: "exchange" | "stash-item",
  type: string,
): void {
  const allowed =
    endpoint === "exchange" ? POE2_EXCHANGE_TYPES : POE2_STASH_ITEM_TYPES;
  if (!(allowed as readonly string[]).includes(type)) {
    throw new PoeNinjaError(
      `Economy category ${type} is not a supported PoE2 ${endpoint} type.`,
      "request",
    );
  }
}

function assertResponseUrl(url: string): void {
  if (url.length === 0) return;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new PoeNinjaError(
      "Refusing a poe.ninja response from an unexpected URL.",
      "provider",
    );
  }
  if (
    parsed.origin !== POE_NINJA_ORIGIN ||
    !parsed.pathname.startsWith("/poe2/api/economy/")
  ) {
    throw new PoeNinjaError(
      "Refusing a poe.ninja response from an unexpected URL.",
      "provider",
    );
  }
}

function cacheLifetime(response: Response): number {
  const header = response.headers.get("cache-control") ?? "";
  const match = /(?:^|,\s*)max-age=(\d+)/i.exec(header);
  if (!match?.[1]) return DEFAULT_MAX_AGE_SECONDS;
  return Number(match[1]);
}

function shouldRetry(status: number): boolean {
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function backoffMs(attempt: number): number {
  return 200 * 2 ** (attempt - 1);
}

function retryDelayMs(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter && /^\d+$/.test(retryAfter)) {
    return Math.min(Number(retryAfter) * 1000, MAX_RETRY_AFTER_MS);
  }
  return backoffMs(attempt);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
