/**
 * # AT Protocol Cryptographic Utilities
 *
 * This module provides cryptographic helpers for AT Protocol.
 *
 * 2 cryptographic systems are currently supported:
 * - P-256 elliptic curve: aka "NIST P-256", aka secp256r1 (note the r), aka prime256v1
 * - K-256 elliptic curve: aka "NIST K-256", aka secp256k1 (note the k)
 *
 * The details of cryptography in atproto are described in {@link https://atproto.com/specs/cryptography | the specification.}
 * This includes string encodings, validity of "low-S" signatures, byte representation
 * "compression", hashing, and more.
 *
 * @example
 * ```typescript
 *  import { verifySignature, Secp256k1Keypair, P256Keypair } from '@atp/crypto'
 *
 *  // generate a new random K-256 private key
 *  const keypair = await Secp256k1Keypair.create({ exportable: true })
 *
 *  // sign binary data, resulting signature bytes.
 *  // SHA-256 hash of data is what actually gets signed.
 *  // signature output is often base64-encoded.
 *  const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
 *  const sig = await keypair.sign(data)
 *
 *  // serialize the public key as a did:key string, which includes key type metadata
 *  const pubDidKey = keypair.did()
 *  console.log(pubDidKey)
 *
 *  // output would look something like: 'did:key:zQ3shVRtgqTRHC7Lj4DYScoDgReNpsDp3HBnuKBKt1FSXKQ38'
 *
 *  // verify signature using public key
 *  const ok = verifySignature(pubDidKey, data, sig)
 *  if (!ok) {
 *    throw new Error('Uh oh, something is fishy')
 *  } else {
 *    console.log('Success')
 *  }
 * ```
 *
 * @module
 */
export * from "./const.ts";
export * from "./did.ts";
export * from "./multibase.ts";
export * from "./random.ts";
export * from "./sha.ts";
export * from "./types.ts";
export * from "./verify.ts";
export * from "./utils.ts";

export * from "./p256/keypair.ts";
export * from "./p256/plugin.ts";

export * from "./secp256k1/keypair.ts";
export * from "./secp256k1/plugin.ts";
