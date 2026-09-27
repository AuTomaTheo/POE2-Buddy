import { describe, expect, it } from "vitest";
import {
  PoeNinjaError,
  createPoeNinjaClient,
  poeNinjaUserAgent,
  type Poe2ExchangeType,
} from "./poe-ninja";

const fetchedAt = "2026-09-26T19:00:00.000Z";

describe("poe.ninja economy adapter", () => {
  it("requires a contact and only calls supported PoE2 economy URLs", async () => {
    expect(() => poeNinjaUserAgent("")).toThrow(/POE2_NINJA_CONTACT/);
    expect(() => poeNinjaUserAgent("bad\ncontact")).toThrow(PoeNinjaError);

    const calls: { url: string; userAgent: string | null }[] = [];
    const client = clientWith(async (url, init) => {
      calls.push({ url, userAgent: init.headers["User-Agent"] ?? null });
      return json({
        lines: [{ id: "alch", primaryValue: 0.02, volumePrimaryValue: 2 }],
        core: {
          primary: "divine",
          items: [{ id: "alch", name: "Orb of Alchemy", category: "Currency" }],
        },
      });
    });

    const snapshot = await client.getExchangeOverview(
      "Forbidden Rites",
      "Currency",
    );
    expect(calls).toEqual([
      {
        url: "https://poe.ninja/poe2/api/economy/exchange/current/overview?league=Forbidden+Rites&type=Currency",
        userAgent: "PoE2-Helper/0.1.0 (local@example.test)",
      },
    ]);
    expect(snapshot).toMatchObject({
      source: "https://poe.ninja",
      endpoint: "exchange",
      leagueId: "Forbidden Rites",
      category: "Currency",
      referenceCurrency: "divine",
      fetchedAt,
      lines: [
        {
          id: "alch",
          name: "Orb of Alchemy",
          category: "Currency",
          primaryValue: 0.02,
          listingCount: null,
          volumePrimaryValue: 2,
          kind: "exchange",
        },
      ],
    });

    await expect(
      client.getExchangeOverview("Standard", "Builds" as Poe2ExchangeType),
    ).rejects.toThrow(/not a supported PoE2 exchange type/);
    await expect(
      client.getStashItemOverview("../builds", "UniqueJewels"),
    ).rejects.toThrow(/League id/);
    expect(calls).toHaveLength(1);
  });

  it("normalizes a stash item line and keeps an unknown name as the exchange id", async () => {
    const client = clientWith(async (url) => {
      if (url.includes("/stash/")) {
        return json({
          lines: [
            {
              id: 727,
              name: "Redbeak",
              category: "[Sword|One Hand Sword]",
              primaryValue: 4238,
              listingCount: 3,
            },
          ],
        });
      }
      return json({
        lines: [{ id: "mystery", primaryValue: 1 }],
        core: { primary: "divine" },
      });
    });

    const stash = await client.getStashItemOverview(
      "Standard",
      "UniqueWeapons",
    );
    expect(stash.lines[0]).toMatchObject({
      id: "727",
      name: "Redbeak",
      primaryValue: 4238,
      listingCount: 3,
      kind: "stash-item",
    });
    expect(stash.referenceCurrency).toBeNull();

    const exchange = await client.getExchangeOverview("Standard", "Fragments");
    expect(exchange.lines[0]?.name).toBe("mystery");
  });

  it("reuses a fresh cached response and revalidates with the ETag", async () => {
    let now = 0;
    const calls: string[] = [];
    const client = createPoeNinjaClient({
      userAgent: poeNinjaUserAgent("local@example.test"),
      now: () => now,
      fetchedAt: () => fetchedAt,
      sleep: async () => undefined,
      fetchImpl: async (url, init) => {
        calls.push(init.headers["If-None-Match"] ?? "none");
        if (calls.length === 1) {
          return json([{ id: "Standard", name: "Standard" }], {
            "cache-control": "max-age=60",
            etag: '"league"',
          });
        }
        return new Response(null, {
          status: 304,
          headers: { "cache-control": "max-age=60", etag: '"league"' },
        });
      },
    });

    const first = await client.getLeagues();
    const second = await client.getLeagues();
    now = 60_000;
    const third = await client.getLeagues();
    expect(first).toEqual([{ id: "Standard", name: "Standard" }]);
    expect(second).toEqual(first);
    expect(third).toEqual(first);
    expect(calls).toEqual(["none", '"league"']);
  });

  it("retries provider failures with backoff and does not retry a bad request", async () => {
    const sleeps: number[] = [];
    let attempts = 0;
    const client = createPoeNinjaClient({
      userAgent: poeNinjaUserAgent("local@example.test"),
      fetchedAt: () => fetchedAt,
      sleep: async (milliseconds) => {
        sleeps.push(milliseconds);
      },
      fetchImpl: async () => {
        attempts += 1;
        if (attempts < 3) {
          return new Response("busy", {
            status: 503,
            headers: attempts === 1 ? { "retry-after": "30" } : {},
          });
        }
        return json([{ id: "Standard", name: "Standard" }]);
      },
    });

    await expect(client.getLeagues()).resolves.toEqual([
      { id: "Standard", name: "Standard" },
    ]);
    expect(attempts).toBe(3);
    expect(sleeps).toEqual([5_000, 400]);

    let badAttempts = 0;
    const badClient = createPoeNinjaClient({
      userAgent: poeNinjaUserAgent("local@example.test"),
      sleep: async () => {
        throw new Error("should not retry");
      },
      fetchImpl: async () => {
        badAttempts += 1;
        return new Response("no", { status: 404 });
      },
    });
    await expect(badClient.getLeagues()).rejects.toThrow(/HTTP 404/);
    expect(badAttempts).toBe(1);
  });

  it("does not keep a response that fails the schema", async () => {
    let calls = 0;
    const client = createPoeNinjaClient({
      userAgent: poeNinjaUserAgent("local@example.test"),
      fetchedAt: () => fetchedAt,
      sleep: async () => undefined,
      fetchImpl: async () => {
        calls += 1;
        return json(
          calls === 1 ? { lines: [] } : [{ id: "Standard", name: "Standard" }],
        );
      },
    });

    await expect(client.getLeagues()).rejects.toThrow(/schema/);
    await expect(client.getLeagues()).resolves.toEqual([
      { id: "Standard", name: "Standard" },
    ]);
    expect(calls).toBe(2);
  });
});

function clientWith(
  fetchImpl: (
    url: string,
    init: { headers: Record<string, string> },
  ) => Promise<Response>,
) {
  return createPoeNinjaClient({
    userAgent: poeNinjaUserAgent("local@example.test"),
    fetchedAt: () => fetchedAt,
    sleep: async () => undefined,
    fetchImpl,
  });
}

function json(body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...headers },
  });
}
