import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  assessPlannerReadiness,
  buildCraftingCompatibilityReport,
  diffCraftingSnapshots,
  indexCraftingSnapshot,
  normalizeCraftingSource,
  parseCraftingSnapshot,
  resolveGearBase,
  spotCheckSourceRecords,
  type CraftingSnapshot,
} from "@poe2-helper/crafting-data";

const PIN = "b818b843337cae43b090b272fd98bbc0fd3a34f3";
const SOURCE_VERSION = "4.5.5.2";
const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "var", "crafting-source");
const DATA_DIR = path.join(ROOT, "var", "crafting-data");
const SNAPSHOT_PATH = path.join(DATA_DIR, "snapshot.json");
const PREVIOUS_PATH = path.join(DATA_DIR, "previous-snapshot.json");
const DIFF_PATH = path.join(DATA_DIR, "last-diff.json");
const REJECTION_PATH = path.join(DATA_DIR, "rejection.json");
const MANIFEST_PATH = path.join(
  ROOT,
  "docs",
  "data-snapshots",
  "crafting",
  "manifest.json",
);
const COMPATIBILITY_PATH = path.join(
  ROOT,
  "docs",
  "data-snapshots",
  "crafting",
  "compatibility.json",
);

const FILES = [
  { path: "version.txt", limit: 1_000 },
  { path: "exported-version.txt", limit: 1_000 },
  { path: "data/item_classes.json", limit: 200_000 },
  { path: "data/tags.json", limit: 200_000 },
  { path: "data/base_items.json", limit: 12_000_000 },
  { path: "data/mods.json", limit: 20_000_000 },
  { path: "data/stat_translations/stat_descriptions.json", limit: 15_000_000 },
] as const;

const FIXTURE_F = [
  ["Rusted Cuirass", "Body Armour"],
  ["Linen Wraps", "Gloves"],
  ["Wrapped Greathelm", "Helmet"],
  ["Iron Ring", "Ring"],
  ["Ruby Ring", "Ring"],
  ["Withered Wand", "Wand"],
  ["Twig Focus", "Focus"],
] as const;

const LICENSE_SUMMARY =
  "repoe-fork/poe2 reports no GitHub license. Parent RePoE LICENSE.md is MIT for the software and states that generated data files are owned by Grinding Gear Games and shall not be used or published except in accordance with their terms of use. This repository does not publish the full export.";

async function main() {
  const offline = process.argv.includes("--offline");
  const rollback = process.argv.includes("--rollback");
  mkdirSync(DATA_DIR, { recursive: true });
  if (rollback) {
    await rollbackSnapshot();
    return;
  }
  if (!offline) {
    await fetchPinnedFiles();
  }
  const loaded = loadLocalFiles();
  if (!loaded.ok) {
    reject(loaded.code, loaded.message);
    return;
  }
  if (
    loaded.version !== SOURCE_VERSION ||
    loaded.exportedVersion !== SOURCE_VERSION
  ) {
    reject(
      "source-schema-invalid",
      `Pinned commit version label was ${loaded.version}, expected ${SOURCE_VERSION}.`,
    );
    return;
  }
  const normalized = normalizeCraftingSource({
    commit: PIN,
    sourceVersion: SOURCE_VERSION,
    fetchedAt: new Date().toISOString(),
    files: loaded.files,
    bases: loaded.bases,
    mods: loaded.mods,
    translations: loaded.translations,
  });
  if (!normalized.ok) {
    reject(normalized.error.code, normalized.error.message);
    return;
  }
  const checked = spotCheckSourceRecords(normalized.value, {
    bases: loaded.bases,
    mods: loaded.mods,
  });
  if (!checked.ok) {
    reject(checked.error.code, checked.error.message);
    return;
  }
  const parsed = parseCraftingSnapshot(normalized.value);
  if (!parsed.ok) {
    reject(parsed.error.code, parsed.error.message);
    return;
  }
  const gear = gearResolution(parsed.value);
  let diffSummary: ReturnType<typeof diffCraftingSnapshots> | null = null;
  if (existsSync(SNAPSHOT_PATH)) {
    const previous = parseCraftingSnapshot(
      JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")),
    );
    if (previous.ok) {
      diffSummary = diffCraftingSnapshots(previous.value, parsed.value);
      writeFileSync(DIFF_PATH, `${JSON.stringify(diffSummary, null, 2)}\n`);
      copyFileSync(SNAPSHOT_PATH, PREVIOUS_PATH);
    }
  }
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(parsed.value));
  const report = buildCraftingCompatibilityReport(parsed.value);
  const readiness = assessPlannerReadiness(parsed.value, report);
  writeFileSync(COMPATIBILITY_PATH, `${JSON.stringify(report, null, 2)}\n`);
  writeManifest(
    parsed.value,
    loaded.files,
    gear,
    diffSummary,
    checked.value.checks,
    readiness.ok ? readiness.value.plannerReadiness : "blocked",
  );
  console.log(
    JSON.stringify(
      {
        checksum: parsed.value.checksum,
        bases: parsed.value.coverage.baseCount,
        modifiers: parsed.value.coverage.modifierCount,
        translations: parsed.value.coverage.translationCount,
        readiness: parsed.value.readiness.status,
        productionPromoted: false,
        gear,
      },
      null,
      2,
    ),
  );
}

function gearResolution(snapshot: CraftingSnapshot) {
  const indexed = indexCraftingSnapshot(snapshot);
  return FIXTURE_F.map(([baseName, itemClass]) => {
    const resolved = resolveGearBase(indexed, { baseName, itemClass });
    if (!resolved.ok) {
      return { baseName, itemClass, status: resolved.error.code };
    }
    if (resolved.value.status === "resolved") {
      return {
        baseName,
        itemClass,
        status: "resolved",
        id: resolved.value.base.id,
      };
    }
    return { baseName, itemClass, status: resolved.value.status };
  });
}

async function rollbackSnapshot() {
  if (!existsSync(PREVIOUS_PATH)) {
    reject(
      "snapshot-unavailable",
      "No previous crafting snapshot is available to restore.",
    );
    return;
  }
  const previous = parseCraftingSnapshot(
    JSON.parse(readFileSync(PREVIOUS_PATH, "utf8")),
  );
  if (!previous.ok) {
    reject(previous.error.code, previous.error.message);
    return;
  }
  if (existsSync(SNAPSHOT_PATH)) {
    const current = path.join(DATA_DIR, "rolled-back-from.json");
    renameSync(SNAPSHOT_PATH, current);
  }
  copyFileSync(PREVIOUS_PATH, SNAPSHOT_PATH);
  console.log(
    JSON.stringify({
      restoredChecksum: previous.value.checksum,
      productionPromoted: false,
    }),
  );
}

async function fetchPinnedFiles() {
  mkdirSync(SOURCE_DIR, { recursive: true });
  for (const file of FILES) {
    const url = `https://raw.githubusercontent.com/repoe-fork/poe2/${PIN}/${file.path}`;
    if (
      !url.startsWith(
        `https://raw.githubusercontent.com/repoe-fork/poe2/${PIN}/`,
      )
    ) {
      throw new Error(
        "source-fetch-failed: crafting fetch URL is not the pinned host.",
      );
    }
    const response = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(180_000),
    });
    if (!response.ok || !response.body) {
      throw new Error(
        `source-fetch-failed: ${file.path} returned ${response.status}.`,
      );
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const step = await reader.read();
      if (step.done) {
        break;
      }
      total += step.value.byteLength;
      if (total > file.limit) {
        throw new Error(
          `source-fetch-failed: ${file.path} exceeded ${file.limit} bytes.`,
        );
      }
      chunks.push(step.value);
    }
    const target = path.join(SOURCE_DIR, ...file.path.split("/"));
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, Buffer.concat(chunks));
  }
}

function loadLocalFiles():
  | {
      ok: true;
      version: string;
      exportedVersion: string;
      files: { path: string; sha256: string }[];
      bases: Record<string, unknown>;
      mods: Record<string, unknown>;
      translations: unknown[];
    }
  | {
      ok: false;
      code: "source-fetch-failed" | "source-schema-invalid";
      message: string;
    } {
  const checksums: { path: string; sha256: string }[] = [];
  const bodies = new Map<string, string>();
  for (const file of FILES) {
    const target = path.join(SOURCE_DIR, ...file.path.split("/"));
    if (!existsSync(target)) {
      return {
        ok: false,
        code: "source-fetch-failed",
        message: `Missing local source file ${file.path}. Refusing to use another provider.`,
      };
    }
    const bytes = readFileSync(target);
    if (bytes.byteLength > file.limit) {
      return {
        ok: false,
        code: "source-fetch-failed",
        message: `${file.path} exceeds the size limit.`,
      };
    }
    checksums.push({
      path: file.path,
      sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    });
    bodies.set(file.path, bytes.toString("utf8"));
  }
  try {
    return {
      ok: true,
      version: (bodies.get("version.txt") ?? "").trim(),
      exportedVersion: (bodies.get("exported-version.txt") ?? "").trim(),
      files: checksums,
      bases: JSON.parse(bodies.get("data/base_items.json") ?? "{}") as Record<
        string,
        unknown
      >,
      mods: JSON.parse(bodies.get("data/mods.json") ?? "{}") as Record<
        string,
        unknown
      >,
      translations: JSON.parse(
        bodies.get("data/stat_translations/stat_descriptions.json") ?? "[]",
      ) as unknown[],
    };
  } catch {
    return {
      ok: false,
      code: "source-schema-invalid",
      message: "Pinned crafting JSON could not be parsed.",
    };
  }
}

function writeManifest(
  snapshot: CraftingSnapshot,
  files: { path: string; sha256: string }[],
  gear: unknown,
  diffSummary: ReturnType<typeof diffCraftingSnapshots> | null,
  checks: string[],
  plannerReadiness: "ready" | "partial" | "blocked",
) {
  mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  const manifest = {
    schemaVersion: snapshot.schemaVersion,
    provider: snapshot.provenance.provider,
    classification: snapshot.provenance.classification,
    commit: snapshot.provenance.commit,
    sourceVersion: snapshot.provenance.sourceVersion,
    fetchedAt: snapshot.provenance.fetchedAt,
    rawFiles: files,
    normalizedChecksum: snapshot.checksum,
    redistribution: "blocked",
    licenseSummary: LICENSE_SUMMARY,
    promotion: {
      normalized: true,
      validated: true,
      plannerApproved: plannerReadiness === "ready",
      distributionApproved: false,
    },
    compatibility: snapshot.compatibility,
    readiness: snapshot.readiness.status,
    plannerReadiness,
    coverage: snapshot.coverage,
    gearBaseResolution: gear,
    spotChecks: checks,
    datasetDiff: diffSummary,
    localSnapshot: "var/crafting-data/snapshot.json",
    rollbackSnapshot: "var/crafting-data/previous-snapshot.json",
    compatibilityReport: "docs/data-snapshots/crafting/compatibility.json",
  };
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

function reject(code: string, message: string) {
  writeFileSync(
    REJECTION_PATH,
    `${JSON.stringify({ code, message, at: new Date().toISOString() }, null, 2)}\n`,
  );
  console.error(`${code}: ${message}`);
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Crafting refresh failed.";
  const code = message.startsWith("source-fetch-failed")
    ? "source-fetch-failed"
    : "normalization-failed";
  reject(code, message);
});
