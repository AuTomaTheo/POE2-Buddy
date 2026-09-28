import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADD_RANDOM_EXPLICIT_ID,
  assessCommunityAugmentationModel,
  assessSimulationRegistry,
  COMMUNITY_MODEL_CHECKSUM,
  COMMUNITY_MODEL_PATCH,
  probabilityStatusForCommunityWeight,
  SIMULATION_DECISION,
  SIMULATION_SNAPSHOT_CHECKSUM,
  SIMULATION_SOURCE_COMMIT,
} from "./index.js";

const binding = {
  snapshotChecksum: SIMULATION_SNAPSHOT_CHECKSUM,
  sourceCommit: SIMULATION_SOURCE_COMMIT,
  communityPatch: COMMUNITY_MODEL_PATCH,
};

describe("community augmentation model", () => {
  it("keeps the community model blocked and separate from direct evidence", () => {
    const community = assessCommunityAugmentationModel(binding);
    const official = assessSimulationRegistry(binding);
    expect(community.ok).toBe(true);
    expect(official.ok).toBe(true);
    if (!community.ok || !official.ok) {
      return;
    }
    expect(community.modelKind).toBe("community-derived");
    expect(community.validation).toBe("blocked");
    expect(community.officialEvidence).toBe("blocked");
    expect(official.decision).toBe(SIMULATION_DECISION);
    expect(community.step021).toBe("BLOCKED");
    expect(official.step021).toBe("BLOCKED");
    expect(community.checksum).toBe(COMMUNITY_MODEL_CHECKSUM);
    expect(community.binding.communityPatch).toBe("4.5.5.3");
    const augmentation = official.mechanics.find(
      (mechanic) => mechanic.mechanicId === ADD_RANDOM_EXPLICIT_ID,
    );
    expect(augmentation?.readiness).not.toBe("ready-for-simulation");
  });

  it("does not treat dictionary overlap as a candidate pool", () => {
    const community = assessCommunityAugmentationModel(binding);
    expect(community.ok).toBe(true);
    if (!community.ok) {
      return;
    }
    expect(community.differential.rustedCuirassInspectionPresent).toBe(144);
    expect(community.differential.ironRingInspectionPresent).toBe(203);
    expect(community.differential.witheredWandInspectionPresent).toBe(118);
    expect(community.validation).toBe("blocked");
  });

  it("blocks probability for an unavailable community weight", () => {
    expect(probabilityStatusForCommunityWeight("unavailable")).toBe("blocked");
    expect(probabilityStatusForCommunityWeight("mismatch")).toBe("blocked");
    const community = assessCommunityAugmentationModel(binding);
    expect(keysOf(community)).not.toContain("probability");
    expect(keysOf(community)).not.toContain("expectedCost");
  });

  it("fails closed on a stale snapshot or a different community patch", () => {
    const stale = assessCommunityAugmentationModel({
      ...binding,
      snapshotChecksum: `sha256:${"ab".repeat(32)}`,
    });
    const otherPatch = assessCommunityAugmentationModel({
      ...binding,
      communityPatch: "4.5.4.1.2",
    });
    expect(stale.ok).toBe(false);
    expect(otherPatch.ok).toBe(false);
    if (!stale.ok && !otherPatch.ok) {
      expect(stale.code).toBe("provenance-mismatch");
      expect(otherPatch.code).toBe("patch-mismatch");
    }
  });

  it("matches the checked-in community-model artifact", () => {
    const community = assessCommunityAugmentationModel(binding);
    expect(community.ok).toBe(true);
    if (!community.ok) {
      return;
    }
    const artifact = JSON.parse(
      readFileSync(
        path.join(
          process.cwd(),
          "docs",
          "data-snapshots",
          "crafting",
          "community-models",
          "augmentation-4.5.5.3.json",
        ),
        "utf8",
      ),
    ) as { checksum?: string; validation?: string; modelKind?: string };
    expect(artifact.checksum).toBe(community.checksum);
    expect(artifact.validation).toBe("blocked");
    expect(artifact.modelKind).toBe("community-derived");
  });
});

function keysOf(value: unknown): string[] {
  const keys: string[] = [];
  const visit = (current: unknown) => {
    if (!current || typeof current !== "object") {
      return;
    }
    if (Array.isArray(current)) {
      for (const entry of current) {
        visit(entry);
      }
      return;
    }
    for (const [key, entry] of Object.entries(current)) {
      keys.push(key);
      visit(entry);
    }
  };
  visit(value);
  return keys;
}
