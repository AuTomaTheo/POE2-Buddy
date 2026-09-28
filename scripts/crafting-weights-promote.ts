import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  COMMUNITY_WEIGHT_LINEAGE,
  COMMUNITY_WEIGHT_MODEL_KIND,
  COMMUNITY_WEIGHT_PATCH,
  COMMUNITY_WEIGHT_SCHEMA_VERSION,
  communityWeightChecksum,
  type CommunityWeightRecord,
} from "@poe2-helper/crafting-mechanics";

const root = process.cwd();
const currentPath = path.join(
  root,
  "var",
  "crafting-community-weights",
  "current-4.5.5.3.json",
);
const summaryPath = path.join(
  root,
  "var",
  "crafting-community-weights",
  "inspect-summary.json",
);
const current = JSON.parse(readFileSync(currentPath, "utf8")) as {
  patch?: string;
  checksum?: string;
  records?: CommunityWeightRecord[];
};
const summary = JSON.parse(readFileSync(summaryPath, "utf8")) as {
  snapshotChecksum?: string;
  coverage?: {
    scope: string;
    baseName: string;
    eligible: number;
    weighted: number;
    missing: string[];
    sheetCategory: string;
    unchanged: number;
    changed: number;
    currentOnly: number;
    historicalOnly: number;
    unresolved: number;
    totalWeight: number;
  }[];
  bodyPool?: { totalWeight?: number; count?: number; probabilitySum?: number };
  suffixTotalWeight?: number;
  prefixTotalWeight?: number;
  samples?: { modifierId: string; weight: number; probability: number }[];
  spirit?: { modifierId: string; weight: number }[];
  examples?: {
    kind: string;
    scope: string;
    modifierId: string;
    historical: number | null;
    current: number | null;
  }[];
};

const records = current.records ?? [];
const checksum = communityWeightChecksum(records);
const failures: string[] = [];
if (current.patch !== COMMUNITY_WEIGHT_PATCH) {
  failures.push("current snapshot patch is not 4.5.5.3");
}
if (current.checksum !== checksum) {
  failures.push("current snapshot checksum does not match its records");
}
for (const scope of summary.coverage ?? []) {
  if (scope.missing.length > 0 || scope.weighted !== scope.eligible) {
    failures.push(
      `${scope.scope} does not have complete current weight coverage`,
    );
  }
}
if (
  summary.bodyPool?.totalWeight !== 124500 ||
  summary.bodyPool.count !== 144
) {
  failures.push(
    "Rusted Cuirass pool no longer matches the reconstructed observation",
  );
}
for (const sample of summary.samples ?? []) {
  const expected = summary.bodyPool?.totalWeight
    ? sample.weight / summary.bodyPool.totalWeight
    : null;
  if (expected === null || sample.probability !== expected) {
    failures.push(
      `${sample.modifierId} probability does not match weight over total`,
    );
  }
}

const ready = failures.length === 0;
const manifest = {
  schemaVersion: COMMUNITY_WEIGHT_SCHEMA_VERSION,
  modelKind: COMMUNITY_WEIGHT_MODEL_KIND,
  patch: COMMUNITY_WEIGHT_PATCH,
  lineage: COMMUNITY_WEIGHT_LINEAGE,
  weightAuthority: "Craft of Exile class weight",
  spreadsheetId: "1l811uI5eXML-Iw_vNNouah9XRWZVGiLjzZOBWObxKpI",
  observedOn: "2026-09-27",
  redistribution:
    "full weight tables stay gitignored; no redistribution license was found",
  snapshotChecksum: summary.snapshotChecksum,
  checksum,
  directEvidenceProbabilityModel: "blocked",
  communityDerivedProbabilityModel: ready ? "ready" : "blocked",
  validatedScope:
    "Magic items with zero or one explicit modifier on the STR body armour, ring, and wand class pools",
  step021: ready
    ? "STEP-021 READY FOR AUGMENTATION USING COMMUNITY-DERIVED WEIGHTS: STR body armour, ring, and wand"
    : "STEP-021 BLOCKED",
  coverage: (summary.coverage ?? []).map((scope) => ({
    scope: scope.scope,
    baseName: scope.baseName,
    sheetCategory: scope.sheetCategory,
    eligible: scope.eligible,
    weighted: scope.weighted,
    missing: scope.missing.length,
    unchanged: scope.unchanged,
    changed: scope.changed,
    currentOnly: scope.currentOnly,
    historicalOnly: scope.historicalOnly,
    unresolved: scope.unresolved,
    totalWeight: scope.totalWeight,
    coverage: scope.eligible === 0 ? 0 : scope.weighted / scope.eligible,
  })),
  rustedCuirass: {
    count: summary.bodyPool?.count ?? null,
    totalWeight: summary.bodyPool?.totalWeight ?? null,
    suffixWeightAfterOnePrefix: summary.suffixTotalWeight ?? null,
    prefixWeightAfterOneSuffix: summary.prefixTotalWeight ?? null,
    probabilitySum: summary.bodyPool?.probabilitySum ?? null,
  },
  samples: summary.samples ?? [],
  spirit: summary.spirit ?? [],
  examples: summary.examples ?? [],
  poe2dbNumericWeights: "unavailable",
  failures,
};

const manifestDir = path.join(
  root,
  "docs",
  "data-snapshots",
  "crafting",
  "community-weights",
);
mkdirSync(manifestDir, { recursive: true });
writeFileSync(
  path.join(manifestDir, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  JSON.stringify({ step021: manifest.step021, checksum, failures }, null, 2),
);
if (!ready) {
  process.exitCode = 1;
}
