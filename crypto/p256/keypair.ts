import { p256 } from "@noble/curves/nist.js";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  fromString as ui8FromString,
  type SupportedEncodings,
  toString as ui8ToString,
} from "@atp/bytes";
import { P256_JWT_ALG } from "../const.ts";
import * as did from "../did.ts";
import type { Keypair } from "../types.ts";

export type P256KeypairOptions = {
  exportable: boolean;
};

export class P256Keypair implements Keypair {
  jwtAlg = P256_JWT_ALG;
  private publicKey: Uint8Array;

  constructor(
    private privateKey: Uint8Array,
    private exportable: boolean,
  ) {
    this.publicKey = p256.getPublicKey(privateKey, false); // false = uncompressed
  }

  static create(
    opts?: Partial<P256KeypairOptions>,
  ): P256Keypair {
    const { exportable = false } = opts || {};
    const privKey = p256.utils.randomSecretKey();
    return new P256Keypair(privKey, exportable);
  }

  static import(
    privKey: Uint8Array | string,
    opts?: Partial<P256KeypairOptions>,
  ): P256Keypair {
    const { exportable = false } = opts || {};
    const privKeyBytes = typeof privKey === "string"
      ? ui8FromString(privKey, "hex")
      : privKey;
    return new P256Keypair(privKeyBytes, exportable);
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
    const sig = p256.sign(msgHash, this.privateKey, { lowS: true });
    return sig;
  }

  export(): Uint8Array {
    if (!this.exportable) {
      throw new Error("Private key is not exportable");
    }
    return this.privateKey;
  }
}
