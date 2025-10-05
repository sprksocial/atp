import { p256 } from "@noble/curves/nist.js";

export const compressPubkey = (pubkeyBytes: Uint8Array): Uint8Array => {
  const point = p256.Point.fromBytes(pubkeyBytes);
  return point.toBytes(true);
};

export const decompressPubkey = (compressed: Uint8Array): Uint8Array => {
  if (compressed.length !== 33) {
    throw new Error("Expected 33 byte compress pubkey");
  }
  const point = p256.Point.fromBytes(compressed);
  return point.toBytes(false);
};
