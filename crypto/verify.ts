import { fromString } from "@atp/bytes";
import { parseDidKey } from "./did.ts";
import { plugins } from "./plugins.ts";
import type { VerifyOptions } from "./types.ts";

/**
 * Verifies a given signature is valid for the given data using the specified DID key and algorithm.
 * @param didKey - The DID key to verify the signature with
 * @param data - The data to verify the signature against
 * @param sig - The signature to verify
 * @param opts - Options for loosening verification and jwt algorithm
 * @returns True if the signature is valid, false otherwise
 */
export const verifySignature = (
  didKey: string,
  data: Uint8Array,
  sig: Uint8Array,
  opts?: VerifyOptions & {
    jwtAlg?: string;
  },
): boolean => {
  const parsed = parseDidKey(didKey);
  if (opts?.jwtAlg && opts.jwtAlg !== parsed.jwtAlg) {
    throw new Error(`Expected key alg ${opts.jwtAlg}, got ${parsed.jwtAlg}`);
  }
  const plugin = plugins.find((p) => p.jwtAlg === parsed.jwtAlg);
  if (!plugin) {
    throw new Error(`Unsupported signature alg: ${parsed.jwtAlg}`);
  }
  return plugin.verifySignature(didKey, data, sig, opts);
};

/**
 * {@linkcode verifySignature} with string inputs converted to bytes using UTF-8 encoding
 * @param didKey - The DID key string to verify the signature with
 * @param data - The data string to verify the signature against
 * @param sig - The signature string to verify
 * @param opts - Options for loosening verification
 * @returns True if the signature is valid, false otherwise
 */
export const verifySignatureUtf8 = (
  didKey: string,
  data: string,
  sig: string,
  opts?: VerifyOptions,
): boolean => {
  const dataBytes = fromString(data, "utf8");
  const sigBytes = fromString(sig, "base64url");
  return verifySignature(didKey, dataBytes, sigBytes, opts);
};
