export const CALCULATOR_ERROR_CODES = [
  "runtime-unavailable",
  "runtime-integrity-mismatch",
  "version-incompatible",
  "build-load-failed",
  "skill-unresolved",
  "candidate-invalid",
  "candidate-allocation-mismatch",
  "passive-node-unknown",
  "item-invalid",
  "item-slot-unsupported",
  "item-replacement-failed",
  "calculation-failed",
  "restore-failed",
  "timeout",
  "worker-crashed",
  "protocol-invalid",
] as const;

export type CalculatorErrorCode = (typeof CALCULATOR_ERROR_CODES)[number];

export type CalculatorError = {
  code: CalculatorErrorCode;
  message: string;
};

const MESSAGES: Record<CalculatorErrorCode, string> = {
  "runtime-unavailable": "Character-aware calculation unavailable.",
  "runtime-integrity-mismatch":
    "Character-aware calculation unavailable. The calculator runtime does not match its pin.",
  "version-incompatible":
    "Character-aware calculation unavailable for this candidate. The calculator version does not match this tree.",
  "build-load-failed":
    "Character-aware calculation unavailable for this candidate. The build did not load.",
  "skill-unresolved":
    "Character-aware calculation unavailable for this candidate. The active skill was not resolved.",
  "candidate-invalid":
    "Character-aware calculation unavailable for this candidate. The passive candidate is not valid.",
  "candidate-allocation-mismatch":
    "Character-aware calculation unavailable for this candidate. The allocated nodes are not the requested candidate.",
  "passive-node-unknown":
    "Character-aware calculation unavailable for this candidate. A passive node is not in this tree.",
  "item-invalid":
    "Character-aware calculation unavailable for this candidate. The item text was not accepted.",
  "item-slot-unsupported":
    "Character-aware calculation unavailable for this candidate. That equipment slot is not supported.",
  "item-replacement-failed":
    "Character-aware calculation unavailable for this candidate. The item was not equipped.",
  "calculation-failed":
    "Character-aware calculation unavailable for this candidate.",
  "restore-failed":
    "Character-aware calculation unavailable for this candidate. The build did not return to its baseline.",
  timeout:
    "Character-aware calculation unavailable for this candidate. The calculation timed out.",
  "worker-crashed":
    "Character-aware calculation unavailable for this candidate. The calculator stopped.",
  "protocol-invalid":
    "Character-aware calculation unavailable for this candidate.",
};

export function calculatorError(code: CalculatorErrorCode): CalculatorError {
  return { code, message: MESSAGES[code] };
}

export function isCalculatorErrorCode(
  value: string,
): value is CalculatorErrorCode {
  return (CALCULATOR_ERROR_CODES as readonly string[]).includes(value);
}
