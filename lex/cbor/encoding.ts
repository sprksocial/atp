import {
  decode as cborgDecode,
  decodeFirst as cborgDecodeFirst,
  type DecodeOptions,
  encode as cborgEncode,
  type EncodeOptions,
  type TagDecoder,
  Token,
  Type,
} from "cborg";
import { asCid, type Cid, decodeCid } from "../data/cid.ts";
import type { LexValue } from "../data/lex.ts";

export type { Cid, LexValue };

const CID_CBOR_TAG = 42;

function cidEncoder(obj: object): Token[] | null {
  const cid = asCid(obj);
  if (!cid) return null;

  const bytes = new Uint8Array(cid.bytes.byteLength + 1);
  bytes.set(cid.bytes, 1);
  return [new Token(Type.tag, CID_CBOR_TAG), new Token(Type.bytes, bytes)];
}

function undefinedEncoder(): null {
  throw new Error("`undefined` is not allowed by the AT Data Model");
}

function numberEncoder(num: number): null {
  if (Number.isInteger(num)) return null;
  throw new Error("Non-integer numbers are not allowed by the AT Data Model");
}

function mapEncoder(map: Map<unknown, unknown>): null {
  for (const key of map.keys()) {
    if (typeof key !== "string") {
      throw new Error(
        'Only string keys are allowed in CBOR "map" by the AT Data Model',
      );
    }
  }
  return null;
}

const encodeOptions: EncodeOptions = {
  typeEncoders: {
    Map: mapEncoder,
    Object: cidEncoder,
    undefined: undefinedEncoder,
    number: numberEncoder,
  },
};

function cidDecoder(bytes: Uint8Array): Cid {
  if (bytes[0] !== 0) {
    throw new Error("Invalid CID for CBOR tag 42; expected leading 0x00");
  }
  return decodeCid(bytes.subarray(1));
}

const tagDecoders: TagDecoder[] = [];
tagDecoders[CID_CBOR_TAG] = cidDecoder;

const decodeOptions: DecodeOptions = {
  allowIndefinite: false,
  coerceUndefinedToNull: true,
  allowNaN: false,
  allowInfinity: false,
  allowBigInt: true,
  strict: true,
  useMaps: false,
  rejectDuplicateMapKeys: true,
  tags: tagDecoders,
};

export function encode<T extends LexValue>(data: T): Uint8Array {
  return cborgEncode(data, encodeOptions);
}

export function decode<T extends LexValue>(bytes: Uint8Array): T {
  return cborgDecode(bytes, decodeOptions) as T;
}

export function* decodeAll<T extends LexValue = LexValue>(
  data: Uint8Array,
): Generator<T, void, unknown> {
  do {
    const [result, remainingBytes] = cborgDecodeFirst(data, decodeOptions);
    yield result as T;
    data = remainingBytes;
  } while (data.byteLength > 0);
}
