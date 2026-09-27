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
const pobDir =
  process.env.POB2_DIR ??
  "C:\\Users\\Nitro5\\AppData\\Roaming\\Path of Building Community (PoE2)";
const exe = path.join(pobDir, "Path of Building-PoE2.exe");
const buildLua = path.join(pobDir, "Modules", "Build.lua");
const settingsPath = path.join(
  process.env.USERPROFILE ?? "",
  "Documents",
  "Path of Building (PoE2)",
  "Settings.xml",
);
const fixtureDir = path.join(
  repoRoot,
  "packages",
  "data-sources",
  "src",
  "pob2",
  "fixtures",
  "real",
);
const cases = ["B", "C", "E", "F"];

function decodeXml(code) {
  const normalized = code.trim().replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  return inflateSync(Buffer.from(padded, "base64")).toString("utf8");
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function listPobProcesses() {
  if (process.platform !== "win32") return [];
  const result = spawnSyncPowershell(
    "Get-CimInstance Win32_Process | Where-Object { $_.Name -like '*Path of Building*' } | ForEach-Object { $_.ProcessId.ToString() + ' ' + $_.Name }",
  );
  return result
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function spawnSyncPowershell(command) {
  return (
    spawnSync("powershell", ["-NoProfile", "-Command", command], {
      encoding: "utf8",
    }).stdout ?? ""
  );
}

function insertHook(source) {
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
    "\t\tExit()",
    "\tend",
    "\t-- POB2_SPIKE_HOOK_END",
    "end",
    "",
    "function buildMode:SyncLoadouts()",
  ].join(newline);
  return source.replace(anchor, hook);
}

async function main() {
  if (!existsSync(exe)) {
    throw new Error(`PoB2 executable was not found at ${exe}`);
  }
  const before = listPobProcesses();
  const workDir = path.join(os.tmpdir(), `pob2-spike-${Date.now()}`);
  mkdirSync(workDir, { recursive: true });
  const originalBuild = readFileSync(buildLua);
  const originalSettings = existsSync(settingsPath)
    ? readFileSync(settingsPath)
    : null;
  const backupBuild = path.join(workDir, "Build.lua.bak");
  writeFileSync(backupBuild, originalBuild);
  let child = null;
  try {
    for (const caseId of cases) {
      const code = readFileSync(
        path.join(fixtureDir, `${caseId}.code.txt`),
        "utf8",
      );
      writeFileSync(
        path.join(workDir, `${caseId}.xml`),
        decodeXml(code),
        "utf8",
      );
    }
    const hooked = insertHook(originalBuild.toString("utf8"));
    writeFileSync(buildLua, hooked, "utf8");
    const outFile = path.join(workDir, "report.json");
    const started = Date.now();
    child = spawn(exe, [], {
      cwd: pobDir,
      env: {
        ...process.env,
        POB2_SPIKE_SCRIPT: path.join(spikeDir, "probe.lua"),
        POB2_SPIKE_OUT: outFile,
        POB2_SPIKE_DIR: workDir,
      },
      stdio: "ignore",
      windowsHide: true,
    });
    const pid = child.pid;
    const reportText = await waitForFile(outFile, child, 180000);
    const elapsedMs = Date.now() - started;
    const report = JSON.parse(reportText);
    report.runner = {
      coldProcessMs: elapsedMs,
      pid,
      platform: process.platform,
      osRelease: os.release(),
      cpu: os.cpus()[0]?.model ?? null,
      cpuCount: os.cpus().length,
      totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024)),
      existingPobProcesses: before,
      pobDir,
      buildLuaSha256Before: sha256(originalBuild),
    };
    const resultDir = path.join(spikeDir, "results");
    mkdirSync(resultDir, { recursive: true });
    writeFileSync(
      path.join(resultDir, "spike-report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
    process.stdout.write(
      `${JSON.stringify({ ok: report.ok, coldProcessMs: elapsedMs, pid })}\n`,
    );
  } finally {
    if (child && child.exitCode === null && !child.killed) {
      spawnSyncPowershell(`taskkill /PID ${child.pid} /T /F`);
    }
    writeFileSync(buildLua, originalBuild);
    if (originalSettings) writeFileSync(settingsPath, originalSettings);
    const restored = readFileSync(buildLua);
    if (!restored.equals(originalBuild)) {
      copyFileSync(backupBuild, buildLua);
    }
    if (readFileSync(buildLua, "utf8").includes("POB2_SPIKE_HOOK_BEGIN")) {
      throw new Error("The spike hook is still present in Build.lua.");
    }
    rmSync(workDir, { recursive: true, force: true });
  }
}

function waitForFile(filePath, child, timeoutMs) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (existsSync(filePath)) {
        const text = readFileSync(filePath, "utf8");
        try {
          JSON.parse(text);
          clearInterval(timer);
          resolve(text);
          return;
        } catch {
          // The report is still being written.
        }
      }
      if (child.exitCode !== null && !existsSync(filePath)) {
        clearInterval(timer);
        reject(
          new Error(`PoB2 exited (${child.exitCode}) before writing a report.`),
        );
        return;
      }
      if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        reject(new Error("PoB2 spike timed out."));
      }
    }, 250);
  });
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
