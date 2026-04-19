import type { Cid } from "@atp/lex/data";
import type { check } from "@atp/common";
import type { BlockMap } from "../block-map.ts";
import type { CommitData, RepoRecord } from "../types.ts";

export interface RepoStorage {
  // Writable
  getRoot(): Cid | null;
  putBlock(cid: Cid, block: Uint8Array, rev: string): void;
  putMany(blocks: BlockMap, rev: string): void;
  updateRoot(cid: Cid, rev: string): void;
  applyCommit(commit: CommitData): void;

  // Readable
  getBytes(cid: Cid): Uint8Array | null;
  has(cid: Cid): boolean;
  getBlocks(cids: Cid[]): { blocks: BlockMap; missing: Cid[] };
  attemptRead<T>(
    cid: Cid,
    def: check.Def<T>,
  ): { obj: T; bytes: Uint8Array } | null;
  readObjAndBytes<T>(
    cid: Cid,
    def: check.Def<T>,
  ): { obj: T; bytes: Uint8Array };
  readObj<T>(cid: Cid, def: check.Def<T>): T;
  attemptReadRecord(cid: Cid): RepoRecord | null;
  readRecord(cid: Cid): RepoRecord;
}

export interface BlobStore {
  putTemp(bytes: Uint8Array | ReadableStream): Promise<string>;
  makePermanent(key: string, cid: Cid): Promise<void>;
  putPermanent(cid: Cid, bytes: Uint8Array | ReadableStream): Promise<void>;
  quarantine(cid: Cid): Promise<void>;
  unquarantine(cid: Cid): Promise<void>;
  getBytes(cid: Cid): Uint8Array;
  getStream(cid: Cid): Promise<ReadableStream>;
  hasTemp(key: string): Promise<boolean>;
  hasStored(cid: Cid): Promise<boolean>;
  delete(cid: Cid): Promise<void>;
  deleteMany(cid: Cid[]): Promise<void>;
}

export class BlobNotFoundError extends Error {}
