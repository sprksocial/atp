/**
 * # Identity Resolution in AT Protocol
 *
 * Library for decentralized identities in AT Protocol
 * using DIDs and handles.
 *
 * Handles are resolved to DIDs and DIDs can be resolved to DID
 * documents, which can be used to get information about the user
 * such as their verification method, service endpoints and handle.
 *
 * @example Resolving a Handle and verifying against DID document
 * ```typescript
 * const didres = new DidResolver({})
 * const hdlres = new HandleResolver({})
 *
 * const handle = 'atproto.com'
 * const did = await hdlres.resolve(handle)
 *
 * if (did == undefined) {
 *   throw new Error('expected handle to resolve')
 * }
 * console.log(did) // did:plc:ewvi7nxzyoun6zhxrhs64oiz
 *
 * const doc = await didres.resolve(did)
 * console.log(doc)
 *
 * // additional resolutions of same DID will be cached for some time,
 * // unless forceRefresh flag is used
 * const doc2 = await didres.resolve(did, true)
 *
 * // helper methods use the same cache
 * const data = await didres.resolveAtprotoData(did)
 *
 * if (data.handle != handle) {
 *   throw new Error('invalid handle (did not match DID document)')
 * }
 * ```
 *
 * @module
 */
export * from "./did/index.ts";
export * from "./handle/index.ts";
export * from "./id-resolver.ts";
export * from "./errors.ts";
export * from "./types.ts";
