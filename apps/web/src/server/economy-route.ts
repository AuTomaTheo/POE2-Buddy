import {
  PoeNinjaError,
  createPoeNinjaClient,
  poeNinjaUserAgent,
  type Poe2ExchangeType,
  type Poe2StashItemType,
  type PoeNinjaClient,
} from "@poe2-helper/data-sources";

const clients = new Map<string, PoeNinjaClient>();

export function serverPoeNinjaClient(contact: string): PoeNinjaClient {
  const userAgent = poeNinjaUserAgent(contact);
  const existing = clients.get(userAgent);
  if (existing) return existing;
  const created = createPoeNinjaClient({ userAgent });
  clients.set(userAgent, created);
  return created;
}

export async function handleEconomyGet(
  url: URL,
  client: PoeNinjaClient | null,
): Promise<Response> {
  if (!client) {
    return economyJson(
      {
        error: "Set POE2_NINJA_CONTACT before requesting economy data.",
      },
      503,
    );
  }

  const resource = url.searchParams.get("resource");
  try {
    if (resource === "leagues") {
      return economyJson({ leagues: await client.getLeagues() }, 200);
    }
    const league = url.searchParams.get("league") ?? "";
    const type = url.searchParams.get("type") ?? "";
    if (resource === "exchange") {
      return economyJson(
        await client.getExchangeOverview(league, type as Poe2ExchangeType),
        200,
      );
    }
    if (resource === "stash-item") {
      return economyJson(
        await client.getStashItemOverview(league, type as Poe2StashItemType),
        200,
      );
    }
    return economyJson(
      { error: "Use resource=leagues, exchange, or stash-item." },
      400,
    );
  } catch (error) {
    if (error instanceof PoeNinjaError && error.failureKind === "request") {
      return economyJson({ error: error.message }, 400);
    }
    const message =
      error instanceof PoeNinjaError
        ? error.message
        : "Economy data is unavailable.";
    return economyJson({ error: message }, 503);
  }
}

function economyJson(body: unknown, status: number): Response {
  return Response.json(body, { status });
}
