import * as cborCodec from "@ipld/dag-cbor";
import * as mf from "multiformats";
import * as Block from "multiformats/block";
import { CID } from "multiformats/cid";
import * as rawCodec from "multiformats/codecs/raw";
import { sha256 } from "multiformats/hashes/sha2";
import { schema } from "./types.ts";
import * as check from "./check.ts";
import { crypto } from "@std/crypto";
import { concat, equals } from "@std/bytes";

export const cborEncode = cborCodec.encode;
export const cborDecode = cborCodec.decode;

export const dataToCborBlock = (
  data: unknown,
): Promise<mf.BlockView> => {
  return Block.encode({
    value: data,
    codec: cborCodec,
    hasher: sha256,
  });
};

export const cidForCbor = async (data: unknown): Promise<CID> => {
  const block = await dataToCborBlock(data);
  return block.cid;
};

export const isValidCid = (cidStr: string): boolean => {
  try {
    const parsed = CID.parse(cidStr);
    return parsed.toString() === cidStr;
  } catch {
    return false;
  }
};

export const cborBytesToRecord = (
  bytes: Uint8Array,
): Record<string, unknown> => {
  const val = cborDecode(bytes);
  if (!check.is(val, schema.map)) {
    throw new Error(`Expected object, got: ${val}`);
  }
  return val as Record<string, unknown>;
};

export const verifyCidForBytes = async (
  cid: CID,
  bytes: Uint8Array,
): Promise<void> => {
  const digest = await sha256.digest(bytes);
  const expected = CID.createV1(cid.code, digest);
  if (!cid.equals(expected)) {
    throw new Error(
      `Not a valid CID for bytes. Expected: ${expected} Got: ${cid}`,
    );
  }
};

export const sha256ToCid = (hash: Uint8Array, codec: number): CID => {
  const digest = mf.digest.create(sha256.code, hash);
  return CID.createV1(codec, digest);
};

export const sha256RawToCid = (hash: Uint8Array): CID => {
  return sha256ToCid(hash, rawCodec.code);
};

// @NOTE: Only supports DASL CIDs
// https://dasl.ing/cid.html
export const parseCidFromBytes = (cidBytes: Uint8Array): CID => {
  const version = cidBytes[0];
  if (version !== 0x01) {
    throw new Error(`Unsupported CID version: ${version}`);
  }
  const codec = cidBytes[1];
  if (codec !== 0x55 && codec !== 0x71) {
    throw new Error(`Unsupported CID codec: ${codec}`);
  }
  const hashType = cidBytes[2];
  if (hashType !== 0x12) {
    throw new Error(`Unsupported CID hash function: ${hashType}`);
  }
  const hashLength = cidBytes[3];
  if (hashLength !== 32) {
    throw new Error(`Unexpected CID hash length: ${hashLength}`);
  }
  const rest = cidBytes.slice(4);
  return sha256ToCid(rest, codec);
};

export class VerifyCidTransform
  extends TransformStream<Uint8Array, Uint8Array> {
  private chunks: Uint8Array[] = [];

  constructor(public cid: CID) {
    super({
      transform: (chunk: Uint8Array, controller) => {
        this.chunks.push(chunk);
        controller.enqueue(chunk);
      },
      flush: async (controller) => {
        try {
          const data = concat(this.chunks);
          const hash = new Uint8Array(
            await crypto.subtle.digest("SHA-256", data),
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
    public expected: CID,
    public actual: CID,
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
  | CID
  | Uint8Array
  | Array<IpldValue>
  | { [key: string]: IpldValue };

// @NOTE avoiding use of check.is() here only because it makes
// these implementations slow, and they often live in hot paths.

export const jsonToIpld = (val: JsonValue): IpldValue => {
  // walk arrays
  if (Array.isArray(val)) {
    return val.map((item) => jsonToIpld(item));
  }
  // objects
  if (val && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    // check for dag json values
    if (typeof obj["$link"] === "string" && Object.keys(obj).length === 1) {
      return CID.parse(obj["$link"]);
    }
    if (typeof obj["$bytes"] === "string" && Object.keys(obj).length === 1) {
      return new Uint8Array(
        atob(obj["$bytes"]).split("").map((c) => c.charCodeAt(0)),
      );
    }
    // walk plain objects
    const toReturn: Record<string, IpldValue> = {};
    for (const key of Object.keys(obj)) {
      toReturn[key] = jsonToIpld(obj[key] as JsonValue);
    }
    return toReturn;
  }
  // pass through
  return val;
};

export const ipldToJson = (val: IpldValue): JsonValue => {
  // walk arrays
  if (Array.isArray(val)) {
    return val.map((item) => ipldToJson(item));
  }
  // objects
  if (val && typeof val === "object") {
    // convert bytes
    if (val instanceof Uint8Array) {
      return {
        $bytes: btoa(String.fromCharCode(...val)).replace(/=+$/, ""),
      };
    }
    // convert cids
    if (CID.asCID(val)) {
      return {
        $link: (val as CID).toString(),
      };
    }
    // walk plain objects
    const toReturn: Record<string, JsonValue> = {};
    for (const key of Object.keys(val as Record<string, unknown>)) {
      toReturn[key] = ipldToJson((val as Record<string, IpldValue>)[key]);
    }
    return toReturn;
  }
  // pass through
  return val as JsonValue;
};

export const ipldEquals = (a: IpldValue, b: IpldValue): boolean => {
  // walk arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!ipldEquals(a[i], b[i])) return false;
    }
    return true;
  }
  // objects
  if (a && b && typeof a === "object" && typeof b === "object") {
    // check bytes
    if (a instanceof Uint8Array && b instanceof Uint8Array) {
      return equals(a, b);
    }
    // check cids
    if (CID.asCID(a) && CID.asCID(b)) {
      return CID.asCID(a)!.equals(CID.asCID(b)!);
    }
    // walk plain objects
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
