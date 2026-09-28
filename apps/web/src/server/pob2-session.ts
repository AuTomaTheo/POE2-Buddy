import {
  IsolatedPob2Worker,
  calculatorError,
  readRuntimeManifest,
  type CalculatorError,
  type RuntimeManifest,
} from "@poe2-helper/pob2-calculator";

let workerSlot: { dir: string; worker: IsolatedPob2Worker } | null = null;

export function calculatorEnabled(): boolean {
  return process.env.POB2_CALCULATOR_ENABLED === "true";
}

export function openCalculator():
  | { ok: true; manifest: RuntimeManifest; worker: IsolatedPob2Worker }
  | { ok: false; error: CalculatorError } {
  if (!calculatorEnabled()) {
    return { ok: false, error: calculatorError("runtime-unavailable") };
  }
  const dir = process.env.POB2_CALCULATOR_DIR?.trim() ?? "";
  if (dir.length === 0) {
    return { ok: false, error: calculatorError("runtime-unavailable") };
  }
  try {
    const manifest = readRuntimeManifest(dir);
    if (!workerSlot || workerSlot.dir !== dir) {
      workerSlot?.worker.discard();
      workerSlot = { dir, worker: new IsolatedPob2Worker(dir, manifest) };
    }
    return { ok: true, manifest, worker: workerSlot.worker };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "runtime unavailable";
    console.error(`pob2-calculator runtime-unavailable ${message}`);
    return { ok: false, error: calculatorError("runtime-unavailable") };
  }
}
