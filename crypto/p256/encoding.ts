import { p256 } from "@noble/curves/nist.js";
import { toString } from "@atp/ui8";

export const compressPubkey = (pubkeyBytes: Uint8Array): Uint8Array => {
  // Check if key is already compressed (33 bytes starting with 0x02 or 0x03)
  if (
    pubkeyBytes.length === 33 &&
    (pubkeyBytes[0] === 0x02 || pubkeyBytes[0] === 0x03)
  ) {
    return pubkeyBytes;
  }
  const point = p256.Point.fromHex(toString(pubkeyBytes, "hex"));
  return point.toBytes(true);
};

export const decompressPubkey = (compressed: Uint8Array): Uint8Array => {
  if (compressed.length !== 33) {
    throw new Error("Expected 33 byte compress pubkey");
  }
  const point = p256.Point.fromHex(toString(compressed, "hex"));
  return point.toBytes(false);
};
