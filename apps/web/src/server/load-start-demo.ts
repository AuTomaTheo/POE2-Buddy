import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AnalysisInput } from "./analyze-passive-build";
import { findStartDemo } from "../app/start/demos";

const demoDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../packages/data-sources/src/pob2/fixtures/real",
);

const POB_FILES: Record<string, string> = {
  "fireball-witch": "A.code.txt",
  "gear-parsing": "F.code.txt",
  "upgrade-comparison": "F.code.txt",
};

const FIXTURE_IDS: Record<string, string> = {
  "passive-recommendation": "witch-offensive.json",
  "defensive-warrior": "warrior-defensive.json",
};

export function analysisInputForDemo(
  demoId: string,
): Pick<
  AnalysisInput,
  "importSource" | "fixtureId" | "fixtureJson" | "pob2Code"
> | null {
  const demo = findStartDemo(demoId);
  if (!demo || demo.kind === "page") return null;
  if (demo.kind === "fixture") {
    const fixtureId = FIXTURE_IDS[demo.id];
    if (!fixtureId) return null;
    return {
      importSource: "fixture",
      fixtureId,
      fixtureJson: "",
      pob2Code: "",
    };
  }
  const fileName = POB_FILES[demo.id];
  if (
    !fileName ||
    fileName.includes("..") ||
    fileName.includes("/") ||
    fileName.includes("\\")
  ) {
    return null;
  }
  const pob2Code = readFileSync(
    path.join(demoDirectory, fileName),
    "utf8",
  ).trim();
  if (pob2Code.length === 0) return null;
  return {
    importSource: "pob2",
    fixtureId: "",
    fixtureJson: "",
    pob2Code,
  };
}
