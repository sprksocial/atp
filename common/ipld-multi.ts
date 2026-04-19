import { decodeAll } from "@atp/lex/cbor";
import type { Cid } from "@atp/lex/data";

export type CborPrimitive =
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined;
export type CborArray = CborValue[];
export type CborObject = { [key: string]: CborValue };
export type CborValue =
  | CborPrimitive
  | CborArray
  | CborObject
  | Cid
  | Uint8Array;

export function cborDecodeMulti<T extends CborValue = CborValue>(
  encoded: Uint8Array,
): T[] {
  if (encoded.byteLength === 0) {
    return [];
  }
  return Array.from(decodeAll(encoded)) as T[];
}

export function cborDecodeSingle<T extends CborValue = CborValue>(
  encoded: Uint8Array,
): T {
  const results = cborDecodeMulti<T>(encoded);
  if (results.length !== 1) {
    throw new Error(`Expected single value, got ${results.length} values`);
  }
  return results[0];
}

export function cborDecodeMultiAsObjects(encoded: Uint8Array): CborObject[] {
  return cborDecodeMulti<CborObject>(encoded);
}

export function cborDecodeMultiAsArrays(encoded: Uint8Array): CborArray[] {
  return cborDecodeMulti<CborArray>(encoded);
}
