import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADD_RANDOM_EXPLICIT_ID,
  assessCommunityBehavior,
  assessSimulationRegistry,
  COMMUNITY_BEHAVIOR_CHECKSUM,
  COMMUNITY_BEHAVIOR_DISPLAY_TOLERANCE,
  COMMUNITY_MODEL_PATCH,
  equalSideTwoStageChance,
  oneStageChance,
  openMagicSides,
  SIMULATION_DECISION,
  SIMULATION_SNAPSHOT_CHECKSUM,
  SIMULATION_SOURCE_COMMIT,
} from "./index.js";

const binding = {
  snapshotChecksum: SIMULATION_SNAPSHOT_CHECKSUM,
  sourceCommit: SIMULATION_SOURCE_COMMIT,
  communityPatch: COMMUNITY_MODEL_PATCH,
};

describe("community augmentation behavior", () => {
  it("uses one combined weighted draw", () => {
    expect(oneStageChance(1, 4)).toBe(0.25);
    expect(oneStageChance(3, 4)).toBe(0.75);
    expect(oneStageChance(250, 124500)).not.toBe(
      equalSideTwoStageChance(250, 70500),
    );
  });

  it("closes the occupied magic side and leaves the other side open", () => {
    expect(openMagicSides("none")).toEqual({ prefix: true, suffix: true });
    expect(openMagicSides("prefix")).toEqual({ prefix: false, suffix: true });
    expect(openMagicSides("suffix")).toEqual({ prefix: true, suffix: false });
  });

  it("blocks a chance when the weight is missing", () => {
    expect(oneStageChance(Number.NaN, 10)).toBeNull();
    expect(oneStageChance(1, 0)).toBeNull();
  });

  it("keeps the reconstructed behavior blocked and separate from direct evidence", () => {
    const behavior = assessCommunityBehavior(binding);
    const official = assessSimulationRegistry(binding);
    expect(behavior.ok).toBe(true);
    expect(official.ok).toBe(true);
    if (!behavior.ok || !official.ok) {
      return;
    }
    expect(behavior.validation).toBe("blocked");
    expect(behavior.officialEvidence).toBe("blocked");
    expect(behavior.selectionModel).toBe("one-stage");
    expect(behavior.slotRule).toBe("one-prefix-and-one-suffix");
    expect(behavior.step021).toBe("BLOCKED");
    expect(official.decision).toBe(SIMULATION_DECISION);
    expect(
      behavior.probabilitySample.rows.every(
        (row) => row.withinDisplayTolerance === false,
      ),
    ).toBe(true);
    expect(
      Math.min(
        ...behavior.probabilitySample.rows.map((row) => row.absoluteDifference),
      ),
    ).toBeGreaterThan(COMMUNITY_BEHAVIOR_DISPLAY_TOLERANCE);
    expect(behavior.checksum).toBe(COMMUNITY_BEHAVIOR_CHECKSUM);
    const augmentation = official.mechanics.find(
      (mechanic) => mechanic.mechanicId === ADD_RANDOM_EXPLICIT_ID,
    );
    expect(augmentation?.readiness).not.toBe("ready-for-simulation");
  });

  it("fails closed on a stale snapshot or a different community patch", () => {
    const stale = assessCommunityBehavior({
      ...binding,
      snapshotChecksum: `sha256:${"ab".repeat(32)}`,
    });
    const otherPatch = assessCommunityBehavior({
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

  it("matches the checked-in behavioral observation", () => {
    const behavior = assessCommunityBehavior(binding);
    expect(behavior.ok).toBe(true);
    if (!behavior.ok) {
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
          "augmentation-behavioral-validation-4.5.5.3.json",
        ),
        "utf8",
      ),
    ) as { checksum?: string; validation?: string; selectionModel?: string };
    expect(artifact.checksum).toBe(behavior.checksum);
    expect(artifact.validation).toBe("blocked");
    expect(artifact.selectionModel).toBe("one-stage");
    const zero = behavior.cases.find((entry) => entry.caseId === "A");
    expect(zero?.observedCount).toBe(zero?.buddyCount);
  });
});
