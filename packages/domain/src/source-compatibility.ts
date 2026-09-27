import type { GameDataVersion } from "./version";

/**
 * Whether a build fixture and a passive-tree snapshot describe the same pin.
 * `fetchedAt` is not compared. A later copy of the same commit can have a new timestamp.
 */
export type SourceCompatibility = {
  compatible: boolean;
  fixtureVersion?: string;
  treeVersion?: string;
  fixtureCommit?: string;
  treeCommit?: string;
  fixtureSource: string;
  treeSource: string;
  reasons: readonly string[];
};

export function compareGameDataSources(
  fixture: GameDataVersion,
  tree: GameDataVersion,
): SourceCompatibility {
  const reasons: string[] = [];

  if (fixture.source !== tree.source) {
    reasons.push("Fixture source and tree source differ.");
  }

  if (fixture.version === undefined || tree.version === undefined) {
    reasons.push("Fixture version or tree version is missing.");
  } else if (fixture.version !== tree.version) {
    reasons.push("Fixture version and tree version differ.");
  }

  if (fixture.commit === undefined || tree.commit === undefined) {
    reasons.push("Fixture commit or tree commit is missing.");
  } else if (fixture.commit !== tree.commit) {
    reasons.push("Fixture commit and tree commit differ.");
  }

  if (
    fixture.checksum !== undefined &&
    tree.checksum !== undefined &&
    fixture.checksum !== tree.checksum
  ) {
    reasons.push("Fixture checksum and tree checksum differ.");
  }

  return {
    compatible: reasons.length === 0,
    fixtureVersion: fixture.version,
    treeVersion: tree.version,
    fixtureCommit: fixture.commit,
    treeCommit: tree.commit,
    fixtureSource: fixture.source,
    treeSource: tree.source,
    reasons,
  };
}
