import type { CID } from "multiformats";
import { z } from "zod";
import { schema as common } from "@atp/common";
import { def as commonDef } from "@atp/common";
import type { RepoRecord } from "@atp/lexicon";
import type { BlockMap } from "./block-map.ts";
import type { CidSet } from "./cid-set.ts";

// Repo nodes
// ---------------

type UnsignedCommitType = z.ZodObject<{
  did: z.ZodString;
  version: z.ZodLiteral<3>;
  data: typeof common.cid;
  rev: z.ZodString;
  prev: z.ZodNullable<typeof common.cid>;
}, z.core.$strip>;
export type UnsignedCommit = z.infer<UnsignedCommitType> & { sig?: never };

const commit: CommitType = z.object({
  did: z.string(),
  version: z.literal(3),
  data: common.cid,
  rev: z.string(),
  prev: z.nullable(common.cid),
  sig: common.bytes,
});
type CommitType = z.ZodObject<{
  did: z.ZodString;
  version: z.ZodLiteral<3>;
  data: typeof common.cid;
  rev: z.ZodString;
  prev: z.ZodNullable<typeof common.cid>;
  sig: typeof common.bytes;
}, z.core.$strip>;
export type Commit = z.infer<CommitType>;

const legacyV2Commit: LegacyV2CommitType = z.object({
  did: z.string(),
  version: z.literal(2),
  data: common.cid,
  rev: z.string().optional(),
  prev: z.nullable(common.cid),
  sig: common.bytes,
});
type LegacyV2CommitType = z.ZodObject<{
  did: z.ZodString;
  version: z.ZodLiteral<2>;
  data: typeof common.cid;
  rev: z.ZodOptional<z.ZodString>;
  prev: z.ZodNullable<typeof common.cid>;
  sig: typeof common.bytes;
}, z.core.$strip>;
export type LegacyV2Commit = z.infer<LegacyV2CommitType>;

const versionedCommit: VersionedCommitType = z.discriminatedUnion("version", [
  commit,
  legacyV2Commit,
]);
type VersionedCommitType = z.ZodDiscriminatedUnion<
  [CommitType, LegacyV2CommitType],
  "version"
>;
export type VersionedCommit = z.infer<VersionedCommitType>;

export const schema = {
  ...common,
  commit,
  legacyV2Commit,
  versionedCommit,
};

export const def = {
  ...commonDef,
  commit: {
    name: "commit",
    schema: schema.commit,
  },
  versionedCommit: {
    name: "versioned_commit",
    schema: schema.versionedCommit,
  },
};

// Repo Operations
// ---------------

export enum WriteOpAction {
  Create = "create",
  Update = "update",
  Delete = "delete",
}

export type RecordCreateOp = {
  action: WriteOpAction.Create;
  collection: string;
  rkey: string;
  record: RepoRecord;
};

export type RecordUpdateOp = {
  action: WriteOpAction.Update;
  collection: string;
  rkey: string;
  record: RepoRecord;
};

export type RecordDeleteOp = {
  action: WriteOpAction.Delete;
  collection: string;
  rkey: string;
};

export type RecordWriteOp = RecordCreateOp | RecordUpdateOp | RecordDeleteOp;

export type RecordCreateDescript = {
  action: WriteOpAction.Create;
  collection: string;
  rkey: string;
  cid: CID;
};

export type RecordUpdateDescript = {
  action: WriteOpAction.Update;
  collection: string;
  rkey: string;
  prev: CID;
  cid: CID;
};

export type RecordDeleteDescript = {
  action: WriteOpAction.Delete;
  collection: string;
  rkey: string;
  cid: CID;
};

export type RecordWriteDescript =
  | RecordCreateDescript
  | RecordUpdateDescript
  | RecordDeleteDescript;

export type WriteLog = RecordWriteDescript[][];

// Updates/Commits
// ---------------

export type CommitData = {
  cid: CID;
  rev: string;
  since: string | null;
  prev: CID | null;
  newBlocks: BlockMap;
  relevantBlocks: BlockMap;
  removedCids: CidSet;
};

export type RepoUpdate = CommitData & {
  ops: RecordWriteOp[];
};

export type CollectionContents = Record<string, RepoRecord>;
export type RepoContents = Record<string, CollectionContents>;

export type RepoRecordWithCid = { cid: CID; value: RepoRecord };
export type CollectionContentsWithCids = Record<string, RepoRecordWithCid>;
export type RepoContentsWithCids = Record<string, CollectionContentsWithCids>;

export type DatastoreContents = Record<string, CID>;

export type RecordPath = {
  collection: string;
  rkey: string;
};

export type RecordCidClaim = {
  collection: string;
  rkey: string;
  cid: CID | null;
};

export type RecordClaim = {
  collection: string;
  rkey: string;
  record: RepoRecord | null;
};

// Sync
// ---------------

export type VerifiedDiff = {
  writes: RecordWriteDescript[];
  commit: CommitData;
};

export type VerifiedRepo = {
  creates: RecordCreateDescript[];
  commit: CommitData;
};

export type CarBlock = {
  cid: CID;
  bytes: Uint8Array;
};
