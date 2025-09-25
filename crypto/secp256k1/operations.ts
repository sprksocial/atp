import { secp256k1 as k256 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { equals } from "@atp/bytes";
import { SECP256K1_DID_PREFIX } from "../const.ts";
import type { VerifyOptions } from "../types.ts";
import { extractMultikey, extractPrefixedBytes, hasPrefix } from "../utils.ts";

export const verifyDidSig = (
  did: string,
  data: Uint8Array,
  sig: Uint8Array,
  opts?: VerifyOptions,
): boolean => {
  const prefixedBytes = extractPrefixedBytes(extractMultikey(did));
  if (!hasPrefix(prefixedBytes, SECP256K1_DID_PREFIX)) {
    throw new Error(`Not a secp256k1 did:key: ${did}`);
  }
  const keyBytes = prefixedBytes.slice(SECP256K1_DID_PREFIX.length);
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
  return k256.verify(sig, msgHash, publicKey, {
    format: allowMalleable ? undefined : "compact", // prevent DER-encoded signatures
    lowS: !allowMalleable,
  });
};

export const isCompactFormat = (sig: Uint8Array) => {
  try {
    const parsed = k256.Signature.fromBytes(sig);
    return equals(parsed.toBytes(), sig);
  } catch {
    return false;
  }
};
