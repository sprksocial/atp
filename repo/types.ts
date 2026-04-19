import { asCid, type Cid } from "@atp/lex/data";
import { z } from "zod";
import { def as commonDef } from "@atp/common";
import type { BlobRef, LegacyBlobRef } from "@atp/lex";
import type { BlobRef as LexiconBlobRef } from "@atp/lexicon";
import type { BlockMap } from "./block-map.ts";
import type { CidSet } from "./cid-set.ts";

export type LexScalar =
  | number
  | string
  | boolean
  | null
  | Cid
  | Uint8Array
  | BlobRef
  | LegacyBlobRef;

export type LexValue =
  | LexScalar
  | LexValue[]
  | { [key: string]: LexValue | undefined };

export interface RepoRecord {
  [key: string]: LexValue | undefined;
}

export type RepoInputScalar = LexScalar | LexiconBlobRef;

export type RepoInputValue =
  | RepoInputScalar
  | RepoInputValue[]
  | { [key: string]: RepoInputValue | undefined };

export interface RepoInputRecord {
  [key: string]: RepoInputValue | undefined;
}

type CidSchema = z.ZodPipe<z.ZodUnknown, z.ZodTransform<Cid, unknown>>;
type BytesSchema = z.ZodCustom<
  Uint8Array<ArrayBufferLike>,
  Uint8Array<ArrayBufferLike>
>;
type NullableCidSchema = z.ZodNullable<CidSchema>;
type CommitShape<
  Version extends 2 | 3,
  Rev extends z.ZodString | z.ZodOptional<z.ZodString>,
> = {
  did: z.ZodString;
  version: z.ZodLiteral<Version>;
  data: CidSchema;
  rev: Rev;
  prev: NullableCidSchema;
};
type UnsignedCommitSchema = z.ZodObject<
  CommitShape<3, z.ZodString>,
  z.core.$strip
>;
type CommitSchema = z.ZodObject<
  CommitShape<3, z.ZodString> & { sig: BytesSchema },
  z.core.$strip
>;
type LegacyV2CommitSchema = z.ZodObject<
  CommitShape<2, z.ZodOptional<z.ZodString>> & { sig: BytesSchema },
  z.core.$strip
>;
type VersionedCommitSchema = z.ZodDiscriminatedUnion<
  readonly [CommitSchema, LegacyV2CommitSchema],
  "version"
>;

const cidSchema: CidSchema = z
  .unknown().transform((obj, ctx): Cid => {
    const cid = asCid(obj);

    if (cid == null) {
      ctx.addIssue({
        code: "custom",
        message: "Not a valid CID",
      });
      return z.NEVER;
    }

    return cid;
  });

const bytesSchema: BytesSchema = z.custom<Uint8Array>((value) =>
  value instanceof Uint8Array
);
const stringSchema: z.ZodString = z.string();
const arraySchema: z.ZodArray<z.ZodUnknown> = z.array(z.unknown());
const mapSchema: z.ZodRecord<z.ZodString, z.ZodUnknown> = z.record(
  z.string(),
  z.unknown(),
);
const unknownSchema: z.ZodUnknown = z.unknown();

const unsignedCommit: UnsignedCommitSchema = z.object({
  did: z.string(),
  version: z.literal(3),
  data: cidSchema,
  rev: z.string(),
  prev: z.nullable(cidSchema),
});
export type UnsignedCommit = z.infer<typeof unsignedCommit> & { sig?: never };

const commit: CommitSchema = z.object({
  did: z.string(),
  version: z.literal(3),
  data: cidSchema,
  rev: z.string(),
  prev: z.nullable(cidSchema),
  sig: bytesSchema,
});
export type Commit = z.infer<typeof commit>;

export type LegacyV2Commit = {
  did: string;
  version: 2;
  data: Cid;
  rev?: string | undefined;
  prev: Cid | null;
  sig: Uint8Array;
};

const legacyV2Commit: LegacyV2CommitSchema = z.object({
  did: z.string(),
  version: z.literal(2),
  data: cidSchema,
  rev: z.string().optional(),
  prev: z.nullable(cidSchema),
  sig: bytesSchema,
});

export type VersionedCommit = Commit | LegacyV2Commit;

const versionedCommit: VersionedCommitSchema = z.discriminatedUnion(
  "version",
  [commit, legacyV2Commit],
);

export const schema = {
  cid: cidSchema,
  bytes: bytesSchema,
  string: stringSchema,
  array: arraySchema,
  map: mapSchema,
  unknown: unknownSchema,
  commit,
  legacyV2Commit,
  versionedCommit,
};

export const def = {
  ...commonDef,
  cid: {
    name: "cid",
    schema: schema.cid,
  },
  bytes: {
    name: "bytes",
    schema: schema.bytes,
  },
  string: {
    name: "string",
    schema: schema.string,
  },
  map: {
    name: "map",
    schema: schema.map,
  },
  unknown: {
    name: "unknown",
    schema: schema.unknown,
  },
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
  record: RepoInputRecord;
};

export type RecordUpdateOp = {
  action: WriteOpAction.Update;
  collection: string;
  rkey: string;
  record: RepoInputRecord;
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
  cid: Cid;
};

export type RecordUpdateDescript = {
  action: WriteOpAction.Update;
  collection: string;
  rkey: string;
  prev: Cid;
  cid: Cid;
};

export type RecordDeleteDescript = {
  action: WriteOpAction.Delete;
  collection: string;
  rkey: string;
  cid: Cid;
};

export type RecordWriteDescript =
  | RecordCreateDescript
  | RecordUpdateDescript
  | RecordDeleteDescript;

export type WriteLog = RecordWriteDescript[][];

// Updates/Commits
// ---------------

export type CommitData = {
  cid: Cid;
  rev: string;
  since: string | null;
  prev: Cid | null;
  newBlocks: BlockMap;
  relevantBlocks: BlockMap;
  removedCids: CidSet;
};

export type RepoUpdate = CommitData & {
  ops: RecordWriteOp[];
};

export type CollectionContents = Record<string, RepoRecord>;
export type RepoContents = Record<string, CollectionContents>;

export type RepoRecordWithCid = { cid: Cid; value: RepoRecord };
export type CollectionContentsWithCids = Record<string, RepoRecordWithCid>;
export type RepoContentsWithCids = Record<string, CollectionContentsWithCids>;

export type DatastoreContents = Record<string, Cid>;

export type RecordPath = {
  collection: string;
  rkey: string;
};

export type RecordCidClaim = {
  collection: string;
  rkey: string;
  cid: Cid | null;
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
  cid: Cid;
  bytes: Uint8Array;
};
