import * as uint8arrays from "@atp/bytes";
import { BASE58_MULTIBASE_PREFIX, DID_KEY_PREFIX } from "./const.ts";
import { plugins } from "./plugins.ts";
import { extractMultikey, extractPrefixedBytes, hasPrefix } from "./utils.ts";

export type ParsedMultikey = {
  jwtAlg: string;
  keyBytes: Uint8Array;
};

export const parseMultikey = (multikey: string): ParsedMultikey => {
  const prefixedBytes = extractPrefixedBytes(multikey);
  const plugin = plugins.find((p) => hasPrefix(prefixedBytes, p.prefix));
  if (!plugin) {
    throw new Error("Unsupported key type");
  }
  const keyBytes = plugin.decompressPubkey(
    prefixedBytes.slice(plugin.prefix.length),
  );
  return {
    jwtAlg: plugin.jwtAlg,
    keyBytes,
  };
};

export const formatMultikey = (
  jwtAlg: string,
  keyBytes: Uint8Array,
): string => {
  const plugin = plugins.find((p) => p.jwtAlg === jwtAlg);
  if (!plugin) {
    throw new Error("Unsupported key type");
  }
  const prefixedBytes = uint8arrays.concat([
    plugin.prefix,
    plugin.compressPubkey(keyBytes),
  ]);
  return (
    BASE58_MULTIBASE_PREFIX + uint8arrays.toString(prefixedBytes, "base58btc")
  );
};

export const parseDidKey = (did: string): ParsedMultikey => {
  const multikey = extractMultikey(did);
  return parseMultikey(multikey);
};

export const formatDidKey = (jwtAlg: string, keyBytes: Uint8Array): string => {
  return DID_KEY_PREFIX + formatMultikey(jwtAlg, keyBytes);
};
