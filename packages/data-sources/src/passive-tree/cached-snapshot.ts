import type { PassiveTreeSnapshot } from "@poe2-helper/domain";
import {
  loadPinnedPassiveTreeSnapshot,
  resolvePassiveTreeSnapshotDirectory,
} from "./load-pinned-snapshot";

type CacheEntry = {
  directory: string;
  snapshot: PassiveTreeSnapshot;
};

let cache: CacheEntry | undefined;

/**
 * Loads the pinned tree once per directory for this process, then returns
 * the same frozen snapshot. Later callers do not read or parse the JSON again.
 */
export function getPinnedPassiveTreeSnapshot(options?: {
  snapshotDirectory?: string;
  logger?: (message: string) => void;
}): PassiveTreeSnapshot {
  const directory = resolvePassiveTreeSnapshotDirectory(
    options?.snapshotDirectory,
  );
  if (cache?.directory === directory) {
    return cache.snapshot;
  }

  const snapshot = deepFreeze(
    loadPinnedPassiveTreeSnapshot({
      snapshotDirectory: directory,
      logger: options?.logger,
    }),
  );
  cache = { directory, snapshot };
  return snapshot;
}

/** Test-only. Production callers should not clear the process cache. */
export function resetPinnedPassiveTreeSnapshotCacheForTests(): void {
  cache = undefined;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}
