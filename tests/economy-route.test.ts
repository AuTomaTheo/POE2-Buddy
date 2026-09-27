import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PoeNinjaClient } from "@poe2-helper/data-sources";
import { PoeNinjaError } from "@poe2-helper/data-sources";
import { describe, expect, it } from "vitest";
import { handleEconomyGet } from "../apps/web/src/server/economy-route";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

describe("economy route", () => {
  it("does not call poe.ninja when no contact is configured", async () => {
    const response = await handleEconomyGet(
      new URL("http://localhost/api/economy?resource=leagues"),
      null,
    );
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Set POE2_NINJA_CONTACT before requesting economy data.",
    });
  });

  it("returns provider data from the server client and hides provider failure from analysis", async () => {
    const client: PoeNinjaClient = {
      getLeagues: async () => [{ id: "Standard", name: "Standard" }],
      getExchangeOverview: async () => {
        throw new PoeNinjaError(
          "poe.ninja returned HTTP 503.",
          "provider",
          503,
        );
      },
      getStashItemOverview: async () => {
        throw new Error("unused");
      },
    };

    const leagues = await handleEconomyGet(
      new URL("http://localhost/api/economy?resource=leagues"),
      client,
    );
    expect(leagues.status).toBe(200);
    await expect(leagues.json()).resolves.toEqual({
      leagues: [{ id: "Standard", name: "Standard" }],
    });

    const failed = await handleEconomyGet(
      new URL(
        "http://localhost/api/economy?resource=exchange&league=Standard&type=Currency",
      ),
      client,
    );
    expect(failed.status).toBe(503);

    const analysis = readFileSync(
      path.join(repositoryRoot, "apps/web/src/server/analyze-passive-build.ts"),
      "utf8",
    );
    const screen = readFileSync(
      path.join(repositoryRoot, "apps/web/src/app/analysis-screen.tsx"),
      "utf8",
    );
    expect(analysis).not.toContain("poe.ninja");
    expect(analysis).not.toContain("handleEconomyGet");
    expect(screen).not.toContain("poe.ninja");
    expect(screen).not.toContain("/api/economy");
  });
});
