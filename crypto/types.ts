export interface Signer {
  jwtAlg: string;
  sign(msg: Uint8Array): Uint8Array;
}

export interface Didable {
  did(): string;
}

export interface Keypair extends Signer, Didable {}

/**
 * Keypair with an export method.
 * @prop export - Exports the keypair as a Uint8Array.
 */
export interface ExportableKeypair extends Keypair {
  export(): Promise<Uint8Array>;
}

/**
 * DID key plugin with key compression and signature verification utilities.
 * @prop prefix - The DID key prefix.
 * @prop jwtAlg - The JWT algorithm used for signing.
 * @prop verifySignature - Verifies a signature for the given message bytes.
 * @prop compressPubkey - Compresses a public key.
 * @prop decompressPubkey - Decompresses a compressed public key.
 */
export type DidKeyPlugin = {
  prefix: Uint8Array;
  jwtAlg: string;
  verifySignature: (
    did: string,
    msg: Uint8Array,
    data: Uint8Array,
    opts?: VerifyOptions,
  ) => boolean;

  compressPubkey: (uncompressed: Uint8Array) => Uint8Array;
  decompressPubkey: (compressed: Uint8Array) => Uint8Array;
};

/**
 * Options for less strict signature verification.
 * These options are only recommended for testing purposes.
 * @prop allowMalleableSig - Don't enforce low-S signatures. Explicitly against specification. Only recommended for testing purposes.
 * @prop allowDerSig - Allow DER-encoded signatures. Only recommended for testing purposes.
 */
export type VerifyOptions = {
  allowMalleableSig?: boolean;
  allowDerSig?: boolean;
};
