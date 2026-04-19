import {
  cidForLex,
  decode as decodeLexCbor,
  encode as encodeLexCbor,
  type LexValue as EncodableLexValue,
} from "@atp/lex/cbor";
import { asCid, type Cid } from "@atp/lex/data";
import { check, schema, TID } from "@atp/common";
import * as crypto from "@atp/crypto";
import type { Keypair } from "@atp/crypto";
import { BlobRef as LexiconBlobRef } from "@atp/lexicon";
import type { DataDiff } from "./data-diff.ts";
import {
  type Commit,
  type LegacyV2Commit,
  type LexValue,
  type RecordCreateDescript,
  type RecordDeleteDescript,
  type RecordPath,
  type RecordUpdateDescript,
  type RecordWriteDescript,
  type RepoInputRecord,
  type RepoInputValue,
  type RepoRecord,
  type UnsignedCommit,
  WriteOpAction,
} from "./types.ts";

/**
 * Converts a DataDiff of a repo three arrays of RecordWriteDescripts,
 * for creates, updates, and deletes in the diff.
 */
export const diffToWriteDescripts = (
  diff: DataDiff,
): Promise<RecordWriteDescript[]> => {
  return Promise.all([
    ...diff.addList().map((add) => {
      const { collection, rkey } = parseDataKey(add.key);
      return {
        action: WriteOpAction.Create,
        collection,
        rkey,
        cid: add.cid,
      } as RecordCreateDescript;
    }),
    ...diff.updateList().map((upd) => {
      const { collection, rkey } = parseDataKey(upd.key);
      return {
        action: WriteOpAction.Update,
        collection,
        rkey,
        cid: upd.cid,
        prev: upd.prev,
      } as RecordUpdateDescript;
    }),
    ...diff.deleteList().map((del) => {
      const { collection, rkey } = parseDataKey(del.key);
      return {
        action: WriteOpAction.Delete,
        collection,
        rkey,
        cid: del.cid,
      } as RecordDeleteDescript;
    }),
  ]);
};

/**
 * Ensures that all write operations given are create actions.
 * @throws If any write operation is not a create action.
 */
export const ensureCreates = (
  descripts: RecordWriteDescript[],
): RecordCreateDescript[] => {
  const creates: RecordCreateDescript[] = [];
  for (const descript of descripts) {
    if (descript.action !== WriteOpAction.Create) {
      throw new Error(`Unexpected action: ${descript.action}`);
    } else {
      creates.push(descript);
    }
  }
  return creates;
};

export const parseDataKey = (key: string): RecordPath => {
  const parts = key.split("/");
  if (parts.length !== 2) throw new Error(`Invalid record key: ${key}`);
  return { collection: parts[0], rkey: parts[1] };
};

export const formatDataKey = (collection: string, rkey: string): string => {
  return collection + "/" + rkey;
};

export const metaEqual = (a: Commit, b: Commit): boolean => {
  return a.did === b.did && a.version === b.version;
};

/**
 * Generates a signature for an unsigned commit using the provided keypair.
 */
export const signCommit = (
  unsigned: UnsignedCommit,
  keypair: Keypair,
): Commit => {
  const encoded = encodeLexCbor(
    lexToCborValue(unsigned) as EncodableLexValue,
  );
  const sig = keypair.sign(encoded);
  return {
    ...unsigned,
    sig,
  };
};

/**
 * Ensures a commit is authenticated by verifying its signature
 * against the provided DID key.
 */
export const verifyCommitSig = (
  commit: Commit,
  didKey: string,
): boolean => {
  const { sig, ...rest } = commit;
  const encoded = encodeLexCbor(
    lexToCborValue(rest) as EncodableLexValue,
  );
  return crypto.verifySignature(didKey, encoded, sig as Uint8Array);
};

export const lexToCborValue = (value: RepoInputValue): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => lexToCborValue(item));
  }
  if (value && typeof value === "object") {
    if (value instanceof LexiconBlobRef) {
      return value.original;
    }
    if (asCid(value) || value instanceof Uint8Array) {
      return value;
    }
    const mapped: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) {
        mapped[key] = lexToCborValue(item);
      }
    }
    return mapped;
  }
  return value;
};

/**
 * Converts CBOR-encoded bytes to a LexValue using {@linkcode ipldToLex}.
 */
export const cborToLex = (val: Uint8Array): LexValue => {
  return decodeLexCbor(val) as LexValue;
};

/**
 * Converts CBOR-encoded record bytes to a RepoRecord using {@linkcode cborToLex}.
 * Validates that the parsed value is a valid RepoRecord.
 */
export const cborToLexRecord = (val: Uint8Array): RepoRecord => {
  const parsed = cborToLex(val);
  if (!check.is(parsed, schema.map)) {
    throw new Error("lexicon records be a json object");
  }
  return parsed as RepoRecord;
};

export const cidForRecord = async (val: RepoInputRecord): Promise<Cid> => {
  return await cidForLex(
    lexToCborValue(val) as EncodableLexValue,
  );
};

export const ensureV3Commit = (commit: LegacyV2Commit | Commit): Commit => {
  if (commit.version === 3) {
    return commit;
  } else {
    return {
      ...commit,
      version: 3,
      rev: commit.rev ?? TID.nextStr(),
    };
  }
};
