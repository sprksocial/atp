import { p256 } from "@noble/curves/nist.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { equals as ui8equals } from "@atp/bytes";
import { P256_DID_PREFIX } from "../const.ts";
import type { VerifyOptions } from "../types.ts";
import { extractMultikey, extractPrefixedBytes, hasPrefix } from "../utils.ts";

export const verifyDidSig = (
  did: string,
  data: Uint8Array,
  sig: Uint8Array,
  opts?: VerifyOptions,
): boolean => {
  const prefixedBytes = extractPrefixedBytes(extractMultikey(did));
  if (!hasPrefix(prefixedBytes, P256_DID_PREFIX)) {
    throw new Error(`Not a P-256 did:key: ${did}`);
  }
  const keyBytes = prefixedBytes.slice(P256_DID_PREFIX.length);
  return verifySig(keyBytes, data, sig, opts);
};

export const verifySig = (
  publicKey: Uint8Array,
  data: Uint8Array,
  sig: Uint8Array,
  opts?: VerifyOptions,
): boolean => {
  const allowMalleable = opts?.allowMalleableSig ?? false;
  const msgHash = sha256(data);
  return p256.verify(sig, msgHash, publicKey, {
    format: allowMalleable ? undefined : "compact", // prevent DER-encoded signatures
    lowS: !allowMalleable,
  });
};

export const isCompactFormat = (sig: Uint8Array) => {
  try {
    const parsed = p256.Signature.fromBytes(sig);
    return ui8equals(parsed.toBytes(), sig);
  } catch {
    return false;
  }
};
