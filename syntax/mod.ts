/**
 * # AT Protocol Syntax Validation
 *
 * Validation utilities for AT Protocol strings:
 * - DIDs
 * - Handles
 * - NSIDs
 * - AT URIs
 * - TIDs
 * - Record Keys
 * - Datetimes
 *
 * @example Handles
 * ```typescript
 *  import { isValidHandle, ensureValidHandle, isValidDid } from '@atp/syntax'
 *
 *  isValidHandle('alice.test') // returns true
 *  ensureValidHandle('alice.test') // returns void
 *
 *  isValidHandle('al!ce.test') // returns false
 *  ensureValidHandle('al!ce.test') // throws an error
 * ```
 *
 * @example NSIDs
 * ```typescript
 *  import { NSID } from '@atp/syntax'
 *
 *  const id1 = NSID.parse('com.example.foo')
 *  id1.authority // => 'example.com'
 *  id1.name // => 'foo'
 *  id1.toString() // => 'com.example.foo'
 *
 *  const id2 = NSID.create('example.com', 'foo')
 *  id2.authority // => 'example.com'
 *  id2.name // => 'foo'
 *  id2.toString() // => 'com.example.foo'
 *
 *  NSID.isValid('com.example.foo') // => true
 *  NSID.isValid('com.example.someThing') // => true
 *  NSID.isValid('example.com/foo') // => false
 *  NSID.isValid('foo') // => false
 * ```
 *
 * @example AT URIs
 * ```typescript
 *   import { AtUri } from '@atp/syntax'
 *
 *   const uri = new AtUri('at://bob.com/com.example.post/1234')
 *   uri.protocol // => 'at:'
 *   uri.origin // => 'at://bob.com'
 *   uri.hostname // => 'bob.com'
 *   uri.collection // => 'com.example.post'
 *   uri.rkey // => '1234'
 * ```
 *
 * @module
 */

export * from "./handle.ts";
export * from "./did.ts";
export * from "./nsid.ts";
export * from "./aturi.ts";
export * from "./tid.ts";
export * from "./recordkey.ts";
export * from "./datetime.ts";
