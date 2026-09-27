import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type { PassiveTreeSnapshot } from "@poe2-helper/domain";
import { z } from "zod";
import { loadPinnedPassiveTreeSnapshot } from "./load-pinned-snapshot.js";
import { normalizeSkillTreeExport } from "./normalize.js";
import { parseSkillTreeExport } from "./raw-schema.js";

export const PASSIVE_TREE_EXPORT_REPOSITORY =
  "https://github.com/grindinggear/poe2-skilltree-export";

const RAW_EXPORT_PREFIX =
  "https://raw.githubusercontent.com/grindinggear/poe2-skilltree-export/";
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const DATA_FILE = "data.json";
const MANIFEST_FILE = "manifest.json";
const CHANGELOG_FILE = "changelog.md";
const PREVIOUS_DIRECTORY = "previous";
const INCOMING_DIRECTORY = "incoming";

const fetchedAtSchema = z.string().datetime({ offset: true });

export type SnapshotBytesFetch = (url: string) => Promise<Uint8Array>;

export type RefreshRequest = {
  snapshotDirectory: string;
  commit: string;
  version: string;
  fetchedAt: string;
  fetchImpl?: SnapshotBytesFetch;
};

export type RollbackRequest = {
  snapshotDirectory: string;
  restoredAt: string;
};

export type SnapshotCompatibilityInput = {
  candidate: PassiveTreeSnapshot;
  current: PassiveTreeSnapshot | null;
  candidateClassCount: number;
};

export type SnapshotCompatibilityDecision = {
  compatible: boolean;
};

export type SnapshotPipelineResult<
  T extends SnapshotCompatibilityDecision = SnapshotCompatibilityDecision,
> =
  | {
      status: "promoted";
      version: string;
      commit: string;
      checksum: string;
      previousCommit: string | null;
      changelogPath: string;
      compatibility: T;
    }
  | {
      status: "restored";
      version: string;
      commit: string;
      checksum: string;
      changelogPath: string;
    }
  | {
      status: "rejected";
      message: string;
      compatibility?: T;
    };

export type RefreshCliCommand =
  | {
      kind: "refresh";
      snapshotDirectory: string;
      commit: string;
      version: string;
      fetchedAt?: string;
    }
  | {
      kind: "rollback";
      snapshotDirectory: string;
      fetchedAt?: string;
    };

export function passiveTreeExportRawUrl(commit: string): string {
  return `${RAW_EXPORT_PREFIX}${commit}/data.json`;
}

export function parseRefreshArgs(
  argv: readonly string[],
): { ok: true; command: RefreshCliCommand } | { ok: false; message: string } {
  const flags = new Map<string, string | true>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === undefined || !token.startsWith("--")) {
      return {
        ok: false,
        message: `Unexpected argument ${token ?? ""}.\n${REFRESH_USAGE}`,
      };
    }
    const name = token.slice(2);
    if (name === "rollback") {
      flags.set(name, true);
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      return {
        ok: false,
        message: `Missing value for --${name}.\n${REFRESH_USAGE}`,
      };
    }
    index += 1;
    if (flags.has(name)) {
      return {
        ok: false,
        message: `Repeated option --${name}.\n${REFRESH_USAGE}`,
      };
    }
    flags.set(name, value);
  }

  const allowed = new Set([
    "directory",
    "commit",
    "version",
    "fetched-at",
    "rollback",
  ]);
  for (const name of flags.keys()) {
    if (!allowed.has(name)) {
      return {
        ok: false,
        message: `Unknown option --${name}.\n${REFRESH_USAGE}`,
      };
    }
  }

  const directory = flags.get("directory");
  if (typeof directory !== "string" || directory.trim() === "") {
    return {
      ok: false,
      message: `A snapshot directory is required.\n${REFRESH_USAGE}`,
    };
  }

  const fetchedAt = flags.get("fetched-at");
  if (fetchedAt !== undefined && typeof fetchedAt !== "string") {
    return {
      ok: false,
      message: `Missing value for --fetched-at.\n${REFRESH_USAGE}`,
    };
  }

  if (flags.get("rollback") === true) {
    if (flags.has("commit") || flags.has("version")) {
      return {
        ok: false,
        message: `Rollback does not take --commit or --version.\n${REFRESH_USAGE}`,
      };
    }
    return {
      ok: true,
      command: {
        kind: "rollback",
        snapshotDirectory: directory,
        ...(fetchedAt === undefined ? {} : { fetchedAt }),
      },
    };
  }

  const commit = flags.get("commit");
  const version = flags.get("version");
  if (typeof commit !== "string" || typeof version !== "string") {
    return {
      ok: false,
      message: `Refresh requires --commit and --version.\n${REFRESH_USAGE}`,
    };
  }

  return {
    ok: true,
    command: {
      kind: "refresh",
      snapshotDirectory: directory,
      commit,
      version,
      ...(fetchedAt === undefined ? {} : { fetchedAt }),
    },
  };
}

export async function refreshPassiveTreeSnapshot<
  T extends SnapshotCompatibilityDecision,
>(
  request: RefreshRequest & {
    assessCompatibility: (input: SnapshotCompatibilityInput) => T;
  },
): Promise<SnapshotPipelineResult<T>> {
  const commit = request.commit.trim();
  const version = request.version.trim();
  const fetchedAt = request.fetchedAt.trim();
  if (!COMMIT_PATTERN.test(commit)) {
    return rejected("Commit must be a 40-character lowercase hex SHA.");
  }
  if (version === "" || version.includes("\n") || version.includes("\r")) {
    return rejected("Version must be a non-empty single line.");
  }
  if (!fetchedAtSchema.safeParse(fetchedAt).success) {
    return rejected(
      "fetchedAt must be an ISO datetime with a timezone offset.",
    );
  }

  const url = passiveTreeExportRawUrl(commit);
  let bytes: Uint8Array;
  try {
    bytes = await (request.fetchImpl ?? fetchOfficialExport)(url);
  } catch (error) {
    return rejected(errorMessage(error));
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(bytes).toString("utf8")) as unknown;
  } catch (error) {
    return rejected(
      `Passive tree export is not valid JSON: ${errorMessage(error)}`,
    );
  }

  const checksum = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  let candidateClassCount = 0;
  try {
    candidateClassCount = parseSkillTreeExport(parsed).classes.length;
    normalizeSkillTreeExport(parsed, {
      source: PASSIVE_TREE_EXPORT_REPOSITORY,
      version,
      commit,
      fetchedAt,
      checksum,
    });
  } catch (error) {
    return rejected(errorMessage(error));
  }

  const directory = path.resolve(request.snapshotDirectory);
  const incoming = path.join(directory, INCOMING_DIRECTORY);
  let candidateSnapshot;
  try {
    rmSync(incoming, { recursive: true, force: true });
    mkdirSync(incoming, { recursive: true });
    writeFileSync(path.join(incoming, DATA_FILE), bytes);
    writeFileSync(
      path.join(incoming, MANIFEST_FILE),
      manifestText({
        source: PASSIVE_TREE_EXPORT_REPOSITORY,
        version,
        commit,
        fetchedAt,
        checksum,
        file: DATA_FILE,
      }),
    );
    candidateSnapshot = loadPinnedPassiveTreeSnapshot({
      snapshotDirectory: incoming,
      logger: () => undefined,
    });
  } catch (error) {
    rmSync(incoming, { recursive: true, force: true });
    return rejected(errorMessage(error));
  }

  const dataPresent = existsSync(path.join(directory, DATA_FILE));
  const manifestPresent = existsSync(path.join(directory, MANIFEST_FILE));
  if (dataPresent !== manifestPresent) {
    rmSync(incoming, { recursive: true, force: true });
    return rejected(
      "The current snapshot is incomplete, so it was not replaced.",
    );
  }
  const hadCurrent = dataPresent && manifestPresent;
  let currentSnapshot = null;
  if (hadCurrent) {
    try {
      currentSnapshot = loadPinnedPassiveTreeSnapshot({
        snapshotDirectory: directory,
        logger: () => undefined,
      });
    } catch (error) {
      rmSync(incoming, { recursive: true, force: true });
      return rejected(
        `The current snapshot could not be loaded for compatibility comparison, so it was not replaced. ${errorMessage(error)}`,
      );
    }
  }
  const compatibility = request.assessCompatibility({
    candidate: candidateSnapshot,
    current: currentSnapshot,
    candidateClassCount,
  });
  if (!compatibility.compatible) {
    rmSync(incoming, { recursive: true, force: true });
    return rejected("Optimizer compatibility failed.", compatibility);
  }
  const previousCommit = hadCurrent ? readCommit(directory) : null;
  const previous = path.join(directory, PREVIOUS_DIRECTORY);

  try {
    if (hadCurrent) {
      rmSync(previous, { recursive: true, force: true });
      mkdirSync(previous, { recursive: true });
      copyPin(directory, previous);
    }
    installPin(incoming, directory);
  } catch (error) {
    if (hadCurrent && pinExists(previous)) {
      try {
        installPin(previous, directory);
      } catch {
        rmSync(incoming, { recursive: true, force: true });
        return rejected(
          `Promoting the snapshot failed and restoring the current pin also failed. The last good copy is in ${previous}. ${errorMessage(error)}`,
        );
      }
    }
    rmSync(incoming, { recursive: true, force: true });
    return rejected(errorMessage(error));
  }

  rmSync(incoming, { recursive: true, force: true });
  const changelogPath = appendChangelog(
    directory,
    [
      `## ${version} — ${commit}`,
      "",
      `- Promoted at ${fetchedAt}`,
      `- Checksum ${checksum}`,
      previousCommit === null
        ? "- Initial pin. No previous snapshot was stored."
        : `- Replaces ${previousCommit}. That snapshot is now in previous/.`,
      "",
    ].join("\n"),
  );

  return {
    status: "promoted",
    version,
    commit,
    checksum,
    previousCommit,
    changelogPath,
    compatibility,
  };
}

export function rollbackPassiveTreeSnapshot(
  request: RollbackRequest,
): SnapshotPipelineResult {
  const restoredAt = request.restoredAt.trim();
  if (!fetchedAtSchema.safeParse(restoredAt).success) {
    return rejected(
      "restoredAt must be an ISO datetime with a timezone offset.",
    );
  }

  const directory = path.resolve(request.snapshotDirectory);
  const previous = path.join(directory, PREVIOUS_DIRECTORY);
  if (!pinExists(previous)) {
    return rejected(
      "No previous snapshot is available to restore. The current pin was left unchanged.",
    );
  }

  try {
    loadPinnedPassiveTreeSnapshot({
      snapshotDirectory: previous,
      logger: () => undefined,
    });
  } catch (error) {
    return rejected(
      `The previous snapshot failed validation and was not restored. ${errorMessage(error)}`,
    );
  }

  const hold = path.join(directory, "rollback-hold");
  const hadCurrent = pinExists(directory);
  try {
    rmSync(hold, { recursive: true, force: true });
    if (hadCurrent) {
      mkdirSync(hold, { recursive: true });
      copyPin(directory, hold);
    }
    installPin(previous, directory);
    if (hadCurrent) {
      rmSync(previous, { recursive: true, force: true });
      mkdirSync(previous, { recursive: true });
      copyPin(hold, previous);
    }
  } catch (error) {
    if (hadCurrent && pinExists(hold)) {
      try {
        installPin(hold, directory);
      } catch {
        return rejected(
          `Rollback failed while swapping pins. Check ${hold} before deleting it. ${errorMessage(error)}`,
        );
      }
    }
    rmSync(hold, { recursive: true, force: true });
    return rejected(errorMessage(error));
  }
  rmSync(hold, { recursive: true, force: true });

  const manifest = readManifest(directory);
  const changelogPath = appendChangelog(
    directory,
    [
      `## Rollback — restored ${manifest?.version ?? "unknown"} — ${manifest?.commit ?? "unknown"}`,
      "",
      `- Restored at ${restoredAt}`,
      `- Checksum ${manifest?.checksum ?? "unknown"}`,
      hadCurrent
        ? "- The snapshot that was current is now in previous/."
        : "- previous/ was left in place because there was no current pin to swap.",
      "",
    ].join("\n"),
  );

  return {
    status: "restored",
    version: manifest?.version ?? "unknown",
    commit: manifest?.commit ?? "unknown",
    checksum: manifest?.checksum ?? "unknown",
    changelogPath,
  };
}

export async function runPassiveTreeRefreshCli<
  T extends SnapshotCompatibilityDecision,
>(
  argv: readonly string[],
  options?: {
    fetchImpl?: SnapshotBytesFetch;
    now?: () => string;
    stdout?: (message: string) => void;
    stderr?: (message: string) => void;
    assessCompatibility?: (input: SnapshotCompatibilityInput) => T;
    formatSummary?: (report: T) => string;
  },
): Promise<number> {
  const stdout = options?.stdout ?? ((message: string) => console.log(message));
  const stderr =
    options?.stderr ?? ((message: string) => console.error(message));
  const parsed = parseRefreshArgs(argv);
  if (!parsed.ok) {
    stderr(parsed.message);
    return 1;
  }

  const timestamp = options?.now?.() ?? new Date().toISOString();
  if (parsed.command.kind === "rollback") {
    const result = rollbackPassiveTreeSnapshot({
      snapshotDirectory: parsed.command.snapshotDirectory,
      restoredAt: parsed.command.fetchedAt ?? timestamp,
    });
    if (result.status === "rejected") {
      stderr(result.message);
      return 1;
    }
    stdout(
      `Restored passive tree ${result.version} (${result.commit}). Changelog: ${result.changelogPath}`,
    );
    stdout(
      "Restart any running app before trusting the new files. The in-process snapshot cache keeps the previous object until restart.",
    );
    return 0;
  }

  const assessCompatibility = options?.assessCompatibility;
  if (!assessCompatibility) {
    stderr("Optimizer compatibility check is required.");
    return 1;
  }
  const result = await refreshPassiveTreeSnapshot({
    snapshotDirectory: parsed.command.snapshotDirectory,
    commit: parsed.command.commit,
    version: parsed.command.version,
    fetchedAt: parsed.command.fetchedAt ?? timestamp,
    assessCompatibility,
    ...(options?.fetchImpl === undefined
      ? {}
      : { fetchImpl: options.fetchImpl }),
  });
  if (result.status === "rejected") {
    if (result.compatibility && options?.formatSummary) {
      stdout(options.formatSummary(result.compatibility));
    }
    stderr(result.message);
    return 1;
  }
  if (result.status !== "promoted") {
    stderr("Passive tree refresh failed.");
    return 1;
  }
  if (options?.formatSummary) {
    stdout(options.formatSummary(result.compatibility));
  }
  stdout(
    `Promoted passive tree ${result.version} (${result.commit}). Changelog: ${result.changelogPath}`,
  );
  stdout(
    "Restart any running app before trusting the new files. The in-process snapshot cache keeps the previous object until restart.",
  );
  return 0;
}

export const REFRESH_USAGE = `Usage:
  npm run refresh:passive-tree -- --directory <snapshot-dir> --commit <40-hex-sha> --version <version> [--fetched-at <iso>]
  npm run refresh:passive-tree -- --directory <snapshot-dir> --rollback [--fetched-at <iso>]

The commit and version are required. This command does not select the latest GitHub branch.
A failed download, schema check, or optimizer compatibility check does not replace data.json or manifest.json.`;

async function fetchOfficialExport(url: string): Promise<Uint8Array> {
  if (!url.startsWith(RAW_EXPORT_PREFIX)) {
    throw new Error(
      "Refusing to download a passive tree export from an unexpected URL.",
    );
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Passive tree download failed with HTTP ${response.status}.`,
    );
  }
  if (!response.url.startsWith(RAW_EXPORT_PREFIX)) {
    throw new Error(
      "Refusing to download a passive tree export from an unexpected URL.",
    );
  }
  return new Uint8Array(await response.arrayBuffer());
}

function rejected<T extends SnapshotCompatibilityDecision>(
  message: string,
  compatibility?: T,
): SnapshotPipelineResult<T> {
  return compatibility === undefined
    ? { status: "rejected", message }
    : { status: "rejected", message, compatibility };
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Passive tree refresh failed.";
}

function pinExists(directory: string): boolean {
  return (
    existsSync(path.join(directory, DATA_FILE)) &&
    existsSync(path.join(directory, MANIFEST_FILE))
  );
}

function copyPin(fromDirectory: string, toDirectory: string): void {
  copyFileSync(
    path.join(fromDirectory, DATA_FILE),
    path.join(toDirectory, DATA_FILE),
  );
  copyFileSync(
    path.join(fromDirectory, MANIFEST_FILE),
    path.join(toDirectory, MANIFEST_FILE),
  );
}

function installPin(fromDirectory: string, toDirectory: string): void {
  mkdirSync(toDirectory, { recursive: true });
  replaceFile(
    path.join(fromDirectory, DATA_FILE),
    path.join(toDirectory, DATA_FILE),
  );
  replaceFile(
    path.join(fromDirectory, MANIFEST_FILE),
    path.join(toDirectory, MANIFEST_FILE),
  );
}

function replaceFile(fromPath: string, toPath: string): void {
  const backup = `${toPath}.replacing`;
  if (existsSync(backup)) {
    rmSync(backup, { force: true });
  }
  if (existsSync(toPath)) {
    copyFileSync(toPath, backup);
  }
  try {
    copyFileSync(fromPath, toPath);
    if (existsSync(backup)) {
      rmSync(backup, { force: true });
    }
  } catch (error) {
    if (existsSync(backup)) {
      copyFileSync(backup, toPath);
      rmSync(backup, { force: true });
    }
    throw error;
  }
}

function manifestText(manifest: {
  source: string;
  version: string;
  commit: string;
  fetchedAt: string;
  checksum: string;
  file: string;
}): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function readCommit(directory: string): string | null {
  return readManifest(directory)?.commit ?? null;
}

function readManifest(directory: string): {
  version: string;
  commit: string;
  checksum: string;
} | null {
  try {
    const parsed = JSON.parse(
      readFileSync(path.join(directory, MANIFEST_FILE), "utf8"),
    ) as {
      version?: unknown;
      commit?: unknown;
      checksum?: unknown;
    };
    if (
      typeof parsed.version !== "string" ||
      typeof parsed.commit !== "string" ||
      typeof parsed.checksum !== "string"
    ) {
      return null;
    }
    return {
      version: parsed.version,
      commit: parsed.commit,
      checksum: parsed.checksum,
    };
  } catch {
    return null;
  }
}

function appendChangelog(directory: string, entry: string): string {
  const changelogPath = path.join(directory, CHANGELOG_FILE);
  const header = "# Passive tree snapshot changelog\n\n";
  const existing = existsSync(changelogPath)
    ? readFileSync(changelogPath, "utf8")
    : header;
  const prefix = existing.endsWith("\n") ? existing : `${existing}\n`;
  writeFileSync(changelogPath, `${prefix}${entry}`);
  return changelogPath;
}
