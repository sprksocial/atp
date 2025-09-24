/* eslint-env mocha */

import { assert, assertEquals } from "@std/assert";
import { alloc } from "../alloc.ts";
import { concat } from "../concat.ts";

Deno.test("concats two Uint8Arrays", () => {
  const a = Uint8Array.from([0, 1, 2, 3]);
  const b = Uint8Array.from([4, 5, 6, 7]);
  const c = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]);

  assertEquals(concat([a, b]), c);
});

Deno.test("concats two Uint8Arrays with a length", () => {
  const a = Uint8Array.from([0, 1, 2, 3]);
  const b = Uint8Array.from([4, 5, 6, 7]);
  const c = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]);

  assertEquals(concat([a, b], 8), c);
});

Deno.test("concat returns Uint8Array", () => {
  const a = Uint8Array.from([0, 1, 2, 3]);
  const b = alloc(10).fill(1);
  const c = concat([a, b]);
  const slice = c.slice();

  // node slice is a copy operation, Uint8Array slice is a no-copy operation
  assert(slice.buffer !== c.buffer);
});
