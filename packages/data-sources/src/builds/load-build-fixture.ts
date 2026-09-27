import { readFileSync } from "node:fs";
import type {
  BuildFixture,
  PassiveTreeSnapshot,
  WeaponSetSpecialisations,
} from "@poe2-helper/domain";
import { parseBuildFixture } from "@poe2-helper/domain";

const weaponSets = ["set1", "set2", "set3"] as const;

export type WeaponSetAllocation = {
  set: (typeof weaponSets)[number];
  nodeId: number;
};

/**
 * A loaded fixture plus passive ids that are not on the selected snapshot.
 * Unknown ids stay on the character. They are listed here and not removed.
 */
export type BuildFixtureReport = {
  fixture: BuildFixture;
  unknownAllocatedIds: readonly number[];
  unknownWeaponSetIds: readonly WeaponSetAllocation[];
  unknownClassName: string | null;
};

export function reportBuildFixtureAgainstSnapshot(
  fixture: BuildFixture,
  snapshot: PassiveTreeSnapshot,
): BuildFixtureReport {
  const knownNodeIds = new Set(snapshot.nodes.map((node) => node.id));
  const classNames = new Set(
    snapshot.classStarts.map((classStart) => classStart.className),
  );
  const { character } = fixture;

  return {
    fixture,
    unknownAllocatedIds: unknownIds(
      character.allocatedPassiveIds,
      knownNodeIds,
    ),
    unknownWeaponSetIds: unknownWeaponSetIds(
      character.weaponSetSpecialisations,
      knownNodeIds,
    ),
    unknownClassName: classNames.has(character.className)
      ? null
      : character.className,
  };
}

export function loadBuildFixture(options: {
  filePath: string;
  snapshot: PassiveTreeSnapshot;
}): BuildFixtureReport {
  const contents = readFileSync(options.filePath, "utf8");
  const fixture = parseBuildFixture(JSON.parse(contents) as unknown);
  return reportBuildFixtureAgainstSnapshot(fixture, options.snapshot);
}

function unknownIds(
  ids: readonly number[],
  knownNodeIds: ReadonlySet<number>,
): number[] {
  return ids.filter((id) => !knownNodeIds.has(id));
}

function unknownWeaponSetIds(
  specialisations: WeaponSetSpecialisations,
  knownNodeIds: ReadonlySet<number>,
): WeaponSetAllocation[] {
  const unknown: WeaponSetAllocation[] = [];
  for (const set of weaponSets) {
    for (const nodeId of specialisations[set]) {
      if (!knownNodeIds.has(nodeId)) {
        unknown.push({ set, nodeId });
      }
    }
  }
  return unknown;
}
