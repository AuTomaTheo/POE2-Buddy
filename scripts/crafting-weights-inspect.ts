import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import {
  evaluateSourcePool,
  indexCraftingSnapshot,
  parseCraftingSnapshot,
  translateModifier,
} from "@poe2-helper/crafting-data";
import {
  calculateCommunityAugmentationProbabilities,
  classifyCommunityWeight,
  COMMUNITY_WEIGHT_PATCH,
  communityWeightChecksum,
  mapHistoricalFamily,
  normalizeCommunityFamily,
  promotedWeight,
  type CommunityAffixKind,
  type CommunityWeightRecord,
} from "@poe2-helper/crafting-mechanics";

const columns = [
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
];

function sharedStrings(xml: string): string[] {
  const values: string[] = [];
  for (const match of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    const parts = [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(
      (part) => decodeXml(part[1]),
    );
    values.push(parts.join(""));
  }
  return values;
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function sheetRows(
  xml: string,
  strings: string[],
): Map<number, Record<string, string>> {
  const rows = new Map<number, Record<string, string>>();
  for (const rowMatch of xml.matchAll(
    /<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g,
  )) {
    const cells: Record<string, string> = {};
    for (const cell of rowMatch[2].matchAll(
      /<c r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g,
    )) {
      const type = cell[2] ?? "";
      const raw = cell[3].match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
      if (type.includes('t="s"')) {
        cells[cell[1]] = strings[Number(raw)] ?? "";
      } else if (type.includes('t="str"')) {
        cells[cell[1]] = decodeXml(raw);
      } else {
        cells[cell[1]] = raw;
      }
    }
    rows.set(Number(rowMatch[1]), cells);
  }
  return rows;
}

function numberOf(value: string | undefined): number | null {
  if (!value || value === "|" || value.endsWith("|")) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const workbook =
  process.env.CRAFTING_WEIGHT_WORKBOOK ??
  path.join(process.env.TEMP ?? "", "coe-0209", "unzipped", "xl");
const coePath =
  process.env.CRAFTING_COE_DATA ??
  path.join(process.env.TEMP ?? "", "coe-0208a", "data.json");
const strings = sharedStrings(
  readFileSync(path.join(workbook, "sharedStrings.xml"), "utf8"),
);
const weights = sheetRows(
  readFileSync(path.join(workbook, "worksheets", "sheet6.xml"), "utf8"),
  strings,
);
const levels = sheetRows(
  readFileSync(path.join(workbook, "worksheets", "sheet7.xml"), "utf8"),
  strings,
);

type HistoricalRow = {
  baseCategory: string;
  affixKind: CommunityAffixKind;
  displayFamily: string;
  tierIndex: number;
  requiredItemLevel: number;
  weight: number;
};

const historical: HistoricalRow[] = [];
for (const [rowNumber, cells] of weights) {
  if (rowNumber === 1 || !cells.A || !cells.B || !cells.C) {
    continue;
  }
  const affixKind =
    cells.B.toLowerCase() === "prefix"
      ? "prefix"
      : cells.B.toLowerCase() === "suffix"
        ? "suffix"
        : null;
  if (!affixKind) {
    continue;
  }
  columns.forEach((column, index) => {
    const weight = numberOf(cells[column]);
    const requiredItemLevel = numberOf(levels.get(rowNumber)?.[column]);
    if (weight === null || requiredItemLevel === null) {
      return;
    }
    historical.push({
      baseCategory: cells.A,
      affixKind,
      displayFamily: cells.C,
      tierIndex: index + 1,
      requiredItemLevel,
      weight,
    });
  });
}

const coeRaw = readFileSync(coePath, "utf8")
  .replace(/^coedata=/, "")
  .replace(/;$/, "");
const coe = JSON.parse(coeRaw) as {
  items: { entries: { key: string; class: number }[] };
  mods: { entries: { id: number; key: string }[] };
  classmods: Record<string, Record<string, number>>;
};
const coeModByKey = new Map(coe.mods.entries.map((mod) => [mod.key, mod]));
const coeClassByKey = new Map(
  coe.items.entries.map((item) => [item.key, item.class]),
);

const snapshot = parseCraftingSnapshot(
  JSON.parse(readFileSync("var/crafting-data/snapshot.json", "utf8")),
);
if (!snapshot.ok) {
  throw new Error(snapshot.error.message);
}
const indexed = indexCraftingSnapshot(snapshot.value);

const scopes = [
  {
    scope: "body-armour-str",
    sheetCategories: ["BODY ARMOUR (STR)"],
    baseId: "Metadata/Items/Armours/BodyArmours/FourBodyStr1",
  },
  {
    scope: "ring",
    sheetCategories: ["RING"],
    baseId: "Metadata/Items/Rings/FourRing1",
  },
  {
    scope: "wand",
    sheetCategories: ["WAND", "CHAOS WAND", "PHYSICAL WAND"],
    baseId: "Metadata/Items/Weapons/OneHandWeapons/Wands/FourWand1",
  },
] as const;

const records: CommunityWeightRecord[] = [];
const coverage: {
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
  prefixWeight: number;
  suffixWeight: number;
}[] = [];
const examples: {
  kind: string;
  scope: string;
  modifierId: string;
  historical: number | null;
  current: number | null;
}[] = [];

for (const scope of scopes) {
  const classId = coeClassByKey.get(scope.baseId);
  const base = indexed.baseById.get(scope.baseId);
  if (classId === undefined || !base) {
    throw new Error(`Missing scope ${scope.scope}`);
  }
  const classWeights = coe.classmods[String(classId)] ?? {};
  const eligible = indexed.snapshot.modifiers.filter((modifier) => {
    if (modifier.affixKind !== "prefix" && modifier.affixKind !== "suffix") {
      return false;
    }
    const result = evaluateSourcePool(
      indexed,
      { baseId: scope.baseId, modifierId: modifier.id, itemLevel: 82 },
      { applyGenerationWeights: false },
    );
    return result.ok && result.value.status === "eligible";
  });
  const candidates = eligible.map((modifier) => {
    const translated = translateModifier(indexed, modifier.id);
    const lines = translated.ok ? translated.value.lines : [];
    const resolved =
      lines.length > 0 &&
      lines.every((line) => line.status === "resolved" && line.template);
    return {
      modifierId: modifier.id,
      affixKind: modifier.affixKind as CommunityAffixKind,
      normalizedFamily: resolved
        ? normalizeCommunityFamily(
            lines.map((line) => line.template ?? "").join(", "),
          )
        : "",
      requiredItemLevel: modifier.requiredItemLevel,
      resolved,
    };
  });
  const mappedByCategory = scope.sheetCategories.map((sheetCategory) => {
    const historicalForScope = historical.filter(
      (row) => row.baseCategory === sheetCategory,
    );
    const families = new Map<string, HistoricalRow[]>();
    for (const row of historicalForScope) {
      const key = `${row.affixKind}\u0000${normalizeCommunityFamily(row.displayFamily)}`;
      const list = families.get(key) ?? [];
      list.push(row);
      families.set(key, list);
    }
    const historicalById = new Map<string, number>();
    let unresolved = 0;
    for (const rows of families.values()) {
      const mapped = mapHistoricalFamily({
        displayFamily: rows[0]?.displayFamily ?? "",
        affixKind: rows[0]?.affixKind ?? "prefix",
        tiers: rows.map((row) => ({
          tierIndex: row.tierIndex,
          requiredItemLevel: row.requiredItemLevel,
          weight: row.weight,
        })),
        candidates,
      });
      if (mapped.status === "unresolved") {
        unresolved += 1;
        continue;
      }
      for (const row of mapped.rows) {
        historicalById.set(row.modifierId, row.weight);
      }
    }
    return { sheetCategory, historicalById, unresolved };
  });
  const chosen = mappedByCategory.sort(
    (left, right) => right.historicalById.size - left.historicalById.size,
  )[0];
  if (!chosen) {
    throw new Error(`No historical category for ${scope.scope}`);
  }
  const historicalById = chosen.historicalById;
  const unresolved = chosen.unresolved;
  const missing: string[] = [];
  let unchanged = 0;
  let changed = 0;
  let currentOnly = 0;
  let prefixWeight = 0;
  let suffixWeight = 0;
  for (const modifier of eligible) {
    const coeMod = coeModByKey.get(modifier.id);
    const current = coeMod ? (classWeights[String(coeMod.id)] ?? null) : null;
    const historicalWeight = historicalById.get(modifier.id) ?? null;
    const comparison = classifyCommunityWeight(historicalWeight, current);
    if (comparison === "unchanged") unchanged += 1;
    if (comparison === "changed") changed += 1;
    if (comparison === "current-only") currentOnly += 1;
    const weight = promotedWeight({ comparison, current });
    if (weight === null) {
      missing.push(modifier.id);
      continue;
    }
    const validation =
      comparison === "unchanged"
        ? "validated-historical-unchanged"
        : comparison === "changed"
          ? "validated-current"
          : "current-only";
    records.push({
      modifierId: modifier.id,
      scope: scope.scope,
      affixKind: modifier.affixKind as CommunityAffixKind,
      weight,
      patch: COMMUNITY_WEIGHT_PATCH,
      validation,
    });
    if (modifier.affixKind === "prefix") prefixWeight += weight;
    if (modifier.affixKind === "suffix") suffixWeight += weight;
    if (
      examples.filter(
        (example) =>
          example.kind === comparison && example.scope === scope.scope,
      ).length < 1
    ) {
      examples.push({
        kind: comparison,
        scope: scope.scope,
        modifierId: modifier.id,
        historical: historicalWeight,
        current,
      });
    }
  }
  const historicalOnly = [...historicalById.keys()].filter(
    (modifierId) => !eligible.some((modifier) => modifier.id === modifierId),
  );
  coverage.push({
    scope: scope.scope,
    baseName: base.name,
    eligible: eligible.length,
    weighted: eligible.length - missing.length,
    missing,
    sheetCategory: chosen.sheetCategory,
    unchanged,
    changed,
    currentOnly,
    historicalOnly: historicalOnly.length,
    unresolved,
    totalWeight: prefixWeight + suffixWeight,
    prefixWeight,
    suffixWeight,
  });
}

const outputDir = path.join("var", "crafting-community-weights");
mkdirSync(outputDir, { recursive: true });
writeFileSync(
  path.join(outputDir, "historical-prohibited-library.json"),
  JSON.stringify({ schemaVersion: 1, rows: historical }, null, 2),
);
const checksum = communityWeightChecksum(records);
writeFileSync(
  path.join(outputDir, "current-4.5.5.3.json"),
  JSON.stringify(
    {
      schemaVersion: 1,
      modelKind: "community-derived",
      patch: COMMUNITY_WEIGHT_PATCH,
      checksum,
      records,
    },
    null,
    2,
  ),
);

const bodyRecords = records.filter(
  (record) => record.scope === "body-armour-str",
);
const bodyPool = calculateCommunityAugmentationProbabilities({
  requestedPatch: COMMUNITY_WEIGHT_PATCH,
  weightPatch: COMMUNITY_WEIGHT_PATCH,
  snapshotChecksum: snapshot.value.checksum,
  existingSide: "none",
  candidates: bodyRecords.map((record) => ({
    modifierId: record.modifierId,
    affixKind: record.affixKind,
    weight: record.weight,
  })),
});
const spirit = bodyRecords
  .filter((record) => record.modifierId.startsWith("IncreasedSpirit"))
  .sort((left, right) => left.modifierId.localeCompare(right.modifierId))
  .map((record) => ({ modifierId: record.modifierId, weight: record.weight }));
const suffixPool = calculateCommunityAugmentationProbabilities({
  requestedPatch: COMMUNITY_WEIGHT_PATCH,
  weightPatch: COMMUNITY_WEIGHT_PATCH,
  snapshotChecksum: snapshot.value.checksum,
  existingSide: "prefix",
  candidates: bodyRecords.map((record) => ({
    modifierId: record.modifierId,
    affixKind: record.affixKind,
    weight: record.weight,
  })),
});
const prefixPool = calculateCommunityAugmentationProbabilities({
  requestedPatch: COMMUNITY_WEIGHT_PATCH,
  weightPatch: COMMUNITY_WEIGHT_PATCH,
  snapshotChecksum: snapshot.value.checksum,
  existingSide: "suffix",
  candidates: bodyRecords.map((record) => ({
    modifierId: record.modifierId,
    affixKind: record.affixKind,
    weight: record.weight,
  })),
});
const sampleIds = [
  "ChaosResist1",
  "IncreasedSpirit8",
  "Strength1",
  "IncreasedLife13",
  "IncreasedLife12",
];
const samples = bodyPool.ok
  ? sampleIds.map((modifierId) => {
      const candidate = bodyPool.candidates.find(
        (row) => row.modifierId === modifierId,
      );
      return candidate ?? null;
    })
  : [];
const probabilitySum = bodyPool.ok
  ? bodyPool.candidates.reduce(
      (sum, candidate) => sum + candidate.probability,
      0,
    )
  : null;

const summary = {
  historicalRows: historical.length,
  checksum,
  snapshotChecksum: snapshot.value.checksum,
  coverage,
  examples,
  bodyPool: bodyPool.ok
    ? {
        totalWeight: bodyPool.totalWeight,
        count: bodyPool.candidates.length,
        probabilitySum,
      }
    : bodyPool,
  suffixTotalWeight: suffixPool.ok ? suffixPool.totalWeight : null,
  prefixTotalWeight: prefixPool.ok ? prefixPool.totalWeight : null,
  spirit,
  samples,
};
writeFileSync(
  path.join(outputDir, "inspect-summary.json"),
  JSON.stringify(summary, null, 2),
);
console.log(JSON.stringify(summary, null, 2));
