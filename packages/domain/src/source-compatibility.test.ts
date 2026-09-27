import { describe, expect, it } from "vitest";
import { compareGameDataSources } from "./index";
import type { GameDataVersion } from "./index";

const pin: GameDataVersion = {
  source: "https://github.com/grindinggear/poe2-skilltree-export",
  version: "0.5.5",
  commit: "bd87e6512c92b868542eddfb1ba4ea8b6dc2da36",
  fetchedAt: "2026-09-26T14:45:00.000Z",
  checksum:
    "sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642",
};

describe("game data source compatibility", () => {
  it("accepts the same source, version, and commit", () => {
    const result = compareGameDataSources(pin, {
      ...pin,
      fetchedAt: "2026-09-27T00:00:00.000Z",
    });

    expect(result.compatible).toBe(true);
    expect(result.reasons).toEqual([]);
    expect(result.fixtureVersion).toBe("0.5.5");
    expect(result.treeCommit).toBe(pin.commit);
  });

  it("rejects a different commit, version, source, or checksum", () => {
    expect(
      compareGameDataSources(pin, { ...pin, commit: "a".repeat(40) }).reasons,
    ).toEqual(["Fixture commit and tree commit differ."]);
    expect(
      compareGameDataSources(pin, { ...pin, version: "0.5.4" }).reasons,
    ).toEqual(["Fixture version and tree version differ."]);
    expect(
      compareGameDataSources(pin, { ...pin, source: "other-snapshot" }).reasons,
    ).toEqual(["Fixture source and tree source differ."]);
    expect(
      compareGameDataSources(pin, { ...pin, checksum: "sha256:ab" }).reasons,
    ).toEqual(["Fixture checksum and tree checksum differ."]);
  });

  it("blocks when version or commit is missing", () => {
    const withoutVersion: GameDataVersion = {
      source: pin.source,
      commit: pin.commit,
      fetchedAt: pin.fetchedAt,
      checksum: pin.checksum,
    };
    const withoutCommit: GameDataVersion = {
      source: pin.source,
      version: pin.version,
      fetchedAt: pin.fetchedAt,
      checksum: pin.checksum,
    };

    expect(compareGameDataSources(withoutVersion, pin).compatible).toBe(false);
    expect(compareGameDataSources(withoutVersion, pin).reasons).toEqual([
      "Fixture version or tree version is missing.",
    ]);
    expect(compareGameDataSources(pin, withoutCommit).reasons).toEqual([
      "Fixture commit or tree commit is missing.",
    ]);
  });
});
