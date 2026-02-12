import type { CID } from "multiformats/cid";
import type { WebSocketOptions } from "@atp/xrpc-server";
import { createDeferrable, type Deferrable, wait } from "@atp/common";
import {
  type DidDocument,
  type IdResolver,
  parseToAtprotoDocument,
} from "@atp/identity";
import {
  cborToLexRecord,
  formatDataKey,
  parseDataKey,
  readCar,
  readCarWithRoot,
  RepoVerificationError,
  verifyProofs,
} from "@atp/repo";
import { AtUri } from "@atp/syntax";
import { Subscription } from "@atp/xrpc-server";
import type {
  AccountEvt,
  AccountStatus,
  CommitEvt,
  CommitMeta,
  Event,
  IdentityEvt,
  SyncEvt,
} from "../events.ts";
import type { EventRunner } from "../runner/index.ts";
import { SyncTelemetry, type SyncTelemetryOptions } from "../telemetry.ts";
import { didAndSeqForEvt } from "../util.ts";
import {
  type Account,
  type Commit,
  type Identity,
  isAccount,
  isCommit,
  isIdentity,
  isSync,
  isValidRepoEvent,
  type RepoEvent,
  type RepoOp,
  type Sync,
} from "./lexicons.ts";

/**
 * The options for the firehose.
 * @property idResolver - used to resolve dids.
 * @property handleEvent - Handles indexing logic for each event after it is parsed and authenticated.
 * @property onError - Handles logic for non-fatal errors that are encountered. In most cases, these can just be logged.
 * @property getCursor - Logic for retrieving the start cursor. Not allowed if runner is provided.
 * @property runner -  In-memory partitioned queue for processing events from different repos concurrently.
 * @property service - Relay service URL. Defaults to Bluesky's `wss://bsky.network`
 * @property subscriptionReconnectDelay - Delay in milliseconds before reconnecting to the firehose after a disconnection. Defaults to 3000ms.
 * @property unauthenticatedCommits - Whether to allow unauthenticated commits. Defaults to false, only recommended for testing.
 * @property unauthenticatedHandles - Whether to allow unauthenticated handles. Defaults to false, only recommended for testing.
 * @property filterCollections - Client-side filtering of lexicon record collections to include in event handling. Filtering happens client-side. Defaults to an empty array.
 * @property excludeIdentity - Excludes identity events from handling. Defaults to false.
 * @property excludeAccount - Excludes account events from handling. Defaults to false.
 * @property excludeCommit - Excludes commit events from handling. Defaults to false.
 * @property excludeSync - Excludes repo sync events from handling. Defaults to false.
 */
export type FirehoseOptions = WebSocketOptions & {
  idResolver: IdResolver;

  handleEvent: (evt: Event) => Awaited<void>;
  onError: (err: Error) => void;
  getCursor?: () => Awaited<number | undefined>;

  runner?: EventRunner; // should only set getCursor *or* runner

  service?: string;
  subscriptionReconnectDelay?: number;

  unauthenticatedCommits?: boolean;
  unauthenticatedHandles?: boolean;

  filterCollections?: string[];
  excludeIdentity?: boolean;
  excludeAccount?: boolean;
  excludeCommit?: boolean;
  excludeSync?: boolean;
  telemetry?: SyncTelemetryOptions;
};

/**
 * The firehose class will spin up a websocket connection to
 * com.atproto.sync.subscribeRepos on a given repo host
 * (by default the Relay run by Bluesky).
 * Each event will be parsed, authenticated, and then passed on to the
 * supplied handleEvent which can handle indexing logic.
 * On Commit events, the firehose will verify signatures and repo proofs
 * to ensure that the event is authentic. This can be disabled with the
 * unauthenticatedCommits flag. Similarly on Identity events, the firehose
 * will fetch the latest DID document for the repo and do bidirectional
 * verification on the associated handle. This can be disabled with the
 * unauthenticatedHandles flag.
 *
 * Events of a certain type can be excluded using the
 * excludeIdentity/excludeAccount/excludeCommit flags.
 *
 * And repo writes can be filtered down to specific collections using
 * filterCollections. By default, all events are parsed and passed
 * through to the handler. Note that this filtered currently happens
 * client-side, though it is likely we will introduce server-side
 * methods for doing so in the future.
 *
 * When using the firehose class, events are processed serially.
 * Each event must be finished being handled before the next one is parsed
 * and authenticated.
 *
 * @example Simple indexing service
 * ```typescript
 * import { Firehose } from '@atproto/sync'
 * import { IdResolver } from '@atproto/identity'
 *
 * const idResolver = new IdResolver()
 * const firehose = new Firehose({
 *   idResolver,
 *   service: 'wss://bsky.network',
 *   handleEvt: async (evt) => {
 *     if (evt.event === 'identity') {
 *       // ...
 *     } else if (evt.event === 'account') {
 *       // ...
 *     } else if (evt.event === 'create') {
 *       // ...
 *     } else if (evt.event === 'update') {
 *       // ...
 *     } else if (evt.event === 'delete') {
 *       // ...
 *     }
 *   },
 *   onError: (err) => {
 *     console.error(err)
 *   },
 *   filterCollections: ['com.myexample.app'],
 * })
 * firehose.start()
 *
 * // on service shutdown
 * await firehose.destroy()
 * ```
 *
 * For more robust indexing pipelines, it's recommended to use the
 * supplied MemoryRunner class. This provides an in-memory partitioned
 * queue. As events from a given repo must be processed in order, this
 * allows events to be processed concurrently while still processing
 * events from any given repo serially.
 *
 * The MemoryRunner also tracks an internal cursor based on the last
 * finished consecutive work. This ensures that no events are dropped,
 * although it does mean that some events may occassionally be replayed
 * (if the websocket drops and reconnects) and therefore it's recommended
 * that any indexing logic is idempotent. An optional setCursor parameter
 * may be supplied to the MemoryRunner which can be used to persistently
 * store the most recently processed cursor.
 *
 * @example Indexing with MemoryRunner
 * ```typescript
 * import { Firehose, MemoryRunner } from '@atproto/sync'
 * import { IdResolver } from '@atproto/identity'
 *
 * const idResolver = new IdResolver()
 * const runner = new MemoryRunner({
 *   setCursor: (cursor) => {
 *     // persist cursor
 *   },
 * })
 * const firehose = new Firehose({
 *   idResolver,
 *   runner,
 *   service: 'wss://bsky.network',
 *   handleEvt: async (evt) => {
 *     // ...
 *   },
 *   onError: (err) => {
 *     console.error(err)
 *   },
 * })
 * firehose.start()
 *
 * // on service shutdown
 * await firehose.destroy()
 * await runner.destroy()
 * ```
 * @property service - The service URL for the firehose.
 * @property runner - The runner for the firehose.
 * @property idResolver - The ID resolver for the firehose.
 * @property opts - The options for the firehose.
 */
export class Firehose {
  private sub: Subscription<RepoEvent>;
  private abortController: AbortController;
  private destoryDefer: Deferrable;
  private matchCollection: ((col: string) => boolean) | null = null;
  private telemetry: SyncTelemetry;

  constructor(public opts: FirehoseOptions) {
    this.destoryDefer = createDeferrable();
    this.abortController = new AbortController();
    const runnerTelemetry = this.opts.runner?.getTelemetry?.();
    if (runnerTelemetry) {
      if (opts.telemetry !== undefined) {
        throw new Error(
          "Telemetry configured on both Firehose and runner. Configure telemetry in one place.",
        );
      }
      this.telemetry = runnerTelemetry;
    } else {
      this.telemetry = new SyncTelemetry(opts.telemetry);
      this.opts.runner?.setTelemetry?.(this.telemetry);
    }
    if (this.opts.getCursor && this.opts.runner) {
      throw new Error("Must set only `getCursor` or `runner`");
    }
    if (opts.filterCollections) {
      const exact = new Set<string>();
      const prefixes: string[] = [];

      for (const pattern of opts.filterCollections) {
        if (pattern.endsWith(".*")) {
          prefixes.push(pattern.slice(0, -2));
        } else {
          exact.add(pattern);
        }
      }
      this.matchCollection = (col: string): boolean => {
        if (exact.has(col)) return true;
        for (const prefix of prefixes) {
          if (col.startsWith(prefix)) return true;
        }
        return false;
      };
    }
    this.sub = new Subscription({
      ...opts,
      service: opts.service ?? "wss://bsky.network",
      method: "com.atproto.sync.subscribeRepos",
      signal: this.abortController.signal,
      getParams: () => {
        const getCursorFn = () =>
          this.opts.runner?.getCursor() ?? this.opts.getCursor;
        if (!getCursorFn) {
          return undefined;
        }
        const cursor = getCursorFn();
        return { cursor };
      },
      validate: (value: unknown) => {
        try {
          return isValidRepoEvent(value);
        } catch (err) {
          this.telemetry.recordError("validation");
          this.opts.onError(new FirehoseValidationError(err, value));
        }
      },
    });
  }

  async start(): Promise<void> {
    try {
      for await (const evt of this.sub) {
        const eventType = getRepoEventType(evt);
        this.telemetry.recordEventReceived(eventType);
        const eventContext = this.telemetry.activeContext();
        if (this.opts.runner) {
          const parsed = didAndSeqForEvt(evt);
          if (!parsed) {
            continue;
          }
          this.opts.runner.trackEvent(
            parsed.did,
            parsed.seq,
            async () => {
              await this.telemetry.withContext(eventContext, async () => {
                await this.processEvt(evt, eventType);
              });
            },
          );
        } else {
          await this.telemetry.withContext(eventContext, async () => {
            await this.processEvt(evt, eventType);
          });
        }
      }
    } catch (err) {
      if (
        err &&
        (err as Record<string, unknown>)["name"] === "AbortError"
      ) {
        this.destoryDefer.resolve();
        return;
      }
      this.telemetry.recordError("subscription");
      this.opts.onError(new FirehoseSubscriptionError(err));
      await wait(this.opts.subscriptionReconnectDelay ?? 3000);
      return this.start();
    }
  }

  private async parseEvt(
    evt: RepoEvent,
    eventType: string,
  ): Promise<{ events: Event[]; outcome: "ok" | "error" }> {
    try {
      if (isCommit(evt) && !this.opts.excludeCommit) {
        const events = this.opts.unauthenticatedCommits
          ? await parseCommitUnauthenticated(evt, this.matchCollection)
          : await parseCommitAuthenticated(
            this.opts.idResolver,
            evt,
            this.matchCollection,
          );
        return { events, outcome: "ok" };
      } else if (isAccount(evt) && !this.opts.excludeAccount) {
        const parsed = parseAccount(evt);
        return { events: parsed ? [parsed] : [], outcome: "ok" };
      } else if (isIdentity(evt) && !this.opts.excludeIdentity) {
        const parsed = await parseIdentity(
          this.opts.idResolver,
          evt,
          this.opts.unauthenticatedHandles,
        );
        return { events: parsed ? [parsed] : [], outcome: "ok" };
      } else if (isSync(evt) && !this.opts.excludeSync) {
        const parsed = await parseSync(evt);
        return { events: parsed ? [parsed] : [], outcome: "ok" };
      } else {
        return { events: [], outcome: "ok" };
      }
    } catch (err) {
      this.telemetry.recordError("parse", eventType);
      this.opts.onError(new FirehoseParseError(err, evt));
      return { events: [], outcome: "error" };
    }
  }

  private async processEvt(
    evt: RepoEvent,
    eventType: string,
  ) {
    const parseStart = performance.now();
    const parsed = await this.parseEvt(evt, eventType);
    this.telemetry.recordParseDuration(
      performance.now() - parseStart,
      eventType,
      parsed.outcome,
    );
    this.telemetry.recordEventsParsed(parsed.events.length, eventType);
    for (const write of parsed.events) {
      const handleStart = performance.now();
      let outcome: "ok" | "error" = "ok";
      await this.telemetry.withSpan(
        "sync.firehose.event.handle",
        { event_type: write.event },
        async () => {
          await this.opts.handleEvent(write);
        },
      ).catch((err) => {
        outcome = "error";
        this.telemetry.recordError("handler", write.event);
        this.opts.onError(new FirehoseHandlerError(err, write));
      });
      this.telemetry.recordHandleDuration(
        performance.now() - handleStart,
        write.event,
        outcome,
      );
      this.telemetry.recordEventHandled(write.event, outcome);
    }
  }

  async destroy(): Promise<void> {
    this.abortController.abort();
    await this.destoryDefer.complete;
  }
}

/**
 * Parse a {@link Commit} object while authenticating the commit
 * @param idResolver Identity resolver for DIDs and handles
 * @param evt Commit event object to parse
 * @param matchCollection Lexicon collection to match record to
 * @param forceKeyRefresh Whether to force a refresh when resolving AT Protocol Key
 * @returns A parsed authenticated commit
 */
export const parseCommitAuthenticated = async (
  idResolver: IdResolver,
  evt: Commit,
  matchCollection?: ((col: string) => boolean) | null,
  forceKeyRefresh = false,
): Promise<CommitEvt[]> => {
  const did = evt.repo;
  const ops = maybeFilterOps(evt.ops, matchCollection);
  if (ops.length === 0) {
    return [];
  }
  const claims = ops.map((op) => {
    const { collection, rkey } = parseDataKey(op.path);
    return {
      collection,
      rkey,
      cid: op.action === "delete" ? null : op.cid,
    };
  });
  const key = await idResolver.did.resolveAtprotoKey(did, forceKeyRefresh);
  const verifiedCids: Record<string, CID | null> = {};
  try {
    const results = await verifyProofs(evt.blocks, claims, did, key);
    results.verified.forEach((op) => {
      const path = formatDataKey(op.collection, op.rkey);
      verifiedCids[path] = op.cid;
    });
  } catch (err) {
    if (err instanceof RepoVerificationError && !forceKeyRefresh) {
      return parseCommitAuthenticated(idResolver, evt, matchCollection, true);
    }
    throw err;
  }
  const verifiedOps: RepoOp[] = ops.filter((op) => {
    if (op.action === "delete") {
      return verifiedCids[op.path] === null;
    } else {
      return op.cid !== null && op.cid.equals(verifiedCids[op.path]);
    }
  });
  return formatCommitOps(evt, verifiedOps, {
    skipCidVerification: true, // already checked via verifyProofs()
  });
};

/**
 * Parse a {@link Commit} object without authenticating the commit
 * @param evt Commit event object to parse
 * @param matchCollection Lexicon collection to match record to
 * @returns A parsed commit
 */
export const parseCommitUnauthenticated = (
  evt: Commit,
  matchCollection?: ((col: string) => boolean) | null,
): Promise<CommitEvt[]> => {
  const ops = maybeFilterOps(evt.ops, matchCollection);
  return formatCommitOps(evt, ops);
};

const maybeFilterOps = (
  ops: RepoOp[],
  matchCollection?: ((col: string) => boolean) | null,
): RepoOp[] => {
  if (!matchCollection) return ops;
  return ops.filter((op) => {
    const { collection } = parseDataKey(op.path);
    return matchCollection(collection);
  });
};

const formatCommitOps = async (
  evt: Commit,
  ops: RepoOp[],
  options?: { skipCidVerification: boolean },
) => {
  const car = await readCar(evt.blocks, options);

  const evts: CommitEvt[] = [];

  for (const op of ops) {
    const uri = AtUri.make(evt.repo, op.path);

    const meta: CommitMeta = {
      seq: evt.seq,
      time: evt.time,
      commit: evt.commit,
      blocks: car.blocks,
      rev: evt.rev,
      uri,
      did: uri.host,
      collection: uri.collection,
      rkey: uri.rkey,
    };

    if (op.action === "create" || op.action === "update") {
      if (!op.cid) continue;
      const recordBytes = car.blocks.get(op.cid);
      if (!recordBytes) continue;
      const record = cborToLexRecord(recordBytes);
      evts.push({
        ...meta,
        event: op.action as "create" | "update",
        cid: op.cid,
        record,
      });
    }

    if (op.action === "delete") {
      evts.push({
        ...meta,
        event: "delete",
      });
    }
  }

  return evts;
};

/**
 * Parse {@link Sync} object to a sync event
 * @param evt Sync event to parse
 */
export const parseSync = async (evt: Sync): Promise<SyncEvt | null> => {
  const car = await readCarWithRoot(evt.blocks);

  return {
    event: "sync",
    seq: evt.seq,
    time: evt.time,
    did: evt.did,
    cid: car.root,
    rev: evt.rev,
    blocks: car.blocks,
  };
};

/**
 * Parse and authenticate an identity event
 * @param idResolver DID and handle resolver for authentication
 * @param evt Identity event to parse
 * @param unauthenticated If true authentication is skipped
 */
export const parseIdentity = async (
  idResolver: IdResolver,
  evt: Identity,
  unauthenticated = false,
): Promise<IdentityEvt | null> => {
  const res = await idResolver.did.resolve(evt.did);
  const handle = res && !unauthenticated
    ? await verifyHandle(idResolver, evt.did, res)
    : undefined;

  return {
    event: "identity",
    seq: evt.seq,
    time: evt.time,
    did: evt.did,
    handle,
    didDocument: res ?? undefined,
  };
};

const verifyHandle = async (
  idResolver: IdResolver,
  did: string,
  didDoc: DidDocument,
): Promise<string | undefined> => {
  const { handle } = parseToAtprotoDocument(didDoc);
  if (!handle) {
    return undefined;
  }
  const res = await idResolver.handle.resolve(handle);
  return res === did ? handle : undefined;
};

/**
 * Parse an account event
 * @param evt Account event to parse
 */
export const parseAccount = (evt: Account): AccountEvt | undefined => {
  if (evt.status && !isValidStatus(evt.status)) return;
  return {
    event: "account",
    seq: evt.seq,
    time: evt.time,
    did: evt.did,
    active: evt.active,
    status: evt.status as AccountStatus | undefined,
  };
};

const isValidStatus = (str: string): str is AccountStatus => {
  return ["takendown", "suspended", "deleted", "deactivated"].includes(str);
};

/**
 * An error in validating/authenticating an event from the firehose.
 */
export class FirehoseValidationError extends Error {
  constructor(
    err: unknown,
    public value: unknown,
  ) {
    super("error in firehose event lexicon validation", { cause: err });
  }
}

/**
 * An error in parsing an event from the firehose.
 */
export class FirehoseParseError extends Error {
  constructor(
    err: unknown,
    public event: RepoEvent,
  ) {
    super("error in parsing and authenticating firehose event", { cause: err });
  }
}

/**
 * An error in the subscription to the firehose.
 */
export class FirehoseSubscriptionError extends Error {
  constructor(err: unknown) {
    super("error on firehose subscription", { cause: err });
  }
}

/**
 * An error in your firehose event handler logic.
 */
export class FirehoseHandlerError extends Error {
  constructor(
    err: unknown,
    public event: Event,
  ) {
    super("error in firehose event handler", { cause: err });
  }
}

const getRepoEventType = (evt: RepoEvent): string => {
  if (isCommit(evt)) return "commit";
  if (isAccount(evt)) return "account";
  if (isIdentity(evt)) return "identity";
  if (isSync(evt)) return "sync";
  return "unknown";
};
