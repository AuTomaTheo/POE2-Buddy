export const CRAFTING_ERROR_CODES = [
  "snapshot-unavailable",
  "snapshot-incompatible",
  "source-fetch-failed",
  "source-schema-invalid",
  "normalization-failed",
  "base-not-found",
  "base-ambiguous",
  "modifier-not-found",
  "eligibility-unresolved",
  "translation-unresolved",
] as const;

export type CraftingErrorCode = (typeof CRAFTING_ERROR_CODES)[number];

export type CraftingError = {
  code: CraftingErrorCode;
  message: string;
};

export type CraftingFailure = {
  ok: false;
  error: CraftingError;
};

export type CraftingSuccess<T> = {
  ok: true;
  value: T;
};

export type CraftingResult<T> = CraftingSuccess<T> | CraftingFailure;

export function craftingFailure(
  code: CraftingErrorCode,
  message: string,
): CraftingFailure {
  return { ok: false, error: { code, message } };
}

export function craftingSuccess<T>(value: T): CraftingSuccess<T> {
  return { ok: true, value };
}
