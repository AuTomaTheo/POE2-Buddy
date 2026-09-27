import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getPinnedPassiveTreeSnapshot,
  resetPinnedPassiveTreeSnapshotCacheForTests,
} from "./cached-snapshot";
import {
  developmentPassiveTreeSnapshotDirectory,
  loadPinnedPassiveTreeSnapshot,
} from "./load-pinned-snapshot";
import { normalizeSkillTreeExport } from "./normalize";

const pinnedVersion = {
  source: "https://github.com/grindinggear/poe2-skilltree-export",
  version: "test",
  commit: "bd87e6512c92b868542eddfb1ba4ea8b6dc2da36",
  fetchedAt: "2026-09-26T14:45:00.000Z",
  checksum:
    "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
};

function sampleExport() {
  return {
    nodes: {
      root: {
        out: ["1"],
        in: [],
      },
      a: {
        skill: 1,
        name: "Sample A",
        stats: [],
        out: ["2"],
        in: [],
        x: 0,
        y: 0,
        classStartIndex: [0],
      },
      b: {
        skill: 2,
        name: "Sample B",
        stats: ["10% increased Attack Speed"],
        out: [],
        in: ["1"],
        x: 10,
        y: 0,
      },
    },
    edges: [
      { from: "root", to: 1 },
      { from: 1, to: 2 },
    ],
    classes: [{ name: "Witch" }],
  };
}

describe("passive tree ingestion", () => {
  it("loads the pinned official tree and logs its version", () => {
    const messages: string[] = [];
    const snapshot = loadPinnedPassiveTreeSnapshot({
      snapshotDirectory: developmentPassiveTreeSnapshotDirectory,
      logger: (message) => messages.push(message),
    });

    expect(snapshot.nodes).toHaveLength(5152);
    expect(snapshot.edges).toHaveLength(6069);
    expect(snapshot.version).toMatchObject({
      source: "https://github.com/grindinggear/poe2-skilltree-export",
      version: "0.5.5",
      commit: "bd87e6512c92b868542eddfb1ba4ea8b6dc2da36",
      fetchedAt: "2026-09-26T14:45:00.000Z",
      checksum:
        "sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642",
    });

    const phylactery = snapshot.nodes.find((node) => node.id === 17788);
    expect(phylactery?.name).toBe("Crystalline Phylactery");
    expect(phylactery?.kinds).toEqual(["notable", "jewel-socket"]);
    expect(phylactery?.ascendancyId).toBe("Witch3");
    expect(
      snapshot.nodes.some((node) => node.sourceFlags.includes("isBlighted")),
    ).toBe(true);
    expect(messages[0]).toContain("version=0.5.5");
    expect(messages[0]).toContain(
      "commit=bd87e6512c92b868542eddfb1ba4ea8b6dc2da36",
    );
    expect(messages[0]).toContain("skippedRootEdges=6");
    expect(messages[0]).toContain("skippedSelfEdges=1");
    const grenadeDamage = snapshot.nodes.find((node) => node.id === 35653);
    expect(grenadeDamage?.name).toBe("Grenade Damage");
    expect(grenadeDamage?.neighborIds).not.toContain(35653);
    expect(snapshot.classStarts).toHaveLength(12);
    expect(snapshot.nodes.some((node) => node.name === "root")).toBe(false);
    const startsByName = new Map(
      snapshot.classStarts.map((classStart) => [
        classStart.className,
        classStart.nodeId,
      ]),
    );
    expect(startsByName.get("Witch")).toBe(54447);
    expect(startsByName.get("Sorceress")).toBe(54447);
    expect(startsByName.get("Warrior")).toBe(47175);
    expect(startsByName.get("Huntress")).toBe(50459);
    expect(startsByName.get("Monk")).toBe(44683);
    for (const classStart of snapshot.classStarts) {
      expect(snapshot.nodes.some((node) => node.id === classStart.nodeId)).toBe(
        true,
      );
    }
  });

  it("fails when the export is missing its node map", () => {
    expect(() =>
      normalizeSkillTreeExport({ edges: [] }, pinnedVersion),
    ).toThrow(/incompatible/);
  });

  it("fails when a node has an unrecognized flag", () => {
    const exported = sampleExport();
    exported.nodes.a = {
      ...exported.nodes.a,
      isBrandNew: true,
    } as typeof exported.nodes.a;

    expect(() => normalizeSkillTreeExport(exported, pinnedVersion)).toThrow(
      /Unrecognized passive node flag isBrandNew/,
    );
  });

  it("fails when the pinned file checksum does not match the manifest", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "poe2-tree-"));
    writeFileSync(
      path.join(directory, "data.json"),
      JSON.stringify(sampleExport()),
      "utf8",
    );
    writeFileSync(
      path.join(directory, "manifest.json"),
      JSON.stringify({
        source: pinnedVersion.source,
        version: "test",
        commit: pinnedVersion.commit,
        fetchedAt: pinnedVersion.fetchedAt,
        checksum: pinnedVersion.checksum,
        file: "data.json",
      }),
      "utf8",
    );

    expect(() =>
      loadPinnedPassiveTreeSnapshot({
        snapshotDirectory: directory,
        logger: () => undefined,
      }),
    ).toThrow(/checksum does not match/);
  });

  it("does not load when no snapshot directory is configured", () => {
    const previous = process.env.POE2_PASSIVE_TREE_SNAPSHOT_DIR;
    delete process.env.POE2_PASSIVE_TREE_SNAPSHOT_DIR;

    expect(() => loadPinnedPassiveTreeSnapshot()).toThrow(/not configured/);

    if (previous === undefined) {
      delete process.env.POE2_PASSIVE_TREE_SNAPSHOT_DIR;
    } else {
      process.env.POE2_PASSIVE_TREE_SNAPSHOT_DIR = previous;
    }
  });

  it("reuses the frozen snapshot without reading the export again", () => {
    resetPinnedPassiveTreeSnapshotCacheForTests();
    const messages: string[] = [];
    const logger = (message: string) => messages.push(message);
    const first = getPinnedPassiveTreeSnapshot({
      snapshotDirectory: developmentPassiveTreeSnapshotDirectory,
      logger,
    });
    const second = getPinnedPassiveTreeSnapshot({
      snapshotDirectory: developmentPassiveTreeSnapshotDirectory,
      logger,
    });

    expect(second).toBe(first);
    expect(messages).toHaveLength(1);
    expect(Object.isFrozen(first)).toBe(true);
    expect(() => {
      first.nodes.push(first.nodes[0]!);
    }).toThrow();

    resetPinnedPassiveTreeSnapshotCacheForTests();
  });
});
