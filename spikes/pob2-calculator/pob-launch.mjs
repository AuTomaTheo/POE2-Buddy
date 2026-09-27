import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const spikeDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(spikeDir, "../..");

export const pobDir =
  process.env.POB2_DIR ??
  "C:\\Users\\Nitro5\\AppData\\Roaming\\Path of Building Community (PoE2)";
export const pobExe = path.join(pobDir, "Path of Building-PoE2.exe");
export const buildLuaPath = path.join(pobDir, "Modules", "Build.lua");
export const settingsPath = path.join(
  process.env.USERPROFILE ?? "",
  "Documents",
  "Path of Building (PoE2)",
  "Settings.xml",
);
export const fixtureDir = path.join(
  repoRoot,
  "packages",
  "data-sources",
  "src",
  "pob2",
  "fixtures",
  "real",
);

export function decodeXml(code) {
  const normalized = code.trim().replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  return inflateSync(Buffer.from(padded, "base64")).toString("utf8");
}

export function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function spawnSyncPowershell(command) {
  return (
    spawnSync("powershell", ["-NoProfile", "-Command", command], {
      encoding: "utf8",
    }).stdout ?? ""
  );
}

export function listPobProcesses() {
  if (process.platform !== "win32") return [];
  const result = spawnSyncPowershell(
    "Get-CimInstance Win32_Process | Where-Object { $_.Name -like '*Path of Building*' } | ForEach-Object { $_.ProcessId.ToString() + ' ' + $_.Name }",
  );
  return result
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function insertHook(source) {
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const anchor = [
    "\tself.abortSave = false",
    "\tself:SyncLoadouts()",
    "end",
    "",
    "function buildMode:SyncLoadouts()",
  ].join(newline);
  if (!source.includes(anchor)) {
    throw new Error(
      "Build.lua anchor was not found. The spike hook was not inserted.",
    );
  }
  if (source.includes("POB2_SPIKE_HOOK_BEGIN")) {
    throw new Error("Build.lua already contains a spike hook.");
  }
  const hook = [
    "\tself.abortSave = false",
    "\tself:SyncLoadouts()",
    "\t-- POB2_SPIKE_HOOK_BEGIN",
    '\tif os.getenv("POB2_SPIKE_SCRIPT") and not _G.POB2_SPIKE_ENTERED then',
    "\t\t_G.POB2_SPIKE_ENTERED = true",
    '\t\tlocal scriptPath = os.getenv("POB2_SPIKE_SCRIPT")',
    "\t\tlocal chunk, loadErr = loadfile(scriptPath)",
    '\t\tlocal spikeOut = os.getenv("POB2_SPIKE_OUT")',
    "\t\tlocal function writeSpikeError(message)",
    '\t\t\tlocal handle = io.open(spikeOut, "w")',
    "\t\t\tif handle then",
    '\t\t\t\tlocal escaped = tostring(message):gsub("\\\\", "\\\\\\\\"):gsub("\\"", "\\\\\\""):gsub("\\r", "\\\\r"):gsub("\\n", "\\\\n")',
    '\t\t\t\thandle:write("{\\"ok\\":false,\\"error\\":\\"" .. escaped .. "\\"}")',
    "\t\t\t\thandle:close()",
    "\t\t\tend",
    "\t\tend",
    "\t\tif not chunk then",
    "\t\t\twriteSpikeError(loadErr)",
    "\t\telse",
    "\t\t\tlocal callOk, callErr = pcall(chunk, self)",
    "\t\t\tif not callOk then",
    "\t\t\t\twriteSpikeError(callErr)",
    "\t\t\tend",
    "\t\tend",
    '\t\tif os.getenv("POB2_SPIKE_HOLD") ~= "1" then',
    "\t\t\tExit()",
    "\t\tend",
    "\tend",
    "\t-- POB2_SPIKE_HOOK_END",
    "end",
    "",
    "function buildMode:SyncLoadouts()",
  ].join(newline);
  return source.replace(anchor, hook);
}

export function writeFixtures(workDir, caseIds) {
  for (const caseId of caseIds) {
    const code = readFileSync(
      path.join(fixtureDir, `${caseId}.code.txt`),
      "utf8",
    );
    writeFileSync(path.join(workDir, `${caseId}.xml`), decodeXml(code), "utf8");
  }
}

export function beginSession(workDir) {
  if (!existsSync(pobExe)) {
    throw new Error(`PoB2 executable was not found at ${pobExe}`);
  }
  mkdirSync(workDir, { recursive: true });
  const originalBuild = readFileSync(buildLuaPath);
  const originalSettings = existsSync(settingsPath)
    ? readFileSync(settingsPath)
    : null;
  const backupBuild = path.join(workDir, "Build.lua.bak");
  writeFileSync(backupBuild, originalBuild);
  writeFileSync(
    buildLuaPath,
    insertHook(originalBuild.toString("utf8")),
    "utf8",
  );
  return { originalBuild, originalSettings, backupBuild };
}

export function endSession(session) {
  writeFileSync(buildLuaPath, session.originalBuild);
  if (session.originalSettings) {
    writeFileSync(settingsPath, session.originalSettings);
  }
  const restored = readFileSync(buildLuaPath);
  if (!restored.equals(session.originalBuild)) {
    copyFileSync(session.backupBuild, buildLuaPath);
  }
  if (readFileSync(buildLuaPath, "utf8").includes("POB2_SPIKE_HOOK_BEGIN")) {
    throw new Error("The spike hook is still present in Build.lua.");
  }
}

export function stopChild(child) {
  if (child && child.exitCode === null && !child.killed) {
    spawnSyncPowershell(`taskkill /PID ${child.pid} /T /F`);
  }
}

export function spawnPob(env) {
  return spawn(pobExe, [], {
    cwd: pobDir,
    env: { ...process.env, ...env },
    stdio: "ignore",
    windowsHide: false,
  });
}

export function waitForJson(filePath, child, timeoutMs) {
  const started = Date.now();
  const errorPath = filePath.replace(/[^\\/]+$/, "ui-error.json");
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (existsSync(errorPath) && errorPath !== filePath) {
        const text = readFileSync(errorPath, "utf8");
        try {
          const parsed = JSON.parse(text);
          clearInterval(timer);
          reject(new Error(parsed.error || text));
          return;
        } catch {
          // The error file is still being written.
        }
      }
      if (existsSync(filePath)) {
        const text = readFileSync(filePath, "utf8");
        try {
          const parsed = JSON.parse(text);
          clearInterval(timer);
          resolve(parsed);
          return;
        } catch {
          // The file is still being written.
        }
      }
      if (child.exitCode !== null && !existsSync(filePath)) {
        clearInterval(timer);
        reject(
          new Error(
            `PoB2 exited (${child.exitCode}) before writing ${filePath}.`,
          ),
        );
        return;
      }
      if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        reject(new Error(`Timed out waiting for ${filePath}.`));
      }
    }, 250);
  });
}

export function removeWorkDir(workDir) {
  rmSync(workDir, { recursive: true, force: true });
}
