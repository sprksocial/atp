import type { CID } from "multiformats/cid";
import type { DidDocument } from "@atp/identity";
import type { RepoRecord } from "@atp/lexicon";
import type { BlockMap } from "@atp/repo";
import type { AtUri } from "@atp/syntax";

/** Broad sync event type for all sync events */
export type Event = CommitEvt | SyncEvt | IdentityEvt | AccountEvt;

/**
 * Metadata for a {@link CommitEvt}
 * @prop seq
 *   Event Sequence Number
 *   @see {@link https://atproto.com/specs/event-stream#sequence-numbers}
 * @prop time Time of the Commit Event
 * @prop commit CID of the Commit
 * @prop blocks CAR "slice" for the corresponding repo diff
 * @prop rev Repo revision identifier as a TID
 * @prop uri AT URI of the record committed
 * @prop did DID of the repository
 * @prop collection Collection (lexicon) of the record
 * @prop rkey Record Key of the record
 */
export type CommitMeta = {
  seq: number;
  time: string;
  commit: CID;
  blocks: BlockMap;
  rev: string;
  uri: AtUri;
  did: string;
  collection: string;
  rkey: string;
};

/** {@link Event} for all commit events */
export type CommitEvt = Create | Update | Delete;

/** {@link CommitEvt} for record creation */
export type Create = CommitMeta & {
  event: "create";
  record: RepoRecord;
  cid: CID;
};

/** {@link CommitEvt} for record updates/edits */
export type Update = CommitMeta & {
  event: "update";
  record: RepoRecord;
  cid: CID;
};

/** {@link CommitEvt} for record deletions */
export type Delete = CommitMeta & {
  event: "delete";
};

/**
 * {@link Event} for repository sync events
 * @prop seq
 *   Event Sequence Number
 *   @see {@link https://atproto.com/specs/event-stream#sequence-numbers}
 * @prop time Time of sync event
 * @prop event Type of event
 * @prop did Repository of event
 * @prop cid CID of event
 * @prop rev Repository revision identifier as a TID
 * @prop blocks CAR "slice" for the corresponding repo diff
 */
export type SyncEvt = {
  seq: number;
  time: string;
  event: "sync";
  did: string;
  cid: CID;
  rev: string;
  blocks: BlockMap;
};

/**
 * {@link Event} for identity change events
 * @prop seq
 *   Event Sequence Number
 *   @see {@link https://atproto.com/specs/event-stream#sequence-numbers}
 * @prop time Time of sync event
 * @prop event Type of event
 * @prop did Repository of event
 * @prop handle Handle corresponding to DID
 * @prop didDocument DID Document corresponding to DID
 */
export type IdentityEvt = {
  seq: number;
  time: string;
  event: "identity";
  did: string;
  handle?: string;
  didDocument?: DidDocument;
};

/**
 * @prop seq
 *   Event Sequence Number
 *   @see {@link https://atproto.com/specs/event-stream#sequence-numbers}
 * @prop time Time of sync event
 * @prop event Type of event
 * @prop did Repository of event
 * @prop active Whether account has been activated or is deactivated
 * @prop status Current Account Status of the repository
 */
export type AccountEvt = {
  seq: number;
  time: string;
  event: "account";
  did: string;
  active: boolean;
  status?: AccountStatus;
};

/** Upstream status of an account */
export type AccountStatus =
  | "takendown"
  | "suspended"
  | "deleted"
  | "deactivated";
