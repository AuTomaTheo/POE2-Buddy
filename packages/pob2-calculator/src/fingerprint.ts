import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Semantic identity of a prepared PoB2 copy.
 *
 * Included: the executable, top-level engine DLLs, manifest.xml, Launch.lua,
 * GameVersions.lua, and the Modules, Classes, Data, TreeData, and lua trees.
 * Paths are relative, use "/", and are sorted by UTF-16 code unit.
 * Each file is SHA-256 of its raw bytes. The aggregate is SHA-256 of
 * `path\\0hex\\n` lines in that order.
 *
 * Excluded: Assets, Builds, Update, SimpleGraphic, updater executables,
 * Settings.xml, imgui.ini, logs, and poe2-buddy-runtime.json. Those are
 * graphics, saved state, or the manifest that records this fingerprint.
 * Buddy's worker protocol is localhost-only. Known PoB auto-update is disabled
 * on the copy. OS-level outbound access is not blocked.
 */
const INCLUDED_ROOT_FILES = new Set([
  "Path of Building-PoE2.exe",
  "manifest.xml",
  "Launch.lua",
  "GameVersions.lua",
]);

const INCLUDED_DIRECTORIES = new Set([
  "Modules",
  "Classes",
  "Data",
  "TreeData",
  "lua",
]);

export const FINGERPRINT_INCLUDED_DIRECTORIES = [
  ...INCLUDED_DIRECTORIES,
] as const;

export function fingerprintIncludes(relativePosixPath: string): boolean {
  if (
    relativePosixPath.endsWith(".log") ||
    relativePosixPath === "Settings.xml" ||
    relativePosixPath.endsWith("/Settings.xml") ||
    relativePosixPath === "poe2-buddy-runtime.json" ||
    relativePosixPath === "calculator-diagnostics.log" ||
    relativePosixPath === "calculator-performance.json"
  ) {
    return false;
  }
  if (INCLUDED_ROOT_FILES.has(relativePosixPath)) return true;
  const top = relativePosixPath.split("/")[0] ?? "";
  if (INCLUDED_DIRECTORIES.has(top)) return true;
  return top.endsWith(".dll");
}

function collectFiles(
  directory: string,
  prefix: string,
  found: string[],
): void {
  for (const name of readdirSync(directory)) {
    const absolute = path.join(directory, name);
    const relative = prefix.length === 0 ? name : `${prefix}/${name}`;
    const info = statSync(absolute);
    if (info.isDirectory()) {
      if (prefix.length === 0 && !INCLUDED_DIRECTORIES.has(name)) continue;
      collectFiles(absolute, relative, found);
      continue;
    }
    if (fingerprintIncludes(relative)) found.push(relative);
  }
}

export function runtimeFingerprint(runtimeDir: string): string {
  const files: string[] = [];
  collectFiles(runtimeDir, "", files);
  files.sort();
  const aggregate = createHash("sha256");
  for (const relative of files) {
    const bytes = readFileSync(path.join(runtimeDir, ...relative.split("/")));
    const fileHash = createHash("sha256").update(bytes).digest("hex");
    aggregate.update(`${relative}\0${fileHash}\n`);
  }
  return `sha256:${aggregate.digest("hex")}`;
}
