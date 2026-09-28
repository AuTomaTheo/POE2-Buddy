import path from "node:path";
import {
  loadPlannerInputs,
  planCraftTargets,
} from "@poe2-helper/crafting-planner";

const args = process.argv.slice(2);

function valueAfter(flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

function valuesAfter(flag: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === flag && args[index + 1]) {
      values.push(args[index + 1] ?? "");
    }
  }
  return values;
}

function flagOrPair(flag: string, key: string): string | undefined {
  return valueAfter(flag) ?? pair(key);
}

function pair(key: string): string | undefined {
  const prefix = `${key}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found?.slice(prefix.length);
}

function pairs(key: string): string[] {
  const prefix = `${key}=`;
  return args
    .filter((arg) => arg.startsWith(prefix))
    .map((arg) => arg.slice(prefix.length))
    .filter((value) => value.length > 0);
}

const baseId = flagOrPair("--base", "base");
const baseName = flagOrPair("--name", "name");
const itemClass = flagOrPair("--class", "class");
const itemLevel = Number(flagOrPair("--ilvl", "ilvl"));
const stats = [...valuesAfter("--stat"), ...pairs("stat")];
const modifiers = [...valuesAfter("--modifier"), ...pairs("modifier")];

if (
  (!baseId && !(baseName && itemClass)) ||
  !Number.isInteger(itemLevel) ||
  (stats.length === 0 && modifiers.length === 0)
) {
  console.error(
    "Usage: npm run crafting:plan -- --base <id> --ilvl <n> --stat <stat-id>",
  );
  console.error(
    "PowerShell can drop --flags when calling npm. This also accepts base=<id> ilvl=<n> stat=<stat-id>.",
  );
  process.exitCode = 1;
} else {
  const root = process.cwd();
  const loaded = loadPlannerInputs(
    path.join(root, "var", "crafting-data", "snapshot.json"),
    path.join(root, "docs", "data-snapshots", "crafting", "compatibility.json"),
  );
  if (!loaded.ok) {
    console.error(`${loaded.code}: ${loaded.message}`);
    process.exitCode = 1;
  } else {
    const plan = planCraftTargets(loaded.snapshot, loaded.report, {
      base: baseId
        ? { id: baseId }
        : { name: baseName ?? "", itemClass: itemClass ?? "" },
      itemLevel,
      targets: [
        ...stats.map((statId) => ({ kind: "stat" as const, statId })),
        ...modifiers.map((modifierId) => ({
          kind: "modifier" as const,
          modifierId,
        })),
      ],
    });
    if (!plan.ok) {
      console.error(`${plan.code}: ${plan.message}`);
      process.exitCode = 1;
    } else {
      const eligible = plan.candidates.filter(
        (candidate) => candidate.eligibility === "eligible",
      );
      console.log(
        JSON.stringify(
          {
            status: plan.status,
            base: plan.base,
            itemLevel: plan.itemLevel,
            combinationFeasibility: plan.combinationFeasibility,
            warnings: plan.warnings,
            targets: plan.targets.map((target) => ({
              id: target.id,
              resolution: target.resolution,
              coverage: target.coverage,
            })),
            eligibleModifierIds: eligible.map(
              (candidate) => candidate.modifierId,
            ),
            provenance: plan.provenance,
          },
          null,
          2,
        ),
      );
    }
  }
}
