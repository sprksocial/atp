/* eslint-env mocha */

import { alloc, allocUnsafe } from "../alloc.ts";
import { assert, assertEquals } from "@std/assert";

Deno.test("can alloc memory", () => {
  const size = 10;

  assertEquals(alloc(size).byteLength, size);
});

Deno.test("can alloc memory", () => {
  const size = 10;
  const buf = alloc(size);

  assert(buf.every((value) => value === 0));
});

Deno.test("can alloc memory unsafely", () => {
  const size = 10;

  assertEquals(allocUnsafe(size).byteLength, size);
});

Deno.test("alloc returns Uint8Array", () => {
  const a = alloc(10);
  const slice = a.slice();

  // node slice is a copy operation, Uint8Array slice is a no-copy operation
  assert(slice.buffer !== a.buffer);
});

Deno.test("allocUnsafe returns Uint8Array", () => {
  const a = allocUnsafe(10);
  const slice = a.slice();

  // node slice is a copy operation, Uint8Array slice is a no-copy operation
  assert(slice.buffer !== a.buffer);
});
