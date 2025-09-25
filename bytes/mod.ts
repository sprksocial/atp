/**
 * Simple `Uint8Array` utilities for AT Protocol.
 *
 * ## alloc(size)
 *
 * Create a new `Uint8Array`.
 *
 * @example alloc(size)
 *
 * ```js
 * import { alloc } from 'uint8arrays/alloc'
 *
 * const buf = alloc(100)
 * ```
 *
 * ## allocUnsafe(size)
 *
 * Create a new `Uint8Array`. When running under Node.js, `Buffer` will be used in preference to `Uint8Array`.
 *
 * On platforms that support it, memory referenced by the returned `Uint8Array` will not be initialized.
 *
 * @example allocUnsafe(size)
 *
 * ```js
 * import { allocUnsafe } from 'uint8arrays/alloc'
 *
 * const buf = allocUnsafe(100)
 * ```
 *
 * ## compare(a, b)
 *
 * Compare two `Uint8Arrays`
 *
 * @example compare(a, b)
 *
 * ```js
 * import { compare } from 'uint8arrays/compare'
 *
 * const arrays = [
 *   Uint8Array.from([3, 4, 5]),
 *   Uint8Array.from([0, 1, 2])
 * ]
 *
 * const sorted = arrays.sort(compare)
 *
 * console.info(sorted)
 * // [
 * //    Uint8Array[0, 1, 2]
 * //    Uint8Array[3, 4, 5]
 * // ]
 * ```
 *
 * ## concat(arrays, \[length])
 *
 * Concatenate one or more `Uint8Array`s and return a `Uint8Array` with their contents.
 *
 * If you know the length of the arrays, pass it as a second parameter, otherwise it will be calculated by traversing the list of arrays.
 *
 * @example concat(arrays, \[length])
 *
 * ```js
 * import { concat } from 'uint8arrays/concat'
 *
 * const arrays = [
 *   Uint8Array.from([0, 1, 2]),
 *   Uint8Array.from([3, 4, 5])
 * ]
 *
 * const all = concat(arrays, 6)
 *
 * console.info(all)
 * // Uint8Array[0, 1, 2, 3, 4, 5]
 * ```
 *
 * ## equals(a, b)
 *
 * Returns true if the two arrays are the same array or if they have the same length and contents.
 *
 * @example equals(a, b)
 *
 * ```js
 * import { equals } from 'uint8arrays/equals'
 *
 * const a = Uint8Array.from([0, 1, 2])
 * const b = Uint8Array.from([3, 4, 5])
 * const c = Uint8Array.from([0, 1, 2])
 *
 * console.info(equals(a, b)) // false
 * console.info(equals(a, c)) // true
 * console.info(equals(a, a)) // true
 * ```
 *
 * ## fromString(string, encoding = 'utf8')
 *
 * Returns a new `Uint8Array` created from the passed string and interpreted as the passed encoding.
 *
 * Supports `utf8` and any of the [multibase encodings](https://github.com/multiformats/multibase/blob/master/multibase.csv) as implemented by the [multiformats module](https://www.npmjs.com/package/multiformats).
 *
 * @example fromString(string, encoding = 'utf8')
 *
 * ```js
 * import { fromString } from 'uint8arrays/from-string'
 *
 * console.info(fromString('hello world')) // Uint8Array[104, 101 ...
 * console.info(fromString('00010203aabbcc', 'base16')) // Uint8Array[0, 1 ...
 * console.info(fromString('AAECA6q7zA', 'base64')) // Uint8Array[0, 1 ...
 * console.info(fromString('01234', 'ascii')) // Uint8Array[48, 49 ...
 * ```
 *
 * ## toString(array, encoding = 'utf8')
 *
 * Returns a string created from the passed `Uint8Array` in the passed encoding.
 *
 * Supports `utf8` and any of the [multibase encodings](https://github.com/multiformats/multibase/blob/master/multibase.csv) as implemented by the [multiformats module](https://www.npmjs.com/package/multiformats).
 *
 * @example toString(array, encoding = 'utf8')
 *
 * ```js
 * import { toString } from 'uint8arrays/to-string'
 *
 * console.info(toString(Uint8Array.from([104, 101...]))) // 'hello world'
 * console.info(toString(Uint8Array.from([0, 1, 2...]), 'base16')) // '00010203aabbcc'
 * console.info(toString(Uint8Array.from([0, 1, 2...]), 'base64')) // 'AAECA6q7zA'
 * console.info(toString(Uint8Array.from([48, 49, 50...]), 'ascii')) // '01234'
 * ```
 *
 * ## xor(a, b)
 *
 * Returns a `Uint8Array` containing `a` and `b` xored together.
 *
 * @example xor(a, b)
 *
 * ```js
 * import { xor } from 'uint8arrays/xor'
 *
 * console.info(xor(Uint8Array.from([1, 0]), Uint8Array.from([0, 1]))) // Uint8Array[1, 1]
 * ```
 *
 * ## xorCompare(a, b)
 *
 * Compares the distances between two xor `Uint8Array`s.
 *
 * @example xorCompare(a, b)
 *
 * ```ts
 * import { xor } from 'uint8arrays/xor'
 * import { xorCompare } from 'uint8arrays/xor-compare'
 *
 * const target = Uint8Array.from([1, 1])
 * const val1 = Uint8Array.from([1, 0])
 * const xor1 = xor(target, val1)
 *
 * const val2 = Uint8Array.from([0, 1])
 * const xor2 = xor(target, val2)
 *
 * console.info(xorCompare(xor1, xor2)) // -1 or 0 or 1
 * ```
 * @module
 */

import { xor } from "./xor.ts";
import { compare, equals, xorCompare } from "./compare.ts";
import { concat } from "./concat.ts";
import { fromString, toString } from "./string.ts";

export { compare, concat, equals, fromString, toString, xor, xorCompare };

export type { SupportedEncodings } from "./util.ts";
