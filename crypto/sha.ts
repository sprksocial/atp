import * as noble from "@noble/hashes/sha2.js";
import { fromString, toString } from "@atp/bytes";

// takes either bytes of utf8 input
// @TODO this can be sync
export const sha256 = (
  input: Uint8Array | string,
): Uint8Array => {
  const bytes = typeof input === "string" ? fromString(input, "utf8") : input;
  return noble.sha256(bytes);
};

// @TODO this can be sync
export const sha256Hex = (
  input: Uint8Array | string,
): string => {
  const hash = sha256(input);
  return toString(hash, "hex");
};
