/**
 * # AT Protocol Sync Tool
 *
 * This module provides tools for syncing data from AT Protocol.
 * Currently, it supports firehose (relay) subscriptions.
 *
 * The firehose class will spin up a websocket connection to
 * com.atproto.sync.subscribeRepos on a given repo host
 * (by default the Relay run by Bluesky).
 * Each event will be parsed, authenticated, and then passed on to the
 * supplied handleEvt which can handle indexing.
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
 * Non-fatal errors that are encountered will be passed to the required
 * onError handler. In most cases, these can just be logged.
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
 * @module
 */
export * from "./runner/index.ts";
export * from "./firehose/index.ts";
export * from "./events.ts";
export * from "./telemetry.ts";
