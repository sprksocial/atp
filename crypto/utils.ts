import { equals, fromString } from "@atp/bytes";
import { BASE58_MULTIBASE_PREFIX, DID_KEY_PREFIX } from "./const.ts";

export const extractMultikey = (did: string): string => {
  if (!did.startsWith(DID_KEY_PREFIX)) {
    throw new Error(`Incorrect prefix for did:key: ${did}`);
  }
  return did.slice(DID_KEY_PREFIX.length);
};

export const extractPrefixedBytes = (multikey: string): Uint8Array => {
  if (!multikey.startsWith(BASE58_MULTIBASE_PREFIX)) {
    throw new Error(`Incorrect prefix for multikey: ${multikey}`);
  }
  return fromString(
    multikey.slice(BASE58_MULTIBASE_PREFIX.length),
    "base58btc",
  );
};

export const hasPrefix = (bytes: Uint8Array, prefix: Uint8Array): boolean => {
  return equals(prefix, bytes.subarray(0, prefix.byteLength));
};

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
