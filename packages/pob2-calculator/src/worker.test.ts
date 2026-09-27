import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  IsolatedPob2Worker,
  MAX_LOADED_BUILDS,
  MAX_WORKER_AGE_MS,
  assertIsolatedRuntimeDir,
  liveInstallPath,
  readRuntimeManifest,
  shouldRecycleWorker,
  workerEnvironment,
  type RuntimeManifest,
} from "./index.js";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function tempDir(): string {
  const directory = mkdtempSync(path.join(tmpdir(), "pob2-calc-"));
  directories.push(directory);
  return directory;
}

function manifestFor(directory: string): RuntimeManifest {
  return {
    pobVersion: "0.23.1",
    pobBranch: "master",
    pobPlatform: "win32",
    sourceCommit: null,
    platform: "win32",
    treeKey: "0_5",
    runtimeChecksum: "sha256:exe",
    workerChecksum: "sha256:worker",
    runtimeFingerprint: "sha256:" + "b".repeat(64),
    installationPath: directory,
    adapterVersion: 2,
    protocolVersion: 2,
    preparedAt: "2026-09-27T00:00:00.000Z",
  };
}

function reply(socket: net.Socket, body: unknown) {
  socket.write(`${JSON.stringify(body)}\n`);
}

function connectScript(
  port: number,
  onLine: (line: string, socket: net.Socket) => void,
): net.Socket {
  const socket = net.connect(port, "127.0.0.1");
  socket.setEncoding("utf8");
  let buffer = "";
  socket.on("data", (chunk: string) => {
    buffer += chunk;
    let newline = buffer.indexOf("\n");
    while (newline !== -1) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      onLine(line, socket);
      newline = buffer.indexOf("\n");
    }
  });
  return socket;
}

describe("worker policy", () => {
  it("recycles after the load limit or the age limit, and not for a health check", () => {
    expect(
      shouldRecycleWorker({
        startedAt: 1_000,
        loads: MAX_LOADED_BUILDS,
        action: "baseline",
        now: 2_000,
      }),
    ).toBe(true);
    expect(
      shouldRecycleWorker({
        startedAt: 1_000,
        loads: MAX_LOADED_BUILDS,
        action: "health",
        now: 2_000,
      }),
    ).toBe(false);
    expect(
      shouldRecycleWorker({
        startedAt: 1_000,
        loads: 1,
        action: "baseline",
        now: 1_000 + MAX_WORKER_AGE_MS + 1,
      }),
    ).toBe(true);
  });

  it("gives the child only the worker variables", () => {
    const previous = process.env.GGG_CLIENT_SECRET;
    process.env.GGG_CLIENT_SECRET = "do-not-inherit";
    try {
      const env = workerEnvironment(4321);
      expect(env.POB2_CALC_WORKER).toBe("1");
      expect(env.POB2_CALC_PORT).toBe("4321");
      expect(env).not.toHaveProperty("GGG_CLIENT_SECRET");
      expect(Object.keys(env).sort()).toEqual([
        "PATH",
        "POB2_CALC_PORT",
        "POB2_CALC_WORKER",
        "SystemRoot",
        "WINDIR",
      ]);
    } finally {
      if (previous === undefined) delete process.env.GGG_CLIENT_SECRET;
      else process.env.GGG_CLIENT_SECRET = previous;
    }
  });

  it("refuses the live install path", () => {
    const live = liveInstallPath();
    if (!live) return;
    expect(() => assertIsolatedRuntimeDir(live)).toThrow(/live PoB2 install/);
  });

  it("fails closed when the pinned copy does not match its manifest", () => {
    const directory = tempDir();
    mkdirSync(path.join(directory, "Modules"), { recursive: true });
    writeFileSync(path.join(directory, "Path of Building-PoE2.exe"), "exe");
    writeFileSync(
      path.join(directory, "Modules", "Pob2BuddyWorker.lua"),
      "worker",
    );
    writeFileSync(
      path.join(directory, "Modules", "Build.lua"),
      "-- POB2_CALC_WORKER_BEGIN\n",
    );
    const manifest = manifestFor(directory);
    manifest.runtimeChecksum = `sha256:${createHash("sha256").update("exe").digest("hex")}`;
    manifest.workerChecksum = `sha256:${createHash("sha256").update("worker").digest("hex")}`;
    writeFileSync(
      path.join(directory, "poe2-buddy-runtime.json"),
      JSON.stringify(manifest),
    );
    expect(readRuntimeManifest(directory).pobVersion).toBe("0.23.1");
    writeFileSync(path.join(directory, "Path of Building-PoE2.exe"), "changed");
    expect(() => readRuntimeManifest(directory)).toThrow(/checksum/);
  });
});

describe("fake worker socket", () => {
  it("returns one JSON line and restarts after an invalid line, a timeout, or a dropped socket", async () => {
    const directory = tempDir();
    const sockets: net.Socket[] = [];
    let mode: "ok" | "invalid" | "silent" | "drop" = "ok";
    const worker = new IsolatedPob2Worker(directory, manifestFor(directory), {
      fingerprint: () => "sha256:" + "b".repeat(64),
      spawn: (_exe, _cwd, _env, port) => {
        const socket = connectScript(port, (line, current) => {
          const request = JSON.parse(line) as { requestId: string };
          if (mode === "invalid") {
            current.write("not-json\n");
            return;
          }
          if (mode === "silent") return;
          if (mode === "drop") {
            current.destroy();
            return;
          }
          reply(current, { ok: true, requestId: request.requestId });
        });
        sockets.push(socket);
        return {
          pid: 1,
          kill() {
            socket.destroy();
          },
          onExit() {},
        };
      },
    });

    const first = await worker.request(
      { requestId: "a", action: "health" },
      1000,
    );
    expect(first).toEqual({ ok: true, requestId: "a" });

    mode = "invalid";
    await expect(
      worker.request({ requestId: "b", action: "baseline" }, 1000),
    ).rejects.toThrow("protocol-invalid");

    mode = "ok";
    const restarted = await worker.request(
      { requestId: "c", action: "health" },
      1000,
    );
    expect(restarted).toEqual({ ok: true, requestId: "c" });

    mode = "silent";
    await expect(
      worker.request({ requestId: "d", action: "baseline" }, 50),
    ).rejects.toThrow("timeout");

    mode = "drop";
    await expect(
      worker.request({ requestId: "e", action: "baseline" }, 1000),
    ).rejects.toThrow("worker-crashed");

    worker.discard();
    for (const socket of sockets) socket.destroy();
  });

  it("runs one build at a time and recycles after the load limit", async () => {
    const directory = tempDir();
    const seen: string[] = [];
    let releaseFirst: (() => void) | undefined;
    const firstHeld = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let spawnCount = 0;
    const worker = new IsolatedPob2Worker(directory, manifestFor(directory), {
      fingerprint: () => "sha256:" + "b".repeat(64),
      spawn: (_exe, _cwd, _env, port) => {
        spawnCount += 1;
        const socket = connectScript(port, (line, current) => {
          const request = JSON.parse(line) as {
            requestId: string;
            action: string;
          };
          seen.push(request.requestId);
          const send = () =>
            reply(current, { ok: true, requestId: request.requestId });
          if (request.requestId === "first") {
            void firstHeld.then(send);
            return;
          }
          send();
        });
        return {
          pid: spawnCount,
          kill() {
            socket.destroy();
          },
          onExit() {},
        };
      },
    });

    const first = worker.request(
      { requestId: "first", action: "baseline" },
      2000,
    );
    const started = Date.now();
    while (!seen.includes("first") && Date.now() - started < 1000) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const second = worker.request(
      { requestId: "second", action: "baseline" },
      2000,
    );
    expect(seen).toEqual(["first"]);
    releaseFirst?.();
    await expect(first).resolves.toMatchObject({ requestId: "first" });
    await expect(second).resolves.toMatchObject({ requestId: "second" });
    expect(seen).toEqual(["first", "second"]);

    worker.loads = MAX_LOADED_BUILDS;
    await worker.request({ requestId: "recycled", action: "baseline" }, 2000);
    expect(spawnCount).toBe(2);
    worker.discard();
  });

  it("hashes the runtime once per worker start and again after discard", async () => {
    const directory = tempDir();
    let fingerprints = 0;
    const worker = new IsolatedPob2Worker(directory, manifestFor(directory), {
      fingerprint: () => {
        fingerprints += 1;
        return "sha256:" + "b".repeat(64);
      },
      spawn: (_exe, _cwd, _env, port) => {
        const socket = connectScript(port, (line, current) => {
          const request = JSON.parse(line) as { requestId: string };
          reply(current, { ok: true, requestId: request.requestId });
        });
        return {
          pid: 1,
          kill() {
            socket.destroy();
          },
          onExit() {},
        };
      },
    });
    await worker.request({ requestId: "a", action: "health" }, 1000);
    await worker.request({ requestId: "b", action: "health" }, 1000);
    expect(fingerprints).toBe(1);
    worker.discard();
    await worker.request({ requestId: "c", action: "health" }, 1000);
    expect(fingerprints).toBe(2);
    worker.discard();
  });

  it("refuses to spawn when the runtime fingerprint does not match the manifest", async () => {
    const directory = tempDir();
    let spawned = false;
    const worker = new IsolatedPob2Worker(directory, manifestFor(directory), {
      fingerprint: () => "sha256:" + "c".repeat(64),
      spawn: () => {
        spawned = true;
        throw new Error("spawned");
      },
    });
    await expect(
      worker.request({ requestId: "a", action: "health" }, 1000),
    ).rejects.toThrow("runtime-integrity-mismatch");
    expect(spawned).toBe(false);
    expect(worker.runtimeFingerprint).toBeNull();
  });
});
