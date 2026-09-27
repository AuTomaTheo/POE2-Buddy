import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  beginSession,
  endSession,
  fixtureDir,
  listPobProcesses,
  pobDir,
  removeWorkDir,
  sha256,
  spawnPob,
  stopChild,
  waitForJson,
  writeFixtures,
} from "./pob-launch.mjs";

const spikeDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(spikeDir, "../..");
const treePath = path.join(
  repoRoot,
  "docs",
  "data-snapshots",
  "passive-tree",
  "data.json",
);

function buddyNodes(ids) {
  const data = JSON.parse(readFileSync(treePath, "utf8"));
  return ids.map((id) => {
    const node = data.nodes?.[String(id)];
    if (!node) return { skill: id, present: false };
    return {
      skill: node.skill,
      name: node.name,
      isNotable: node.isNotable === true,
      isKeystone: node.isKeystone === true,
      isJewelSocket: node.isJewelSocket === true,
      ascendancyId: node.ascendancyId ?? null,
      classStartIndex: node.classStartIndex ?? null,
    };
  });
}

async function main() {
  const before = listPobProcesses();
  const workDir = path.join(os.tmpdir(), `pob2-closure-${Date.now()}`);
  const session = beginSession(workDir);
  let child = null;
  try {
    writeFixtures(workDir, ["B", "C", "D"]);
    const outFile = path.join(workDir, "closure.json");
    const started = Date.now();
    child = spawnPob({
      POB2_SPIKE_SCRIPT: path.join(spikeDir, "closure-probe.lua"),
      POB2_SPIKE_OUT: outFile,
      POB2_SPIKE_DIR: workDir,
    });
    const report = await waitForJson(outFile, child, 180000);
    report.runner = {
      coldProcessMs: Date.now() - started,
      pid: child.pid,
      existingPobProcesses: before,
      pobDir,
      buildLuaSha256Before: sha256(session.originalBuild),
    };
    report.buddy = {
      nodes: buddyNodes([54447, 4739, 1755, 22419, 6686, 17788, 2254, 32699]),
      fixtureD: JSON.parse(
        readFileSync(path.join(fixtureDir, "D.truth.json"), "utf8"),
      ),
    };
    const resultDir = path.join(spikeDir, "results");
    mkdirSync(resultDir, { recursive: true });
    writeFileSync(
      path.join(resultDir, "closure-report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
    process.stdout.write(
      `${JSON.stringify({ ok: report.ok, pid: child.pid, error: report.error ?? null })}\n`,
    );
  } finally {
    stopChild(child);
    endSession(session);
    removeWorkDir(workDir);
  }
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
