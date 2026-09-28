import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADD_RANDOM_EXPLICIT_ID,
  assessSimulationRegistry,
  evaluateMechanicScope,
  SIMULATION_DECISION,
  SIMULATION_SNAPSHOT_CHECKSUM,
  SIMULATION_SOURCE_COMMIT,
} from "./index.js";

const binding = {
  snapshotChecksum: SIMULATION_SNAPSHOT_CHECKSUM,
  sourceCommit: SIMULATION_SOURCE_COMMIT,
};

describe("simulation go/no-go", () => {
  it("selects no mechanic and keeps Augmentation off the simulator", () => {
    const registry = assessSimulationRegistry(binding);
    expect(registry.ok).toBe(true);
    if (!registry.ok) {
      return;
    }
    expect(registry.decision).toBe(SIMULATION_DECISION);
    expect(registry.selectedMechanicId).toBeNull();
    expect(registry.step021).toBe("BLOCKED");
    const augmentation = registry.mechanics.find(
      (mechanic) => mechanic.mechanicId === ADD_RANDOM_EXPLICIT_ID,
    );
    expect(augmentation?.readiness).toBe("ready-for-transition-only");
    expect(augmentation?.readiness).not.toBe("ready-for-simulation");
    expect(augmentation?.pool).toBe("partial");
    expect(augmentation?.probabilityStatus).toBe("blocked");
    expect(
      registry.mechanics.some(
        (mechanic) => mechanic.readiness === "ready-for-simulation",
      ),
    ).toBe(false);
    expect(
      registry.newEvidence.every((source) => !source.closesAugmentationGaps),
    ).toBe(true);
  });

  it("accepts the zero-mod magic scope only as a transition", () => {
    const inScope = evaluateMechanicScope(binding, ADD_RANDOM_EXPLICIT_ID, {
      rarity: "magic",
      explicitModifierCount: 0,
    });
    expect(inScope.ok && inScope.inScope).toBe(true);
    if (inScope.ok) {
      expect(inScope.readiness).toBe("ready-for-transition-only");
      expect(inScope.simulatable).toBe(false);
    }
  });

  it("refuses Augmentation outside that scope", () => {
    const rare = evaluateMechanicScope(binding, ADD_RANDOM_EXPLICIT_ID, {
      rarity: "rare",
      explicitModifierCount: 0,
    });
    const occupied = evaluateMechanicScope(binding, ADD_RANDOM_EXPLICIT_ID, {
      rarity: "magic",
      explicitModifierCount: 1,
    });
    expect(rare.ok && rare.inScope).toBe(false);
    expect(occupied.ok && occupied.inScope).toBe(false);
    if (rare.ok && occupied.ok) {
      expect(rare.readiness).toBe("blocked");
      expect(occupied.readiness).toBe("blocked");
      expect(rare.simulatable).toBe(false);
    }
  });

  it("fails closed when the snapshot checksum or commit differs", () => {
    const staleChecksum = assessSimulationRegistry({
      snapshotChecksum: `sha256:${"ab".repeat(32)}`,
      sourceCommit: SIMULATION_SOURCE_COMMIT,
    });
    const staleCommit = assessSimulationRegistry({
      snapshotChecksum: SIMULATION_SNAPSHOT_CHECKSUM,
      sourceCommit: "not-the-pinned-commit",
    });
    expect(staleChecksum.ok).toBe(false);
    expect(staleCommit.ok).toBe(false);
    if (!staleChecksum.ok && !staleCommit.ok) {
      expect(staleChecksum.code).toBe("provenance-mismatch");
      expect(staleCommit.code).toBe("provenance-mismatch");
    }
  });

  it("exposes no numeric probability", () => {
    const registry = assessSimulationRegistry(binding);
    const keys = keysOf(registry);
    expect(keys).not.toContain("probability");
    expect(keys).not.toContain("expectedCost");
    expect(JSON.stringify(registry)).not.toMatch(/"probability":\s*0\./);
  });

  it("matches the checked-in readiness artifact", () => {
    const registry = assessSimulationRegistry(binding);
    expect(registry.ok).toBe(true);
    if (!registry.ok) {
      return;
    }
    const artifact = JSON.parse(
      readFileSync(
        path.join(
          process.cwd(),
          "docs",
          "data-snapshots",
          "crafting",
          "mechanics",
          "simulator-readiness.json",
        ),
        "utf8",
      ),
    ) as {
      decision: string;
      selectedMechanicId: string | null;
      step021: string;
      mechanics: { mechanicId: string; readiness: string }[];
    };
    expect(artifact.decision).toBe(registry.decision);
    expect(artifact.selectedMechanicId).toBeNull();
    expect(artifact.step021).toBe("BLOCKED");
    expect(artifact.mechanics.map((mechanic) => mechanic.mechanicId)).toEqual(
      registry.mechanics.map((mechanic) => mechanic.mechanicId),
    );
    expect(artifact.mechanics.map((mechanic) => mechanic.readiness)).toEqual(
      registry.mechanics.map((mechanic) => mechanic.readiness),
    );
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
