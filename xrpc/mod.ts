/**
 * # XRPC Client
 *
 * TypeScript client library for talking to AT Protocol services,
 * with Lexicon schema validation.
 *
 * @example Fetching an XRPC endpoint
 * ```typescript
 * import { l } from '@atp/lex'
 * import { Client } from '@atp/xrpc'
 *
 * const ping = l.query(
 *   'io.example.ping',
 *   l.params({
 *     message: l.string(),
 *   }),
 *   l.jsonPayload({
 *     message: l.string(),
 *   }),
 * )
 *
 * const client = new Client('https://ping.example.com')
 *
 * const res = await client.xrpc(ping, {
 *   params: {
 *     message: 'hello world',
 *   },
 * })
 *
 * res.data // => { message: 'hello world' }
 * ```
 * @module
 */
export * from "./client.ts";
export * from "./agent.ts";
export * from "./types.ts";
export * from "./util.ts";
