import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  beginSession,
  endSession,
  listPobProcesses,
  removeWorkDir,
  spawnPob,
  stopChild,
  waitForJson,
  writeFixtures,
} from "./pob-launch.mjs";

const spikeDir = path.dirname(fileURLToPath(import.meta.url));
const tools = path.join(spikeDir, "window-tools.ps1");

function windowTool(args) {
  const result = spawnSync(
    "powershell",
    ["-NoProfile", "-File", tools, ...args],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(
      result.stderr || result.stdout || `window tool failed: ${args.join(" ")}`,
    );
  }
  return (result.stdout ?? "").trim();
}

async function main() {
  const before = listPobProcesses();
  const workDir = path.join(os.tmpdir(), `pob2-ui-${Date.now()}`);
  const session = beginSession(workDir);
  const shotDir = path.join(spikeDir, "results", "ui");
  mkdirSync(shotDir, { recursive: true });
  let child = null;
  const notes = { existingPobProcesses: before };
  try {
    writeFixtures(workDir, ["B"]);
    child = spawnPob({
      POB2_SPIKE_SCRIPT: path.join(spikeDir, "ui-session.lua"),
      POB2_SPIKE_OUT: path.join(workDir, "ui-error.json"),
      POB2_SPIKE_DIR: workDir,
      POB2_SPIKE_HOLD: "1",
      POB2_SPIKE_CASE: "B",
    });
    notes.pid = child.pid;
    const base = await waitForJson(
      path.join(workDir, "ui-base.json"),
      child,
      180000,
    );
    notes.base = base;
    notes.baselineCapture = windowTool([
      "-Action",
      "capture",
      "-ProcessId",
      String(child.pid),
      "-OutPath",
      path.join(shotDir, "baseline-full.png"),
      "-CropPath",
      path.join(shotDir, "baseline-sidebar.png"),
    ]);
    const click = base.click ?? {};
    if (click.onScreen) {
      try {
        notes.allocateClick = windowTool([
          "-Action",
          "click",
          "-ProcessId",
          String(child.pid),
          "-ClientX",
          String(click.clientX),
          "-ClientY",
          String(click.clientY),
          "-ScreenW",
          String(click.screenW),
          "-ScreenH",
          String(click.screenH),
          "-Button",
          "left",
        ]);
        notes.allocated = await waitForJson(
          path.join(workDir, "ui-alloc.json"),
          child,
          8000,
        );
      } catch (error) {
        notes.allocateClickError =
          error instanceof Error ? error.message : String(error);
        writeFileSync(path.join(workDir, "force-alloc.flag"), "1");
        notes.allocated = await waitForJson(
          path.join(workDir, "ui-alloc.json"),
          child,
          15000,
        );
      }
    } else {
      notes.allocateClick = "node was not on screen; AllocNode fallback";
      writeFileSync(path.join(workDir, "force-alloc.flag"), "1");
      notes.allocated = await waitForJson(
        path.join(workDir, "ui-alloc.json"),
        child,
        20000,
      );
    }
    notes.allocatedCapture = windowTool([
      "-Action",
      "capture",
      "-ProcessId",
      String(child.pid),
      "-OutPath",
      path.join(shotDir, "allocated-full.png"),
      "-CropPath",
      path.join(shotDir, "allocated-sidebar.png"),
    ]);
    if (click.onScreen && notes.allocated.method === "click") {
      try {
        notes.revertClick = windowTool([
          "-Action",
          "click",
          "-ProcessId",
          String(child.pid),
          "-ClientX",
          String(click.clientX),
          "-ClientY",
          String(click.clientY),
          "-ScreenW",
          String(click.screenW),
          "-ScreenH",
          String(click.screenH),
          "-Button",
          "left",
        ]);
        notes.reverted = await waitForJson(
          path.join(workDir, "ui-revert.json"),
          child,
          8000,
        );
      } catch (error) {
        notes.revertClickError =
          error instanceof Error ? error.message : String(error);
        writeFileSync(path.join(workDir, "force-revert.flag"), "1");
        notes.reverted = await waitForJson(
          path.join(workDir, "ui-revert.json"),
          child,
          15000,
        );
      }
    } else {
      notes.revertClick = "DeallocNode fallback";
      writeFileSync(path.join(workDir, "force-revert.flag"), "1");
      notes.reverted = await waitForJson(
        path.join(workDir, "ui-revert.json"),
        child,
        20000,
      );
    }
    notes.revertedCapture = windowTool([
      "-Action",
      "capture",
      "-ProcessId",
      String(child.pid),
      "-OutPath",
      path.join(shotDir, "reverted-full.png"),
      "-CropPath",
      path.join(shotDir, "reverted-sidebar.png"),
    ]);
    writeFileSync(
      path.join(shotDir, "ui-session.json"),
      `${JSON.stringify(notes, null, 2)}\n`,
      "utf8",
    );
    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        pid: child.pid,
        allocateMethod: notes.allocated.method,
        revertMethod: notes.reverted.method,
      })}\n`,
    );
  } finally {
    writeFileSync(
      path.join(shotDir, "ui-session.json"),
      `${JSON.stringify(notes, null, 2)}\n`,
      "utf8",
    );
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
