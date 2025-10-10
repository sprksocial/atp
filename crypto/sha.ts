import * as noble from "@noble/hashes/sha2.js";
import { fromString, toString } from "@atp/bytes";

/**
 * Creates a SHA-256 hash of the input.
 * Takes either bytes of utf8 input
 * @param input - Bytes to hash.
 */
export const sha256 = (
  input: Uint8Array | string,
): Uint8Array => {
  const bytes = typeof input === "string" ? fromString(input, "utf8") : input;
  return noble.sha256(bytes);
};

/**
 * Hashes the input using SHA-256 and returns the result as a hexadecimal string.
 * @param input - Bytes to hash.
 */
export const sha256Hex = (
  input: Uint8Array | string,
): string => {
  const hash = sha256(input);
  return toString(hash, "hex");
};
