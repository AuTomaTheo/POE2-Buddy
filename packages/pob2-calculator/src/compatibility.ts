import { calculatorError, type CalculatorError } from "./errors.js";

/**
 * Explicit pairs only. Tree key `0_5` is not the same string as GGG pin `0.5.5`.
 * A version that is absent from this list is incompatible.
 */
export const APPROVED_CALCULATOR_MAPPINGS = [
  {
    pobTreeKey: "0_5",
    gggVersion: "0.5.5",
    pobVersion: "0.23.1",
  },
] as const;

export type ApprovedCalculatorMapping =
  (typeof APPROVED_CALCULATOR_MAPPINGS)[number];

export type CompatibilityInput = {
  pobTreeKey: string;
  gggVersion: string;
  pobVersion: string;
};

export function findApprovedMapping(
  input: CompatibilityInput,
): ApprovedCalculatorMapping | null {
  return (
    APPROVED_CALCULATOR_MAPPINGS.find(
      (mapping) =>
        mapping.pobTreeKey === input.pobTreeKey &&
        mapping.gggVersion === input.gggVersion &&
        mapping.pobVersion === input.pobVersion,
    ) ?? null
  );
}

export function checkCompatibility(
  input: CompatibilityInput,
):
  | { ok: true; mapping: ApprovedCalculatorMapping }
  | { ok: false; error: CalculatorError } {
  const mapping = findApprovedMapping(input);
  if (!mapping) {
    return { ok: false, error: calculatorError("version-incompatible") };
  }
  return { ok: true, mapping };
}
