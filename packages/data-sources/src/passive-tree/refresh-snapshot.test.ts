import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { formatPassiveTreeCompatibility } from "@poe2-helper/passive-engine";
import { assessPassiveTreeRefreshCandidate } from "@poe2-helper/scoring-engine";
import { afterEach, describe, expect, it } from "vitest";
import {
  developmentPassiveTreeSnapshotDirectory,
  loadPinnedPassiveTreeSnapshot,
} from "./load-pinned-snapshot.js";
import {
  parseRefreshArgs,
  passiveTreeExportRawUrl,
  refreshPassiveTreeSnapshot,
  rollbackPassiveTreeSnapshot,
  runPassiveTreeRefreshCli,
} from "./refresh-snapshot.js";

const fetchedAt = "2026-09-26T18:00:00.000Z";
const commitA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const commitB = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("passive tree refresh", () => {
  it("rejects a broken export without creating or replacing a snapshot", async () => {
    const directory = tempDirectory();
    const approvedManifest = readFileSync(
      path.join(developmentPassiveTreeSnapshotDirectory, "manifest.json"),
      "utf8",
    );
    let fetched = 0;
    const result = await refreshPassiveTreeSnapshot({
      assessCompatibility: assessPassiveTreeRefreshCandidate,
      snapshotDirectory: directory,
      commit: commitA,
      version: "9.9.9",
      fetchedAt,
      fetchImpl: async () => {
        fetched += 1;
        return Buffer.from("{", "utf8");
      },
    });

    expect(result.status).toBe("rejected");
    expect(fetched).toBe(1);
    expect(existsSync(path.join(directory, "data.json"))).toBe(false);
    expect(existsSync(path.join(directory, "incoming"))).toBe(false);
    expect(
      readFileSync(
        path.join(developmentPassiveTreeSnapshotDirectory, "manifest.json"),
        "utf8",
      ),
    ).toBe(approvedManifest);
  });

  it("does not fetch when the commit or version is unusable", async () => {
    let fetched = 0;
    const result = await refreshPassiveTreeSnapshot({
      assessCompatibility: assessPassiveTreeRefreshCandidate,
      snapshotDirectory: tempDirectory(),
      commit: "latest",
      version: "0.5.5",
      fetchedAt,
      fetchImpl: async () => {
        fetched += 1;
        return Buffer.from("{}", "utf8");
      },
    });

    expect(result).toMatchObject({
      status: "rejected",
      message: "Commit must be a 40-character lowercase hex SHA.",
    });
    expect(fetched).toBe(0);
  });

  it("promotes a valid export, keeps the previous pin, and rolls back", async () => {
    const directory = tempDirectory();
    const first = await refreshPassiveTreeSnapshot({
      assessCompatibility: assessPassiveTreeRefreshCandidate,
      snapshotDirectory: directory,
      commit: commitA,
      version: "1.0.0",
      fetchedAt,
      fetchImpl: async (url) => {
        expect(url).toBe(passiveTreeExportRawUrl(commitA));
        return Buffer.from(JSON.stringify(sampleExport("First")), "utf8");
      },
    });
    expect(first.status).toBe("promoted");
    if (first.status !== "promoted") {
      return;
    }
    expect(first.previousCommit).toBeNull();

    const currentAfterFirst = readFileSync(path.join(directory, "data.json"));
    const broken = await refreshPassiveTreeSnapshot({
      assessCompatibility: assessPassiveTreeRefreshCandidate,
      snapshotDirectory: directory,
      commit: commitB,
      version: "2.0.0",
      fetchedAt,
      fetchImpl: async () => Buffer.from(JSON.stringify({ nodes: {} }), "utf8"),
    });
    expect(broken.status).toBe("rejected");
    if (broken.status === "rejected") {
      expect(broken.message).toContain("schema is incompatible");
    }
    expect(readFileSync(path.join(directory, "data.json"))).toEqual(
      currentAfterFirst,
    );

    const duplicate = await refreshPassiveTreeSnapshot({
      assessCompatibility: assessPassiveTreeRefreshCandidate,
      snapshotDirectory: directory,
      commit: commitB,
      version: "2.0.0",
      fetchedAt,
      fetchImpl: async () =>
        Buffer.from(JSON.stringify(duplicateSkillExport()), "utf8"),
    });
    expect(duplicate.status).toBe("rejected");
    if (duplicate.status === "rejected") {
      expect(duplicate.message).toContain("duplicate skill id 1");
    }
    expect(readFileSync(path.join(directory, "data.json"))).toEqual(
      currentAfterFirst,
    );

    const second = await refreshPassiveTreeSnapshot({
      assessCompatibility: assessPassiveTreeRefreshCandidate,
      snapshotDirectory: directory,
      commit: commitB,
      version: "2.0.0",
      fetchedAt,
      fetchImpl: async () =>
        Buffer.from(JSON.stringify(sampleExport("Second")), "utf8"),
    });
    expect(second).toMatchObject({
      status: "promoted",
      version: "2.0.0",
      commit: commitB,
      previousCommit: commitA,
    });

    const loaded = loadPinnedPassiveTreeSnapshot({
      snapshotDirectory: directory,
      logger: () => undefined,
    });
    expect(loaded.version).toMatchObject({
      version: "2.0.0",
      commit: commitB,
    });
    expect(loaded.nodes.find((node) => node.id === 2)?.name).toBe("Second");
    const changelog = readFileSync(
      path.join(directory, "changelog.md"),
      "utf8",
    );
    expect(changelog).toContain(`## 1.0.0 — ${commitA}`);
    expect(changelog).toContain(`## 2.0.0 — ${commitB}`);
    expect(changelog).toContain(`Replaces ${commitA}`);

    const restored = rollbackPassiveTreeSnapshot({
      snapshotDirectory: directory,
      restoredAt: fetchedAt,
    });
    expect(restored).toMatchObject({
      status: "restored",
      version: "1.0.0",
      commit: commitA,
    });
    const rolledBack = loadPinnedPassiveTreeSnapshot({
      snapshotDirectory: directory,
      logger: () => undefined,
    });
    expect(rolledBack.version.commit).toBe(commitA);
    expect(rolledBack.nodes.find((node) => node.id === 2)?.name).toBe("First");
    const previous = loadPinnedPassiveTreeSnapshot({
      snapshotDirectory: path.join(directory, "previous"),
      logger: () => undefined,
    });
    expect(previous.version.commit).toBe(commitB);
  });

  it("does not replace an incomplete current pin", async () => {
    const directory = tempDirectory();
    writeFileSync(path.join(directory, "data.json"), "{}\n");
    const result = await refreshPassiveTreeSnapshot({
      assessCompatibility: assessPassiveTreeRefreshCandidate,
      snapshotDirectory: directory,
      commit: commitA,
      version: "1.0.0",
      fetchedAt,
      fetchImpl: async () =>
        Buffer.from(JSON.stringify(sampleExport("Kept")), "utf8"),
    });

    expect(result).toMatchObject({
      status: "rejected",
      message: "The current snapshot is incomplete, so it was not replaced.",
    });
    expect(readFileSync(path.join(directory, "data.json"), "utf8")).toBe(
      "{}\n",
    );
    expect(existsSync(path.join(directory, "manifest.json"))).toBe(false);
  });

  it("leaves the current pin in place when there is no previous snapshot", () => {
    const result = rollbackPassiveTreeSnapshot({
      snapshotDirectory: tempDirectory(),
      restoredAt: fetchedAt,
    });
    expect(result).toMatchObject({
      status: "rejected",
      message:
        "No previous snapshot is available to restore. The current pin was left unchanged.",
    });
  });

  it("runs the command only for an explicit directory and commit", async () => {
    const missing = await runPassiveTreeRefreshCli([], {
      stderr: () => undefined,
    });
    expect(missing).toBe(1);

    const directory = tempDirectory();
    const lines: string[] = [];
    const code = await runPassiveTreeRefreshCli(
      [
        "--directory",
        directory,
        "--commit",
        commitA,
        "--version",
        "1.0.0",
        "--fetched-at",
        fetchedAt,
      ],
      {
        stdout: (message) => lines.push(message),
        assessCompatibility: assessPassiveTreeRefreshCandidate,
        formatSummary: formatPassiveTreeCompatibility,
        fetchImpl: async () =>
          Buffer.from(JSON.stringify(sampleExport("Cli")), "utf8"),
      },
    );
    expect(code).toBe(0);
    expect(lines[0]).toContain("Passive-tree candidate compatibility");
    expect(lines.join("\n")).toContain("  PASS");
    expect(lines.join("\n")).toContain("Promoted passive tree 1.0.0");
    expect(parseRefreshArgs(["--rollback", "--commit", commitA])).toMatchObject(
      { ok: false },
    );
  });

  it("does not promote a candidate the optimizer cannot use", async () => {
    const directory = tempDirectory();
    const first = await refreshPassiveTreeSnapshot({
      assessCompatibility: assessPassiveTreeRefreshCandidate,
      snapshotDirectory: directory,
      commit: commitA,
      version: "1.0.0",
      fetchedAt,
      fetchImpl: async () =>
        Buffer.from(JSON.stringify(sampleExport("First")), "utf8"),
    });
    expect(first.status).toBe("promoted");
    const second = await refreshPassiveTreeSnapshot({
      assessCompatibility: assessPassiveTreeRefreshCandidate,
      snapshotDirectory: directory,
      commit: commitB,
      version: "2.0.0",
      fetchedAt,
      fetchImpl: async () =>
        Buffer.from(JSON.stringify(sampleExport("Second")), "utf8"),
    });
    expect(second.status).toBe("promoted");

    const before = snapshotBytes(directory);
    const blocked = await refreshPassiveTreeSnapshot({
      assessCompatibility: assessPassiveTreeRefreshCandidate,
      snapshotDirectory: directory,
      commit: commitB,
      version: "3.0.0",
      fetchedAt,
      fetchImpl: async () =>
        Buffer.from(JSON.stringify(blockingExport()), "utf8"),
    });
    expect(blocked).toMatchObject({
      status: "rejected",
      message: "Optimizer compatibility failed.",
    });
    if (blocked.status === "rejected") {
      expect(blocked.compatibility?.compatible).toBe(false);
    }
    expect(snapshotBytes(directory)).toEqual(before);
    expect(existsSync(path.join(directory, "incoming"))).toBe(false);

    const stdout: string[] = [];
    const stderr: string[] = [];
    const code = await runPassiveTreeRefreshCli(
      [
        "--directory",
        directory,
        "--commit",
        commitA,
        "--version",
        "4.0.0",
        "--fetched-at",
        fetchedAt,
      ],
      {
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
        assessCompatibility: assessPassiveTreeRefreshCandidate,
        formatSummary: formatPassiveTreeCompatibility,
        fetchImpl: async () =>
          Buffer.from(JSON.stringify(classGapExport()), "utf8"),
      },
    );
    expect(code).toBe(1);
    expect(stdout.join("\n")).toContain("  FAIL");
    expect(stdout.join("\n")).toContain("Missing expected class index 1.");
    expect(stdout.join("\n")).toContain("Current snapshot was not changed.");
    expect(stdout.join("\n")).not.toContain("Promoted passive tree");
    expect(stderr.join("\n")).toContain("Optimizer compatibility failed.");
    expect(snapshotBytes(directory)).toEqual(before);
  });
});

function tempDirectory(): string {
  const directory = mkdtempSync(path.join(tmpdir(), "poe2-refresh-"));
  directories.push(directory);
  return directory;
}

function sampleExport(secondName: string) {
  return {
    nodes: {
      root: { out: ["1"], in: [] },
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
        name: secondName,
        stats: [],
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

function duplicateSkillExport() {
  const exported = sampleExport("Duplicate");
  exported.nodes.b.skill = 1;
  return exported;
}

function blockingExport() {
  const exported = sampleExport("Blocked");
  return {
    ...exported,
    nodes: {
      ...exported.nodes,
      b: {
        ...exported.nodes.b,
        stats: ["10% of Life Converted to Damage"],
      },
    },
  };
}

function classGapExport() {
  return {
    nodes: {
      root: { out: ["1"], in: [] },
      a: {
        skill: 1,
        name: "Witch start",
        stats: [],
        out: [],
        in: [],
        x: 0,
        y: 0,
        classStartIndex: [0],
      },
    },
    edges: [{ from: "root", to: 1 }],
    classes: [{ name: "Witch" }, { name: "Warrior" }],
  };
}

function snapshotBytes(directory: string) {
  const previous = path.join(directory, "previous");
  return {
    data: readFileSync(path.join(directory, "data.json")),
    manifest: readFileSync(path.join(directory, "manifest.json")),
    changelog: readFileSync(path.join(directory, "changelog.md")),
    previousData: readFileSync(path.join(previous, "data.json")),
    previousManifest: readFileSync(path.join(previous, "manifest.json")),
  };
}
