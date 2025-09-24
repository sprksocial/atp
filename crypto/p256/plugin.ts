import { P256_DID_PREFIX, P256_JWT_ALG } from "../const.ts";
import type { DidKeyPlugin } from "../types.ts";
import { compressPubkey, decompressPubkey } from "./encoding.ts";
import { verifyDidSig } from "./operations.ts";

export const p256Plugin: DidKeyPlugin = {
  prefix: P256_DID_PREFIX,
  jwtAlg: P256_JWT_ALG,
  verifySignature: verifyDidSig,

  compressPubkey,
  decompressPubkey,
};
