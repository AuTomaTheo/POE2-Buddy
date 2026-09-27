import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { fingerprintIncludes, runtimeFingerprint } from "./fingerprint.js";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function tempRuntime(): string {
  const directory = mkdtempSync(path.join(tmpdir(), "pob2-fingerprint-"));
  directories.push(directory);
  mkdirSync(path.join(directory, "Modules"));
  mkdirSync(path.join(directory, "TreeData"));
  writeFileSync(path.join(directory, "Launch.lua"), "launch");
  writeFileSync(path.join(directory, "manifest.xml"), "<PoBVersion/>");
  writeFileSync(path.join(directory, "Modules", "Calc.lua"), "calc");
  writeFileSync(path.join(directory, "TreeData", "tree.lua"), "tree");
  writeFileSync(path.join(directory, "calculator-diagnostics.log"), "log");
  return directory;
}

describe("runtime fingerprint", () => {
  it("stays stable, changes with calculation files, and ignores logs", () => {
    const directory = tempRuntime();
    const first = runtimeFingerprint(directory);
    const second = runtimeFingerprint(directory);
    expect(first).toBe(second);
    expect(first.startsWith("sha256:")).toBe(true);

    writeFileSync(
      path.join(directory, "calculator-diagnostics.log"),
      "changed",
    );
    expect(runtimeFingerprint(directory)).toBe(first);

    writeFileSync(path.join(directory, "Modules", "Calc.lua"), "changed");
    const afterLua = runtimeFingerprint(directory);
    expect(afterLua).not.toBe(first);

    writeFileSync(path.join(directory, "TreeData", "tree.lua"), "changed-tree");
    expect(runtimeFingerprint(directory)).not.toBe(afterLua);
  });

  it("documents which paths belong in the fingerprint", () => {
    expect(fingerprintIncludes("Modules/Build.lua")).toBe(true);
    expect(fingerprintIncludes("Data/Skills/game.lua")).toBe(true);
    expect(fingerprintIncludes("TreeData/0_5/tree.lua")).toBe(true);
    expect(fingerprintIncludes("lua51.dll")).toBe(true);
    expect(fingerprintIncludes("calculator-diagnostics.log")).toBe(false);
    expect(fingerprintIncludes("Builds/character.xml")).toBe(false);
    expect(fingerprintIncludes("poe2-buddy-runtime.json")).toBe(false);
    expect(fingerprintIncludes("Settings.xml")).toBe(false);
    expect(fingerprintIncludes("Assets/icon.png")).toBe(false);
  });
});
