import { describe, expect, it } from "vitest";
import {
  calculateCommunityAugmentationProbabilities,
  classifyCommunityWeight,
  COMMUNITY_WEIGHT_MODEL_KIND,
  COMMUNITY_WEIGHT_PATCH,
  COMMUNITY_WEIGHT_SCHEMA_VERSION,
  mapHistoricalFamily,
  normalizeCommunityFamily,
  promotedWeight,
} from "./community-weights.js";

const checksum = "sha256:abc";

describe("community weight ingestion", () => {
  it("normalizes translation templates onto historical family text", () => {
    expect(normalizeCommunityFamily("{0} to maximum Life")).toBe(
      "# to maximum life",
    );
    expect(
      normalizeCommunityFamily("#% to [Resistances|Chaos Resistance]"),
    ).toBe("#% to chaos resistance");
  });

  it("maps an exact tier ladder and leaves an ambiguous ladder unresolved", () => {
    const exact = mapHistoricalFamily({
      displayFamily: "# to maximum Life",
      affixKind: "prefix",
      tiers: [
        { tierIndex: 1, requiredItemLevel: 80, weight: 1000 },
        { tierIndex: 2, requiredItemLevel: 75, weight: 1000 },
      ],
      candidates: [
        {
          modifierId: "IncreasedLife13",
          affixKind: "prefix",
          normalizedFamily: "# to maximum life",
          requiredItemLevel: 80,
          resolved: true,
        },
        {
          modifierId: "IncreasedLife12",
          affixKind: "prefix",
          normalizedFamily: "# to maximum life",
          requiredItemLevel: 75,
          resolved: true,
        },
      ],
    });
    expect(exact.status).toBe("exact");
    if (exact.status === "exact") {
      expect(exact.rows.map((row) => row.modifierId)).toEqual([
        "IncreasedLife13",
        "IncreasedLife12",
      ]);
    }
    const ambiguous = mapHistoricalFamily({
      displayFamily: "# to maximum Life",
      affixKind: "prefix",
      tiers: [{ tierIndex: 1, requiredItemLevel: 80, weight: 1000 }],
      candidates: [
        {
          modifierId: "IncreasedLife13",
          affixKind: "prefix",
          normalizedFamily: "# to maximum life",
          requiredItemLevel: 80,
          resolved: true,
        },
        {
          modifierId: "IncreasedLife12",
          affixKind: "prefix",
          normalizedFamily: "# to maximum life",
          requiredItemLevel: 75,
          resolved: true,
        },
      ],
    });
    expect(ambiguous.status).toBe("unresolved");
  });

  it("promotes a changed current weight and keeps the current value", () => {
    expect(classifyCommunityWeight(1000, 800)).toBe("changed");
    expect(promotedWeight({ comparison: "changed", current: 800 })).toBe(800);
    expect(classifyCommunityWeight(null, 500)).toBe("current-only");
    expect(promotedWeight({ comparison: "current-only", current: 500 })).toBe(
      500,
    );
    expect(
      promotedWeight({ comparison: "historical-only", current: null }),
    ).toBeNull();
  });

  it("calculates a one-stage pool and closes the occupied side", () => {
    const pool = calculateCommunityAugmentationProbabilities({
      requestedPatch: COMMUNITY_WEIGHT_PATCH,
      weightPatch: COMMUNITY_WEIGHT_PATCH,
      snapshotChecksum: checksum,
      existingSide: "none",
      candidates: [
        { modifierId: "A", affixKind: "prefix", weight: 100 },
        { modifierId: "B", affixKind: "prefix", weight: 300 },
        { modifierId: "C", affixKind: "suffix", weight: 600 },
      ],
    });
    expect(pool.ok).toBe(true);
    if (!pool.ok) {
      return;
    }
    expect(pool.candidates.map((candidate) => candidate.probability)).toEqual([
      0.1, 0.3, 0.6,
    ]);
    expect(pool.schemaVersion).toBe(COMMUNITY_WEIGHT_SCHEMA_VERSION);
    expect(pool.modelKind).toBe(COMMUNITY_WEIGHT_MODEL_KIND);
    expect(pool.patch).toBe(COMMUNITY_WEIGHT_PATCH);
    expect(pool.snapshotChecksum).toBe(checksum);
    const suffixes = calculateCommunityAugmentationProbabilities({
      requestedPatch: COMMUNITY_WEIGHT_PATCH,
      weightPatch: COMMUNITY_WEIGHT_PATCH,
      snapshotChecksum: checksum,
      existingSide: "prefix",
      candidates: [
        { modifierId: "A", affixKind: "prefix", weight: 100 },
        { modifierId: "C", affixKind: "suffix", weight: 600 },
      ],
    });
    expect(suffixes.ok && suffixes.totalWeight).toBe(600);
    const prefixes = calculateCommunityAugmentationProbabilities({
      requestedPatch: COMMUNITY_WEIGHT_PATCH,
      weightPatch: COMMUNITY_WEIGHT_PATCH,
      snapshotChecksum: checksum,
      existingSide: "suffix",
      candidates: [
        { modifierId: "A", affixKind: "prefix", weight: 100 },
        { modifierId: "C", affixKind: "suffix", weight: 600 },
      ],
    });
    expect(prefixes.ok && prefixes.totalWeight).toBe(100);
  });

  it("blocks the whole pool when one open weight is missing and rejects another patch", () => {
    const missing = calculateCommunityAugmentationProbabilities({
      requestedPatch: COMMUNITY_WEIGHT_PATCH,
      weightPatch: COMMUNITY_WEIGHT_PATCH,
      snapshotChecksum: checksum,
      existingSide: "none",
      candidates: [
        { modifierId: "A", affixKind: "prefix", weight: 100 },
        { modifierId: "B", affixKind: "suffix", weight: null },
      ],
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.code).toBe("missing-weight");
    }
    const stale = calculateCommunityAugmentationProbabilities({
      requestedPatch: "4.5.4.1.2",
      weightPatch: COMMUNITY_WEIGHT_PATCH,
      snapshotChecksum: checksum,
      existingSide: "none",
      candidates: [{ modifierId: "A", affixKind: "prefix", weight: 100 }],
    });
    expect(stale.ok).toBe(false);
    if (!stale.ok) {
      expect(stale.code).toBe("patch-mismatch");
    }
  });
});

describe("promoted community weight manifest", () => {
  it("records complete coverage and reproducible body-armour chances", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const manifest = JSON.parse(
      readFileSync(
        path.join(
          process.cwd(),
          "docs",
          "data-snapshots",
          "crafting",
          "community-weights",
          "manifest.json",
        ),
        "utf8",
      ),
    ) as {
      modelKind: string;
      patch: string;
      schemaVersion: number;
      directEvidenceProbabilityModel: string;
      communityDerivedProbabilityModel: string;
      coverage: { scope: string; coverage: number; missing: number }[];
      samples: { weight: number; probability: number }[];
      rustedCuirass: { totalWeight: number; probabilitySum: number };
      step021: string;
    };
    expect(manifest.modelKind).toBe("community-derived");
    expect(manifest.patch).toBe(COMMUNITY_WEIGHT_PATCH);
    expect(manifest.schemaVersion).toBe(COMMUNITY_WEIGHT_SCHEMA_VERSION);
    expect(manifest.directEvidenceProbabilityModel).toBe("blocked");
    expect(manifest.communityDerivedProbabilityModel).toBe("ready");
    expect(
      manifest.coverage.every(
        (scope) => scope.coverage === 1 && scope.missing === 0,
      ),
    ).toBe(true);
    expect(manifest.rustedCuirass.probabilitySum).toBe(1);
    for (const sample of manifest.samples) {
      expect(sample.probability).toBe(
        sample.weight / manifest.rustedCuirass.totalWeight,
      );
    }
    expect(manifest.step021).toContain("USING COMMUNITY-DERIVED WEIGHTS");
  });
});
