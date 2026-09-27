import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ADAPTER_VERSION = 2;
const PROTOCOL_VERSION = 2;
const APPROVED_POB_VERSION = "0.23.1";
const TREE_KEY = "0_5";

const appData = process.env.APPDATA;
const localAppData = process.env.LOCALAPPDATA;
if (!appData || !localAppData) {
  console.error(
    "APPDATA and LOCALAPPDATA are required to prepare the runtime.",
  );
  process.exit(1);
}

const liveInstall = path.resolve(appData, "Path of Building Community (PoE2)");
const source = path.resolve(process.env.POB2_SOURCE_DIR?.trim() || liveInstall);
const dest = path.resolve(
  process.env.POB2_CALCULATOR_DIR?.trim() ||
    path.join(localAppData, "poe2-buddy", "pob2-runtime"),
);

function sameDir(left, right) {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

if (sameDir(dest, source) || sameDir(dest, liveInstall)) {
  console.error(
    "Refusing to prepare a calculator runtime inside the live PoB2 install.",
  );
  process.exit(1);
}

const liveBuild = path.join(source, "Modules", "Build.lua");
const liveLaunch = path.join(source, "Launch.lua");
if (
  !existsSync(liveBuild) ||
  !existsSync(path.join(source, "Path of Building-PoE2.exe"))
) {
  console.error(`PoB2 source is not a complete install: ${source}`);
  process.exit(1);
}

function sha256(filePath) {
  return `sha256:${createHash("sha256").update(readFileSync(filePath)).digest("hex")}`;
}

const liveBuildBefore = sha256(liveBuild);
const liveLaunchBefore = sha256(liveLaunch);

mkdirSync(dest, { recursive: true });
const copied = spawnSync(
  "robocopy",
  [
    source,
    dest,
    "/E",
    "/R:1",
    "/W:1",
    "/NFL",
    "/NDL",
    "/NJH",
    "/NJS",
    "/nc",
    "/ns",
    "/np",
  ],
  { stdio: "inherit", windowsHide: true },
);
const copyCode = copied.status ?? 1;
if (copyCode >= 8) {
  console.error(`robocopy failed with exit code ${copyCode}.`);
  process.exit(1);
}

if (
  sha256(liveBuild) !== liveBuildBefore ||
  sha256(liveLaunch) !== liveLaunchBefore
) {
  console.error("The live PoB2 install changed while preparing the copy.");
  process.exit(1);
}

const workerSource = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../packages/pob2-calculator/runtime/Pob2BuddyWorker.lua",
);
copyFileSync(workerSource, path.join(dest, "Modules", "Pob2BuddyWorker.lua"));

const buildPath = path.join(dest, "Modules", "Build.lua");
let build = readFileSync(buildPath, "utf8");
const newline = build.includes("\r\n") ? "\r\n" : "\n";
const lateHook = [
  "\tself.abortSave = false",
  "\tself:SyncLoadouts()",
  "\t-- POB2_CALC_WORKER_BEGIN",
  '\tif os.getenv("POB2_CALC_WORKER") == "1" and not _G.POB2_CALC_WORKER_ENTERED then',
  "\t\t_G.POB2_CALC_WORKER_ENTERED = true",
  '\t\tlocal workerPath = GetScriptPath() .. "/Modules/Pob2BuddyWorker.lua"',
  "\t\tlocal worker, workerErr = loadfile(workerPath)",
  "\t\tif not worker then",
  '\t\t\tConPrintf("POB2 calculator worker failed to load: %s", tostring(workerErr))',
  "\t\telse",
  "\t\t\tworker(self)",
  "\t\tend",
  "\t\tExit()",
  "\tend",
].join(newline);
const lateAnchor = ["\tself.abortSave = false", "\tself:SyncLoadouts()"].join(
  newline,
);
if (build.includes(lateHook)) {
  build = build.replace(lateHook, lateAnchor);
}
const initSignature =
  "function buildMode:Init(dbFileName, buildName, buildXML, convertBuild, importLink)";
const earlyHook = [
  initSignature,
  "\t-- POB2_CALC_WORKER_BEGIN",
  '\tif os.getenv("POB2_CALC_WORKER") == "1" and not _G.POB2_CALC_WORKER_ENTERED then',
  "\t\t_G.POB2_CALC_WORKER_ENTERED = true",
  '\t\tlocal workerPath = GetScriptPath() .. "/Modules/Pob2BuddyWorker.lua"',
  "\t\tlocal worker, workerErr = loadfile(workerPath)",
  "\t\tif not worker then",
  '\t\t\tConPrintf("POB2 calculator worker failed to load: %s", tostring(workerErr))',
  "\t\telse",
  "\t\t\tworker(self)",
  "\t\tend",
  "\t\tExit()",
  "\t\treturn",
  "\tend",
].join(newline);
if (!build.includes(earlyHook)) {
  if (!build.includes(initSignature)) {
    console.error(
      "The isolated Build.lua is missing the worker bootstrap anchor.",
    );
    process.exit(1);
  }
  build = build.replace(initSignature, earlyHook);
}
writeFileSync(buildPath, build);

const launchPath = path.join(dest, "Launch.lua");
let launch = readFileSync(launchPath, "utf8");
if (!launch.includes("POB2_CALC_WORKER_DEVMODE")) {
  const devAnchor = [
    "\tif localManXML and not self.versionBranch and not self.versionPlatform then",
    "\t\t-- Looks like a remote manifest, so we're probably running from a repository",
    "\t\t-- Enable dev mode to disable updates and set user path to be the script path",
    "\t\tself.devMode = true",
    "\tend",
  ].join(newline);
  if (!launch.includes(devAnchor)) {
    console.error("The isolated Launch.lua is missing the dev-mode anchor.");
    process.exit(1);
  }
  const devInsertion = [
    devAnchor,
    '\tif os.getenv("POB2_CALC_WORKER") == "1" then',
    "\t\t-- POB2_CALC_WORKER_DEVMODE",
    "\t\tself.devMode = true",
    "\tend",
  ].join(newline);
  launch = launch.replace(devAnchor, devInsertion);
  writeFileSync(launchPath, launch);
}

const manifestXml = readFileSync(path.join(dest, "manifest.xml"), "utf8");
const versionTag = manifestXml.match(/<Version\b[^>]*\/>/);
function attribute(name) {
  return versionTag?.[0].match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? "";
}
const pobVersion = attribute("number");
if (pobVersion !== APPROVED_POB_VERSION) {
  console.error(
    `This copy is PoB ${pobVersion || "unknown"}. The approved worker pin is ${APPROVED_POB_VERSION}.`,
  );
  process.exit(1);
}

function fingerprintRuntime(directory) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const cli = path.resolve(
    scriptDir,
    "../packages/pob2-calculator/src/fingerprint-cli.ts",
  );
  const tsxCli = path.resolve(scriptDir, "../node_modules/tsx/dist/cli.mjs");
  const printed = spawnSync(process.execPath, [tsxCli, cli, directory], {
    encoding: "utf8",
    windowsHide: true,
  });
  const fingerprint = (printed.stdout ?? "").trim();
  if (printed.status !== 0 || !/^sha256:[a-f0-9]{64}$/.test(fingerprint)) {
    console.error(printed.stderr || "Runtime fingerprint failed.");
    process.exit(1);
  }
  return fingerprint;
}

const runtimeManifest = {
  pobVersion,
  pobBranch: attribute("branch") || null,
  pobPlatform: attribute("platform") || null,
  sourceCommit: null,
  platform: "win32",
  treeKey: TREE_KEY,
  runtimeChecksum: sha256(path.join(dest, "Path of Building-PoE2.exe")),
  workerChecksum: sha256(path.join(dest, "Modules", "Pob2BuddyWorker.lua")),
  runtimeFingerprint: fingerprintRuntime(dest),
  installationPath: dest,
  adapterVersion: ADAPTER_VERSION,
  protocolVersion: PROTOCOL_VERSION,
  preparedAt: new Date().toISOString(),
};
writeFileSync(
  path.join(dest, "poe2-buddy-runtime.json"),
  `${JSON.stringify(runtimeManifest, null, 2)}\n`,
);

if (
  sha256(liveBuild) !== liveBuildBefore ||
  sha256(liveLaunch) !== liveLaunchBefore
) {
  console.error("The live PoB2 install changed during preparation.");
  process.exit(1);
}

console.log(`Prepared isolated PoB2 runtime at ${dest}`);
console.log(`PoB ${runtimeManifest.pobVersion} tree ${TREE_KEY}`);
console.log("Auto-update is disabled only when POB2_CALC_WORKER=1.");
