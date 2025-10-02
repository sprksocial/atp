import { p256 } from "@noble/curves/nist.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { P256_DID_PREFIX } from "../const.ts";
import type { VerifyOptions } from "../types.ts";
import {
  detectSigFormat,
  extractMultikey,
  extractPrefixedBytes,
  hasPrefix,
} from "../utils.ts";

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
  const allowDer = (opts?.allowDerSig ?? false) || allowMalleable; // keep your existing DER test passing

  // If `data` is already a 32-byte hash, don’t hash again.
  const msgHash32 = data.length === 32 ? data : sha256(data);

  const format = detectSigFormat(sig);

  // 🔒 Reject DER by default (atproto requires compact); only allow if explicitly permitted.
  if (format === "der" && !allowDer) {
    return false; // or `throw` if you prefer
  }

  return p256.verify(sig, msgHash32, publicKey, {
    format, // 'compact' or 'der'
    lowS: !allowMalleable, // enforce low-S unless explicitly disabled
    prehash: false, // we're passing the digest
  });
};

// If you still want a parser-based check around:
export const isCompactFormat = (sig: Uint8Array) => {
  try {
    const parsed = p256.Signature.fromBytes(sig); // accepts DER or compact
    return parsed.toBytes("compact").every((b, i) => b === sig[i]);
  } catch {
    return false;
  }
};
