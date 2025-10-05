import { secp256k1 as k256 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  fromString as ui8FromString,
  type SupportedEncodings,
  toString as ui8ToString,
} from "@atp/bytes";
import { SECP256K1_JWT_ALG } from "../const.ts";
import * as did from "../did.ts";
import type { Keypair } from "../types.ts";

export type Secp256k1KeypairOptions = {
  exportable: boolean;
};

export class Secp256k1Keypair implements Keypair {
  jwtAlg = SECP256K1_JWT_ALG;
  private publicKey: Uint8Array;

  constructor(
    private privateKey: Uint8Array,
    private exportable: boolean,
  ) {
    this.publicKey = k256.getPublicKey(privateKey, false);
  }

  static create(
    opts?: Partial<Secp256k1KeypairOptions>,
  ): Secp256k1Keypair {
    const { exportable = false } = opts || {};
    const privKey = k256.utils.randomSecretKey();
    return new Secp256k1Keypair(privKey, exportable);
  }

  static import(
    privKey: Uint8Array | string,
    opts?: Partial<Secp256k1KeypairOptions>,
  ): Secp256k1Keypair {
    const { exportable = false } = opts || {};
    const privKeyBytes = typeof privKey === "string"
      ? ui8FromString(privKey, "hex")
      : privKey;
    return new Secp256k1Keypair(privKeyBytes, exportable);
  }

  publicKeyBytes(): Uint8Array {
    return this.publicKey;
  }

  publicKeyStr(encoding: SupportedEncodings = "base64pad"): string {
    return ui8ToString(this.publicKey, encoding);
  }

  did(): string {
    return did.formatDidKey(this.jwtAlg, this.publicKey);
  }

  sign(msg: Uint8Array): Uint8Array {
    const msgHash = sha256(msg);
    // return raw 64 byte sig not DER-encoded
    return k256.sign(msgHash, this.privateKey, { lowS: true, prehash: false });
  }

  export(): Uint8Array {
    if (!this.exportable) {
      throw new Error("Private key is not exportable");
    }
    return this.privateKey;
  }
}
