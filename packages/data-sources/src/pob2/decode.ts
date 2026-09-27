import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";

/** One mebibyte. Normal PoB2 XML is far smaller; this stops a tiny code from expanding without a bound. */
export const POB2_MAX_DECODED_BYTES = 1_048_576;

export type Pob2FailureKind =
  | "invalid-encoding"
  | "invalid-compression"
  | "decompression-limit"
  | "invalid-xml"
  | "unsupported-root"
  | "unsupported-location";

export class Pob2DecodeError extends Error {
  readonly failureKind: Pob2FailureKind;

  constructor(failureKind: Pob2FailureKind, message: string) {
    super(message);
    this.name = "Pob2DecodeError";
    this.failureKind = failureKind;
  }
}

/**
 * Path of Building 2 export codes are URL-safe Base64 around a zlib stream.
 * The XML is what `Deflate` writes in Path of Building. Raw XML and share links are not accepted.
 */
export function decodePob2Export(code: string): {
  xml: string;
  checksum: string;
} {
  const trimmed = code.trim();
  if (trimmed.length === 0 || trimmed.length > POB2_MAX_DECODED_BYTES * 2) {
    throw new Pob2DecodeError(
      "invalid-encoding",
      "The PoB2 export code is empty or too large.",
    );
  }
  if (
    /^https?:\/\//i.test(trimmed) ||
    /pobb\.in|pastebin\.com|github\.com/i.test(trimmed)
  ) {
    throw new Pob2DecodeError(
      "unsupported-location",
      "Paste the raw PoB2 export code. Share links are not imported.",
    );
  }

  const normalized = trimmed.replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    throw new Pob2DecodeError(
      "invalid-encoding",
      "The PoB2 export code is not valid Base64.",
    );
  }
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const compressed = Buffer.from(padded, "base64");
  if (compressed.length === 0) {
    throw new Pob2DecodeError(
      "invalid-encoding",
      "The PoB2 export code is not valid Base64.",
    );
  }

  let inflated: Buffer;
  try {
    inflated = inflateSync(compressed, {
      maxOutputLength: POB2_MAX_DECODED_BYTES,
    });
  } catch (error) {
    const codeName =
      error instanceof Error && "code" in error ? String(error.code) : "";
    if (codeName === "ERR_BUFFER_TOO_LARGE") {
      throw new Pob2DecodeError(
        "decompression-limit",
        "The PoB2 export expands past the 1 MiB limit.",
      );
    }
    throw new Pob2DecodeError(
      "invalid-compression",
      "The PoB2 export could not be decompressed.",
    );
  }

  const xml = inflated.toString("utf8");
  return {
    xml,
    checksum: `sha256:${createHash("sha256").update(inflated).digest("hex")}`,
  };
}
