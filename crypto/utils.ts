import { equals, fromString } from "@atp/bytes";
import { BASE58_MULTIBASE_PREFIX, DID_KEY_PREFIX } from "./const.ts";

/**
 * Extracts the multikey from a `did:key` string.
 * @param did - The `did:key` string to extract the multikey from.
 * @throws Error if the input doesn't start with `did:key:`.
 */
export const extractMultikey = (did: string): string => {
  if (!did.startsWith(DID_KEY_PREFIX)) {
    throw new Error(`Incorrect prefix for did:key: ${did}`);
  }
  return did.slice(DID_KEY_PREFIX.length);
};

/**
 * Extracts the bytes from a multikey string using base58btc encoding.
 * @param multikey - The multikey string to extract the bytes from.
 * @throws Error if the input doesn't start with `z`.
 */
export const extractPrefixedBytes = (multikey: string): Uint8Array => {
  if (!multikey.startsWith(BASE58_MULTIBASE_PREFIX)) {
    throw new Error(`Incorrect prefix for multikey: ${multikey}`);
  }
  return fromString(
    multikey.slice(BASE58_MULTIBASE_PREFIX.length),
    "base58btc",
  );
};

/**
 * Checks if the given bytes have the specified prefix.
 * @param bytes - The bytes to check.
 * @param prefix - The prefix to check for.
 * @returns True if the bytes have the specified prefix, false otherwise.
 */
export const hasPrefix = (bytes: Uint8Array, prefix: Uint8Array): boolean => {
  return equals(prefix, bytes.subarray(0, prefix.byteLength));
};

/**
 * Detects the signature format of the given bytes.
 * @param sig - The signature bytes to detect the format of.
 * @returns The signature format, either "compact" or "der".
 */
export function detectSigFormat(sig: Uint8Array): "compact" | "der" {
  if (sig.length === 65) {
    throw new Error(
      "Recoverable signatures (65 bytes) not supported; strip recovery id.",
    );
  }
  if (sig.length === 64) return "compact";
  if (sig.length >= 70 && sig[0] === 0x30) return "der"; // ASN.1 SEQUENCE
  throw new Error("Unknown signature format: expected 64-byte compact or DER.");
}
