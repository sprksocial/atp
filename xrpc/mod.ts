/**
 * # XRPC Client
 *
 * TypeScript client library for talking to AT Protocol services,
 * with Lexicon schema validation.
 *
 * @example Fetching an XRPC endpoint
 * ```typescript
 * import { LexiconDoc } from '@atp/lexicon'
 * import { Client } from '@atp/xrpc'
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
 * const client = new Client('https://ping.example.com', [
 *   pingLexicon,
 * ])
 *
 * const res1 = await client.xrpc('io.example.ping', {
 *   message: 'hello world',
 * })
 * res1.body // => {message: 'hello world'}
 * ```
 * @module
 */
export * from "./client.ts";
export * from "./agent.ts";
export * from "./types.ts";
export * from "./util.ts";
