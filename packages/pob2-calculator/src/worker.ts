import { createHash } from "node:crypto";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { z } from "zod";
import {
  CALCULATOR_ADAPTER_VERSION,
  CALCULATOR_PROTOCOL_VERSION,
} from "./metrics.js";
import { runtimeFingerprint } from "./fingerprint.js";

export const MAX_LOADED_BUILDS = 20;
export const MAX_WORKER_AGE_MS = 30 * 60 * 1000;
export const WORKER_STARTUP_TIMEOUT_MS = 45_000;

const manifestSchema = z
  .object({
    pobVersion: z.string().min(1),
    pobBranch: z.string().min(1).nullable(),
    pobPlatform: z.string().min(1).nullable(),
    sourceCommit: z.string().min(1).nullable(),
    platform: z.string().min(1),
    treeKey: z.string().min(1),
    runtimeChecksum: z.string().min(1),
    workerChecksum: z.string().min(1),
    runtimeFingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    installationPath: z.string().min(1),
    adapterVersion: z.literal(CALCULATOR_ADAPTER_VERSION),
    protocolVersion: z.literal(CALCULATOR_PROTOCOL_VERSION),
    preparedAt: z.string().min(1),
  })
  .strict();

export type RuntimeManifest = z.infer<typeof manifestSchema>;

export function liveInstallPath(): string | null {
  const appData = process.env.APPDATA;
  if (!appData) return null;
  return path.resolve(appData, "Path of Building Community (PoE2)");
}

export function assertIsolatedRuntimeDir(dir: string): void {
  const resolved = path.resolve(dir);
  const live = liveInstallPath();
  if (live && resolved.toLowerCase() === live.toLowerCase()) {
    throw new Error(
      "The calculator runtime must be a separate copy, not the live PoB2 install.",
    );
  }
}

export function readRuntimeManifest(dir: string): RuntimeManifest {
  assertIsolatedRuntimeDir(dir);
  const manifestPath = path.join(dir, "poe2-buddy-runtime.json");
  if (!existsSync(manifestPath)) {
    throw new Error("The isolated PoB2 runtime manifest is missing.");
  }
  const parsed = manifestSchema.parse(
    JSON.parse(readFileSync(manifestPath, "utf8")),
  );
  if (
    path.resolve(parsed.installationPath).toLowerCase() !==
    path.resolve(dir).toLowerCase()
  ) {
    throw new Error("The runtime manifest does not match this directory.");
  }
  const exe = path.join(dir, "Path of Building-PoE2.exe");
  const exeChecksum = `sha256:${createHash("sha256").update(readFileSync(exe)).digest("hex")}`;
  if (exeChecksum !== parsed.runtimeChecksum) {
    throw new Error(
      "The isolated PoB2 executable checksum does not match the pin.",
    );
  }
  const workerPath = path.join(dir, "Modules", "Pob2BuddyWorker.lua");
  const workerChecksum = `sha256:${createHash("sha256").update(readFileSync(workerPath)).digest("hex")}`;
  if (workerChecksum !== parsed.workerChecksum) {
    throw new Error("The isolated PoB2 worker file does not match the pin.");
  }
  const buildLua = readFileSync(path.join(dir, "Modules", "Build.lua"), "utf8");
  if (!buildLua.includes("POB2_CALC_WORKER_BEGIN")) {
    throw new Error(
      "The isolated runtime is missing its one-time worker bootstrap.",
    );
  }
  return parsed;
}

export function shouldRecycleWorker(state: {
  startedAt: number;
  loads: number;
  action: string;
  now: number;
}): boolean {
  if (state.startedAt <= 0) return false;
  if (state.now - state.startedAt > MAX_WORKER_AGE_MS) return true;
  return state.action !== "health" && state.loads >= MAX_LOADED_BUILDS;
}

type LineSocket = {
  send(line: string): void;
  readLine(timeoutMs: number): Promise<string>;
  destroy(): void;
};

type LaunchHooks = {
  listen: () => Promise<{
    port: number;
    close: () => void;
    connection: Promise<LineSocket>;
  }>;
  spawn: (
    exe: string,
    cwd: string,
    env: Record<string, string | undefined>,
    port: number,
  ) => {
    pid: number | undefined;
    kill: () => void;
    onExit: (listener: () => void) => void;
  };
};

type WorkerHooks = Partial<LaunchHooks> & {
  fingerprint?: (runtimeDir: string) => string;
};

function defaultListen(): ReturnType<LaunchHooks["listen"]> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("The calculator socket did not bind."));
        return;
      }
      const connection = new Promise<LineSocket>(
        (resolveConnection, rejectConnection) => {
          const timer = setTimeout(() => {
            rejectConnection(new Error("timeout"));
          }, WORKER_STARTUP_TIMEOUT_MS);
          server.once("connection", (socket) => {
            clearTimeout(timer);
            resolveConnection(lineSocket(socket));
          });
        },
      );
      resolve({
        port: address.port,
        close: () => server.close(),
        connection,
      });
    });
  });
}

function lineSocket(socket: net.Socket): LineSocket {
  let buffer = "";
  const waiters: Array<{
    resolve: (line: string) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
  }> = [];

  const flush = () => {
    const newline = buffer.indexOf("\n");
    if (newline === -1 || waiters.length === 0) return;
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    const waiter = waiters.shift();
    if (!waiter) return;
    clearTimeout(waiter.timer);
    waiter.resolve(line);
    flush();
  };

  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    flush();
  });
  socket.on("error", () => {
    for (const waiter of waiters.splice(0)) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error("worker-crashed"));
    }
  });
  socket.on("close", () => {
    for (const waiter of waiters.splice(0)) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error("worker-crashed"));
    }
  });

  return {
    send(line: string) {
      socket.write(`${line}\n`);
    },
    readLine(timeoutMs: number) {
      const immediate = buffer.indexOf("\n");
      if (immediate !== -1) {
        const line = buffer.slice(0, immediate);
        buffer = buffer.slice(immediate + 1);
        return Promise.resolve(line);
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const index = waiters.findIndex((waiter) => waiter.timer === timer);
          if (index >= 0) waiters.splice(index, 1);
          reject(new Error("timeout"));
        }, timeoutMs);
        waiters.push({ resolve, reject, timer });
      });
    },
    destroy() {
      socket.destroy();
    },
  };
}

function defaultSpawn(
  exe: string,
  cwd: string,
  env: Record<string, string | undefined>,
): {
  pid: number | undefined;
  kill: () => void;
  onExit: (listener: () => void) => void;
} {
  const child: ChildProcess = spawn(exe, [], {
    cwd,
    env: env as NodeJS.ProcessEnv,
    stdio: "ignore",
    windowsHide: true,
  });
  return {
    pid: child.pid,
    kill() {
      if (child.exitCode === null && child.pid) {
        spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          stdio: "ignore",
        });
      }
    },
    onExit(listener) {
      child.once("exit", () => listener());
    },
  };
}

export class IsolatedPob2Worker {
  private chain: Promise<void> = Promise.resolve();
  private socket: LineSocket | null = null;
  private process: ReturnType<LaunchHooks["spawn"]> | null = null;
  private serverClose: (() => void) | null = null;
  private startedAt = 0;
  loads = 0;
  runtimeFingerprint: string | null = null;
  private readonly hooks: LaunchHooks;
  private readonly fingerprintHook:
    ((runtimeDir: string) => string) | undefined;

  constructor(
    private readonly runtimeDir: string,
    private readonly manifest: RuntimeManifest,
    hooks?: WorkerHooks,
  ) {
    assertIsolatedRuntimeDir(runtimeDir);
    this.fingerprintHook = hooks?.fingerprint;
    this.hooks = {
      listen: hooks?.listen ?? defaultListen,
      spawn: hooks?.spawn ?? ((exe, cwd, env) => defaultSpawn(exe, cwd, env)),
    };
  }

  request(payload: unknown, timeoutMs: number): Promise<unknown> {
    const run = this.chain.then(() => this.roundTrip(payload, timeoutMs));
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  discard(): void {
    this.socket?.destroy();
    this.socket = null;
    this.process?.kill();
    this.process = null;
    this.serverClose?.();
    this.serverClose = null;
    this.loads = 0;
    this.startedAt = 0;
    this.runtimeFingerprint = null;
  }

  private async roundTrip(
    payload: unknown,
    timeoutMs: number,
  ): Promise<unknown> {
    const action =
      payload && typeof payload === "object" && "action" in payload
        ? String(payload.action)
        : "";
    if (
      shouldRecycleWorker({
        startedAt: this.startedAt,
        loads: this.loads,
        action,
        now: Date.now(),
      })
    ) {
      this.discard();
    }
    try {
      await this.ensureStarted();
      if (!this.socket) throw new Error("worker-crashed");
      this.socket.send(JSON.stringify(payload));
      const line = await this.socket.readLine(timeoutMs);
      if (action !== "health") this.loads += 1;
      try {
        return JSON.parse(line) as unknown;
      } catch {
        this.discard();
        throw new Error("protocol-invalid");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "timeout" || message === "worker-crashed") {
        this.discard();
      }
      throw error;
    }
  }

  private async ensureStarted(): Promise<void> {
    if (this.socket) return;
    this.assertFingerprint();
    const exe = path.join(this.runtimeDir, "Path of Building-PoE2.exe");
    const listening = await this.hooks.listen();
    this.serverClose = listening.close;
    const env = workerEnvironment(listening.port);
    this.process = this.hooks.spawn(exe, this.runtimeDir, env, listening.port);
    this.startedAt = Date.now();
    this.process.onExit(() => {
      this.socket = null;
    });
    try {
      this.socket = await listening.connection;
    } catch (error) {
      this.discard();
      throw error;
    }
  }

  private assertFingerprint(): void {
    const actual = (this.fingerprintHook ?? runtimeFingerprint)(
      this.runtimeDir,
    );
    if (actual !== this.manifest.runtimeFingerprint) {
      throw new Error("runtime-integrity-mismatch");
    }
    this.runtimeFingerprint = actual;
  }
}

export function workerEnvironment(
  port: number,
): Record<string, string | undefined> {
  return {
    POB2_CALC_WORKER: "1",
    POB2_CALC_PORT: String(port),
    SystemRoot: process.env.SystemRoot,
    WINDIR: process.env.WINDIR,
    PATH: process.env.PATH,
  };
}
