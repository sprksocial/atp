import * as cbor from "@ipld/dag-cbor";
import { cborDecode, check, cidForCbor, schema, TID } from "@atp/common";
import * as crypto from "@atp/crypto";
import type { Keypair } from "@atp/crypto";
import {
  ipldToLex,
  lexToIpld,
  type LexValue,
  type RepoRecord,
} from "@atp/lexicon";
import type { DataDiff } from "./data-diff.ts";
import {
  type Commit,
  type LegacyV2Commit,
  type RecordCreateDescript,
  type RecordDeleteDescript,
  type RecordPath,
  type RecordUpdateDescript,
  type RecordWriteDescript,
  type UnsignedCommit,
  WriteOpAction,
} from "./types.ts";
import type { CID } from "multiformats/basics";

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
  const encoded = cbor.encode(unsigned);
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
  const encoded = cbor.encode(rest);
  return crypto.verifySignature(didKey, encoded, sig as Uint8Array);
};

/**
 * Converts CBOR-encoded bytes to a LexValue using {@linkcode ipldToLex}.
 */
export const cborToLex = (val: Uint8Array): LexValue => {
  return ipldToLex(cborDecode(val));
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

export const cidForRecord = async (val: LexValue): Promise<CID> => {
  return await cidForCbor(lexToIpld(val));
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
