import { CID } from "multiformats/cid";

export const DAG_CBOR_MULTICODEC = 0x71;
export const RAW_BIN_MULTICODEC = 0x55;
export const SHA2_256_MULTIHASH_CODE = 0x12;

export type MultihashDigest<Code extends number = number> = {
  code: Code;
  digest: Uint8Array;
  size: number;
  bytes: Uint8Array;
};

export interface Cid {
  version: 0 | 1;
  code: number;
  multihash: MultihashDigest;
  bytes: Uint8Array;
  equals(other: unknown): boolean;
  toString(): string;
}

export interface CidParseOptions {
  strict?: boolean;
}

export function asCid(value: unknown): Cid | null {
  return CID.asCID(value) as Cid | null;
}

export function parseCid(input: string, options?: CidParseOptions): Cid {
  const cid = CID.parse(input) as Cid;
  if (!isCid(cid, options)) {
    throw new Error(`Invalid CID string`);
  }
  return cid;
}

export function parseCidSafe(
  input: string,
  options?: CidParseOptions,
): Cid | null {
  try {
    return parseCid(input, options);
  } catch {
    return null;
  }
}

export function decodeCid(bytes: Uint8Array): Cid {
  return CID.decode(bytes) as Cid;
}

export function createCid(code: number, digest: MultihashDigest): Cid {
  return CID.createV1(code, digest) as Cid;
}

export function isCid(
  value: unknown,
  options?: CidParseOptions,
): value is Cid {
  const cid = asCid(value);
  if (!cid) return false;

  if (options?.strict) {
    if (cid.version !== 1) return false;
    if (cid.code !== RAW_BIN_MULTICODEC && cid.code !== DAG_CBOR_MULTICODEC) {
      return false;
    }
    if (cid.multihash.code !== SHA2_256_MULTIHASH_CODE) return false;
  }

  return true;
}

export function validateCidString(
  input: string,
  options?: CidParseOptions,
): boolean {
  return parseCidSafe(input, options)?.toString() === input;
}

export function ensureValidCidString(
  input: string,
  options?: CidParseOptions,
): void {
  if (!validateCidString(input, options)) {
    throw new Error(`Invalid CID string`);
  }
}
