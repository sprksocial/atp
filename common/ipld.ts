import { concat, equals } from "@atp/bytes";
import {
  cidForCbor as cidForCborBytes,
  cidForRawHash,
  decode as decodeLexCbor,
  encode as encodeLexCbor,
  parseCidFromBytes as parseDaslCidFromBytes,
  verifyCidForBytes as verifyLexCidForBytes,
} from "@atp/lex/cbor";
import {
  asCid,
  type Cid,
  createCid,
  isPlainObject,
  type LexMap,
  type LexValue,
  SHA2_256_MULTIHASH_CODE,
  validateCidString,
} from "@atp/lex/data";
import {
  encodeLexBytes,
  encodeLexLink,
  parseLexBytes,
  parseLexLink,
} from "@atp/lex/json";
import { create as createDigest } from "multiformats/hashes/digest";

export type CborBlock<T = unknown> = {
  cid: Cid;
  bytes: Uint8Array;
  value: T;
};

export const cborEncode = <T = unknown>(data: T): Uint8Array => {
  return encodeLexCbor(normalizeLexValue(data) as LexValue);
};

export const cborDecode = <T = unknown>(bytes: Uint8Array): T => {
  return decodeLexCbor(bytes) as T;
};

export const dataToCborBlock = async <T = unknown>(
  data: T,
): Promise<CborBlock<T>> => {
  const bytes = cborEncode(data);
  const cid = await cidForCborBytes(bytes);
  return { cid, bytes, value: data };
};

export const cidForCbor = async (data: unknown): Promise<Cid> => {
  return await cidForCborBytes(cborEncode(data));
};

export const isValidCid = (cidStr: string): boolean => {
  return validateCidString(cidStr);
};

export const cborBytesToRecord = (
  bytes: Uint8Array,
): Record<string, unknown> => {
  const val = cborDecode(bytes);
  if (!isPlainObject(val)) {
    throw new Error(`Expected object, got: ${val}`);
  }
  return val as Record<string, unknown>;
};

export const verifyCidForBytes = async (
  cid: Cid,
  bytes: Uint8Array,
): Promise<void> => {
  await verifyLexCidForBytes(cid, bytes);
};

export const sha256ToCid = (hash: Uint8Array, codec: number): Cid => {
  const digest = createDigest(SHA2_256_MULTIHASH_CODE, hash);
  return createCid(codec, digest);
};

export const sha256RawToCid = (hash: Uint8Array): Cid => {
  return cidForRawHash(hash);
};

export const parseCidFromBytes = (cidBytes: Uint8Array): Cid => {
  return parseDaslCidFromBytes(cidBytes);
};

export class VerifyCidTransform
  extends TransformStream<Uint8Array, Uint8Array> {
  private chunks: Uint8Array[] = [];

  constructor(public cid: Cid) {
    super({
      transform: (chunk: Uint8Array, controller) => {
        this.chunks.push(chunk);
        controller.enqueue(chunk);
      },
      flush: async (controller) => {
        try {
          const data = concat(this.chunks);
          const hash = new Uint8Array(
            await crypto.subtle.digest("SHA-256", new Uint8Array(data)),
          );
          const actual = sha256RawToCid(hash);
          if (!actual.equals(cid)) {
            controller.error(new VerifyCidError(cid, actual));
          }
        } catch (err) {
          controller.error(asError(err));
        }
      },
    });
  }
}

const asError = (err: unknown): Error =>
  err instanceof Error ? err : new Error("Unexpected error", { cause: err });

export class VerifyCidError extends Error {
  constructor(
    public expected: Cid,
    public actual: Cid,
  ) {
    super("Bad cid check");
  }
}

export type JsonValue =
  | boolean
  | number
  | string
  | null
  | undefined
  | unknown
  | Array<JsonValue>
  | { [key: string]: JsonValue };

export type IpldValue =
  | JsonValue
  | Cid
  | Uint8Array
  | Array<IpldValue>
  | { [key: string]: IpldValue };

export const jsonToIpld = (val: JsonValue): IpldValue => {
  if (Array.isArray(val)) {
    return val.map((item) => jsonToIpld(item));
  }
  if (val && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const link = parseLexLink(obj);
    if (link) {
      return link;
    }

    const bytes = parseLexBytes(obj);
    if (bytes) {
      return bytes;
    }

    const toReturn: Record<string, IpldValue> = {};
    for (const [key, value] of Object.entries(obj)) {
      toReturn[key] = jsonToIpld(value as JsonValue);
    }
    return toReturn;
  }
  return val;
};

export const ipldToJson = (val: IpldValue): JsonValue => {
  if (Array.isArray(val)) {
    return val.map((item) => ipldToJson(item));
  }
  if (val && typeof val === "object") {
    if (val instanceof Uint8Array) {
      return encodeLexBytes(val);
    }

    const cid = asCid(val);
    if (cid) {
      return encodeLexLink(cid);
    }

    const toReturn: Record<string, JsonValue> = {};
    for (
      const [key, value] of Object.entries(val as Record<string, IpldValue>)
    ) {
      toReturn[key] = ipldToJson(value);
    }
    return toReturn;
  }
  return val as JsonValue;
};

export const ipldEquals = (a: IpldValue, b: IpldValue): boolean => {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!ipldEquals(a[i], b[i])) return false;
    }
    return true;
  }

  if (a && b && typeof a === "object" && typeof b === "object") {
    if (a instanceof Uint8Array && b instanceof Uint8Array) {
      return equals(a, b);
    }

    const cidA = asCid(a);
    const cidB = asCid(b);
    if (cidA && cidB) {
      return cidA.equals(cidB);
    }

    const objA = a as Record<string, IpldValue>;
    const objB = b as Record<string, IpldValue>;
    if (Object.keys(objA).length !== Object.keys(objB).length) return false;
    for (const key of Object.keys(objA)) {
      if (!ipldEquals(objA[key], objB[key])) return false;
    }
    return true;
  }

  return a === b;
};

function normalizeLexValue(input: unknown): LexValue {
  if (input instanceof Uint8Array) {
    return input;
  }

  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(
      input.buffer,
      input.byteOffset,
      input.byteLength,
    );
  }

  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }

  if (Array.isArray(input)) {
    return input.map((item) => normalizeLexValue(item));
  }

  const cid = asCid(input);
  if (cid) {
    return cid;
  }

  if (isPlainObject(input)) {
    const normalized: LexMap = {};
    for (const [key, value] of Object.entries(input)) {
      normalized[key] = normalizeLexValue(value);
    }
    return normalized;
  }

  return input as LexValue;
}
