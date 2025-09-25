import * as noble from "@noble/hashes/utils.js";
import { type SupportedEncodings, toString } from "@atp/bytes";
import { sha256 } from "./sha.ts";

export const randomBytes = noble.randomBytes;

export const randomStr = (
  byteLength: number,
  encoding: SupportedEncodings,
): string => {
  const bytes = randomBytes(byteLength);
  return toString(bytes, encoding);
};

export const randomIntFromSeed = (
  seed: string,
  high: number,
  low = 0,
): number => {
  const hash = sha256(seed);
  const view = new DataView(hash.buffer, hash.byteOffset, hash.byteLength);
  // Read 6 bytes as big-endian unsigned integer (similar to Buffer.readUintBE(0, 6))
  let number = 0;
  for (let i = 0; i < 6; i++) {
    number = number * 256 + view.getUint8(i);
  }
  const range = high - low;
  const normalized = number % range;
  return normalized + low;
};
