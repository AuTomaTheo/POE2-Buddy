import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PassiveTreeSnapshot } from "@poe2-helper/domain";
import { z } from "zod";
import { normalizeSkillTreeExport } from "./normalize";

const snapshotManifestSchema = z
  .object({
    source: z.string().url(),
    version: z.string().min(1),
    commit: z.string().regex(/^[0-9a-f]{40}$/),
    fetchedAt: z.string().datetime({ offset: true }),
    checksum: z.string().regex(/^sha256:[0-9a-f]{64}$/),
    file: z.literal("data.json"),
  })
  .strict();

/**
 * Development pin under `docs/data-snapshots`. This is provenance for tests
 * and local work. Production code must pass a deployed directory or set
 * `POE2_PASSIVE_TREE_SNAPSHOT_DIR`. It must not assume `docs/` is shipped.
 */
export const developmentPassiveTreeSnapshotDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/data-snapshots/passive-tree",
);

export function resolvePassiveTreeSnapshotDirectory(
  snapshotDirectory?: string,
): string {
  if (snapshotDirectory && snapshotDirectory.trim().length > 0) {
    return path.resolve(snapshotDirectory);
  }
  const configured = process.env.POE2_PASSIVE_TREE_SNAPSHOT_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  throw new Error(
    "Passive tree snapshot directory is not configured. Pass snapshotDirectory or set POE2_PASSIVE_TREE_SNAPSHOT_DIR. The docs/data-snapshots pin is for development provenance and is not a production default.",
  );
}

export function formatPassiveTreeSnapshotLog(
  snapshot: PassiveTreeSnapshot,
  skippedRootEdges: number,
  skippedSelfEdges: number,
): string {
  const version = snapshot.version;
  return [
    "Passive tree snapshot",
    `source=${version.source}`,
    `version=${version.version ?? "unknown"}`,
    `commit=${version.commit ?? "unknown"}`,
    `checksum=${version.checksum ?? "unknown"}`,
    `fetchedAt=${version.fetchedAt}`,
    `nodes=${snapshot.nodes.length}`,
    `edges=${snapshot.edges.length}`,
    `classStarts=${snapshot.classStarts.length}`,
    `skippedRootEdges=${skippedRootEdges}`,
    `skippedSelfEdges=${skippedSelfEdges}`,
  ].join(" ");
}

export function loadPinnedPassiveTreeSnapshot(options?: {
  snapshotDirectory?: string;
  logger?: (message: string) => void;
}): PassiveTreeSnapshot {
  const snapshotDirectory = resolvePassiveTreeSnapshotDirectory(
    options?.snapshotDirectory,
  );
  const logger =
    options?.logger ?? ((message: string) => console.info(message));
  const manifestPath = path.join(snapshotDirectory, "manifest.json");
  const manifestResult = snapshotManifestSchema.safeParse(
    JSON.parse(readFileSync(manifestPath, "utf8")) as unknown,
  );
  if (!manifestResult.success) {
    throw new Error(
      `Passive tree snapshot manifest is incompatible: ${manifestResult.error.message}`,
    );
  }

  const manifest = manifestResult.data;
  const dataPath = path.join(snapshotDirectory, manifest.file);
  const bytes = readFileSync(dataPath);
  const checksum = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (checksum !== manifest.checksum) {
    throw new Error(
      `Passive tree snapshot checksum does not match the manifest. Expected ${manifest.checksum}, got ${checksum}.`,
    );
  }

  const normalized = normalizeSkillTreeExport(
    JSON.parse(bytes.toString("utf8")) as unknown,
    {
      source: manifest.source,
      version: manifest.version,
      commit: manifest.commit,
      fetchedAt: manifest.fetchedAt,
      checksum,
    },
  );
  logger(
    formatPassiveTreeSnapshotLog(
      normalized.snapshot,
      normalized.skippedRootEdges,
      normalized.skippedSelfEdges,
    ),
  );
  return normalized.snapshot;
}
