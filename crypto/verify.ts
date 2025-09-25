import { fromString } from "@atp/bytes";
import { parseDidKey } from "./did.ts";
import { plugins } from "./plugins.ts";
import type { VerifyOptions } from "./types.ts";

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
