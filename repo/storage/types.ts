import type { CID } from "multiformats/cid";
import type { check } from "@atp/common";
import type { RepoRecord } from "@atp/lexicon";
import type { BlockMap } from "../block-map.ts";
import type { CommitData } from "../types.ts";

export interface RepoStorage {
  // Writable
  getRoot(): CID | null;
  putBlock(cid: CID, block: Uint8Array, rev: string): void;
  putMany(blocks: BlockMap, rev: string): void;
  updateRoot(cid: CID, rev: string): void;
  applyCommit(commit: CommitData): void;

  // Readable
  getBytes(cid: CID): Uint8Array | null;
  has(cid: CID): boolean;
  getBlocks(cids: CID[]): { blocks: BlockMap; missing: CID[] };
  attemptRead<T>(
    cid: CID,
    def: check.Def<T>,
  ): { obj: T; bytes: Uint8Array } | null;
  readObjAndBytes<T>(
    cid: CID,
    def: check.Def<T>,
  ): { obj: T; bytes: Uint8Array };
  readObj<T>(cid: CID, def: check.Def<T>): T;
  attemptReadRecord(cid: CID): RepoRecord | null;
  readRecord(cid: CID): RepoRecord;
}

export interface BlobStore {
  putTemp(bytes: Uint8Array | ReadableStream): Promise<string>;
  makePermanent(key: string, cid: CID): Promise<void>;
  putPermanent(cid: CID, bytes: Uint8Array | ReadableStream): Promise<void>;
  quarantine(cid: CID): Promise<void>;
  unquarantine(cid: CID): Promise<void>;
  getBytes(cid: CID): Uint8Array;
  getStream(cid: CID): Promise<ReadableStream>;
  hasTemp(key: string): Promise<boolean>;
  hasStored(cid: CID): Promise<boolean>;
  delete(cid: CID): Promise<void>;
  deleteMany(cid: CID[]): Promise<void>;
}

export class BlobNotFoundError extends Error {}
