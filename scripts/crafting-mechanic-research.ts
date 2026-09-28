import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  AUGMENTATION_DESCRIPTION,
  AUGMENTATION_DIRECTIONS,
  AUGMENTATION_RECORD_ID,
  addRandomExplicitDefinition,
} from "@poe2-helper/crafting-mechanics";

const root = process.cwd();
const sourcePath = path.join(
  root,
  "var",
  "crafting-source",
  "data",
  "base_items.json",
);
const artifactPath = path.join(
  root,
  "docs",
  "data-snapshots",
  "crafting",
  "mechanics",
  "add-random-explicit.json",
);

const related = [
  AUGMENTATION_RECORD_ID,
  "Metadata/Items/Currency/CurrencyAddModToMagic2",
  "Metadata/Items/Currency/CurrencyAddModToMagic3",
];

let sourceText = "";
try {
  sourceText = readFileSync(sourcePath, "utf8");
} catch {
  console.error(
    "snapshot-unavailable: The local crafting source is missing. Run npm run refresh:crafting-data.",
  );
  process.exitCode = 1;
}

if (sourceText) {
  const bases = JSON.parse(sourceText) as Record<
    string,
    {
      name?: string;
      drop_level?: number;
      properties?: { description?: string; directions?: string };
    }
  >;
  const mismatches: string[] = [];
  const observed = related.map((id) => {
    const record = bases[id];
    const description = record?.properties?.description ?? "";
    const directions = record?.properties?.directions ?? "";
    if (description !== AUGMENTATION_DESCRIPTION) {
      mismatches.push(`${id} description differs`);
    }
    if (directions !== AUGMENTATION_DIRECTIONS) {
      mismatches.push(`${id} directions differ`);
    }
    return {
      id,
      name: record?.name ?? "missing",
      dropLevel: record?.drop_level ?? null,
      descriptionMatches: description === AUGMENTATION_DESCRIPTION,
      directionsMatch: directions === AUGMENTATION_DIRECTIONS,
    };
  });
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as {
    mechanicId?: string;
    semanticsVersion?: number;
    candidatePoolStatus?: string;
    conflictRuleStatus?: string;
    slotRuleStatus?: string;
    spawnWeightStatus?: string;
    generationWeightStatus?: string;
    selectionRuleStatus?: string;
    probabilityStatus?: string;
    step021?: string;
    provenance?: { description?: string; directions?: string };
  };
  if (artifact.mechanicId !== addRandomExplicitDefinition.id) {
    mismatches.push("artifact mechanic id differs");
  }
  if (
    artifact.semanticsVersion !== addRandomExplicitDefinition.semanticsVersion
  ) {
    mismatches.push("artifact semantics version differs");
  }
  if (artifact.provenance?.description !== AUGMENTATION_DESCRIPTION) {
    mismatches.push("artifact description differs");
  }
  if (artifact.provenance?.directions !== AUGMENTATION_DIRECTIONS) {
    mismatches.push("artifact directions differ");
  }
  const closure = addRandomExplicitDefinition.closure;
  const artifactStatuses: [string, string | undefined, string][] = [
    [
      "candidatePoolStatus",
      artifact.candidatePoolStatus,
      closure.candidatePoolStatus,
    ],
    [
      "conflictRuleStatus",
      artifact.conflictRuleStatus,
      closure.conflictRuleStatus,
    ],
    ["slotRuleStatus", artifact.slotRuleStatus, closure.slotRuleStatus],
    [
      "spawnWeightStatus",
      artifact.spawnWeightStatus,
      closure.spawnWeightStatus,
    ],
    [
      "generationWeightStatus",
      artifact.generationWeightStatus,
      closure.generationWeightStatus,
    ],
    [
      "selectionRuleStatus",
      artifact.selectionRuleStatus,
      closure.selectionRuleStatus,
    ],
    [
      "probabilityStatus",
      artifact.probabilityStatus,
      closure.probabilityStatus,
    ],
    ["step021", artifact.step021, "BLOCKED"],
  ];
  for (const [label, actual, expected] of artifactStatuses) {
    if (actual !== expected) {
      mismatches.push(
        `${label} is ${actual ?? "missing"}, expected ${expected}`,
      );
    }
  }
  const compatibility = JSON.parse(
    readFileSync(
      path.join(
        root,
        "docs",
        "data-snapshots",
        "crafting",
        "compatibility.json",
      ),
      "utf8",
    ),
  ) as { policyVersion?: number; snapshotChecksum?: string };
  const binding = (
    artifact as {
      binding?: {
        snapshotChecksum?: string;
        compatibilityPolicyVersion?: number;
        semanticsVersion?: number;
      };
    }
  ).binding;
  if (binding?.snapshotChecksum !== compatibility.snapshotChecksum) {
    mismatches.push(
      "artifact checksum does not match the compatibility report",
    );
  }
  if (binding?.compatibilityPolicyVersion !== compatibility.policyVersion) {
    mismatches.push(
      "artifact policy version does not match the compatibility report",
    );
  }
  if (
    binding?.semanticsVersion !== addRandomExplicitDefinition.semanticsVersion
  ) {
    mismatches.push("artifact binding semantics version differs");
  }

  const mods = JSON.parse(
    readFileSync(
      path.join(root, "var", "crafting-source", "data", "mods.json"),
      "utf8",
    ),
  ) as Record<
    string,
    {
      generation_type?: string;
      generation_weights?: unknown[];
      is_essence_only?: boolean;
    }
  >;
  let generationWeightRules = 0;
  let currencyMentions = 0;
  let essencePrefix = 0;
  let essenceSuffix = 0;
  const generationTypes = new Set<string>();
  for (const mod of Object.values(mods)) {
    generationTypes.add(mod.generation_type ?? "missing");
    generationWeightRules += mod.generation_weights?.length ?? 0;
    if (JSON.stringify(mod).includes(AUGMENTATION_RECORD_ID)) {
      currencyMentions += 1;
    }
    if (mod.is_essence_only === true && mod.generation_type === "prefix") {
      essencePrefix += 1;
    }
    if (mod.is_essence_only === true && mod.generation_type === "suffix") {
      essenceSuffix += 1;
    }
  }
  if (currencyMentions !== 0) {
    mismatches.push(
      `${currencyMentions} modifier records name ${AUGMENTATION_RECORD_ID}`,
    );
  }
  if (generationWeightRules !== 0) {
    mismatches.push(
      `${generationWeightRules} generation-weight rules appeared. The empty-list default is no longer the observed export, and no formula is proven.`,
    );
  }
  const currencyText = JSON.stringify(bases[AUGMENTATION_RECORD_ID] ?? {});
  for (const word of [
    "spawn",
    "weight",
    "prefix",
    "suffix",
    "group",
    "essence",
  ]) {
    if (currencyText.toLowerCase().includes(word)) {
      mismatches.push(`currency record text now contains "${word}"`);
    }
  }

  const pobClasses = path.join(
    process.env.APPDATA ?? "",
    "Path of Building Community (PoE2)",
    "Classes",
  );
  let pobCurrencyHits = 0;
  try {
    for (const fileName of readdirSync(pobClasses)) {
      if (!fileName.endsWith(".lua")) {
        continue;
      }
      const lua = readFileSync(path.join(pobClasses, fileName), "utf8");
      if (lua.includes(AUGMENTATION_RECORD_ID)) {
        pobCurrencyHits += 1;
        mismatches.push(`PoB ${fileName} names ${AUGMENTATION_RECORD_ID}`);
      }
    }
  } catch {
    mismatches.push("PoB Classes directory was not readable");
  }

  console.log(
    JSON.stringify(
      {
        mechanicId: addRandomExplicitDefinition.id,
        semanticsVersion: addRandomExplicitDefinition.semanticsVersion,
        candidatePoolStatus: closure.candidatePoolStatus,
        conflictRuleStatus: closure.conflictRuleStatus,
        slotRuleStatus: closure.slotRuleStatus,
        spawnWeightStatus: closure.spawnWeightStatus,
        generationWeightStatus: closure.generationWeightStatus,
        selectionRuleStatus: closure.selectionRuleStatus,
        probabilityStatus: closure.probabilityStatus,
        generationWeightRules,
        currencyMentions,
        essencePrefix,
        essenceSuffix,
        generationTypes: [...generationTypes].sort(),
        pobCurrencyHits,
        observed,
        mismatches,
      },
      null,
      2,
    ),
  );
  if (mismatches.length > 0) {
    process.exitCode = 1;
  }
}
