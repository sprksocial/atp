import { SECP256K1_DID_PREFIX, SECP256K1_JWT_ALG } from "../const.ts";
import type { DidKeyPlugin } from "../types.ts";
import { compressPubkey, decompressPubkey } from "./encoding.ts";
import { verifyDidSig } from "./operations.ts";

export const secp256k1Plugin: DidKeyPlugin = {
  prefix: SECP256K1_DID_PREFIX,
  jwtAlg: SECP256K1_JWT_ALG,
  verifySignature: verifyDidSig,

  compressPubkey,
  decompressPubkey,
};
