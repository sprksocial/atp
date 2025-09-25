/**
 * # XRPC Client
 *
 * TypeScript client library for talking to AT Protocol services,
 * with Lexicon schema validation.
 *
 * @example Fetching an XRPC endpoint
 * ```typescript
 * import { LexiconDoc } from '@atproto/lexicon'
 * import { XrpcClient } from '@atproto/xrpc'
 *
 * const pingLexicon = {
 *  lexicon: 1,
 *  id: 'io.example.ping',
 *  defs: {
 *    main: {
 *      type: 'query',
 *      description: 'Ping the server',
 *      parameters: {
 *        type: 'params',
 *        properties: { message: { type: 'string' } },
 *      },
 *      output: {
 *        encoding: 'application/json',
 *        schema: {
 *          type: 'object',
 *          required: ['message'],
 *          properties: { message: { type: 'string' } },
 *        },
 *      },
 *    },
 *  },
 * } satisfies LexiconDoc
 *
 * const xrpc = new XrpcClient('https://ping.example.com', [
 *   // Any number of lexicon here
 *   pingLexicon,
 * ])
 *
 * const res1 = await xrpc.call('io.example.ping', {
 *   message: 'hello world',
 * })
 * res1.encoding // => 'application/json'
 * res1.body // => {message: 'hello world'}
 * ```
 */
export * from "./client.ts";
export * from "./fetch-handler.ts";
export * from "./types.ts";
export * from "./util.ts";
