/**
 * # AT Protocol Lexicon Validation Utility
 *
 * This module provides utilities for validating and working with AT Protocol lexicons
 * in TypeScript.
 *
 * @example Validate a lexicon
 * ```typescript
 * import { Lexicon } from "@atp/lexicon";
 *
 * // create your lexicons collection
 * const lex = new Lexicons()
 *
 * // add your lexicons
 * lex.add({
 *   lex: 1,
 *   id: 'com.example.post',
 *   defs: {
 *     // ...
 *   }
 * })
 *
 * // validate
 * lex.assertValidRecord('com.example.record', {$type: 'com.example.record', ...})
 * lex.assertValidXrpcParams('com.example.query', {...})
 * lex.assertValidXrpcInput('com.example.procedure', {...})
 * lex.assertValidXrpcOutput('com.example.query', {...})
 * ```
 *
 * @module
 */
export * from "./types.ts";
export * from "./lexicons.ts";
export * from "./blob-refs.ts";
export * from "./serialize.ts";
