/* eslint-env mocha */

import { assert, assertEquals, assertFalse } from "@std/assert";
import { compare, equals, xorCompare } from "../compare.ts";

Deno.test("is stable", () => {
  const a = Uint8Array.from([0, 1, 2, 3]);
  const b = Uint8Array.from([0, 1, 2, 3]);

  assertEquals([a, b].sort(compare), [
    a,
    b,
  ]);
  assertEquals([b, a].sort(compare), [
    b,
    a,
  ]);
});

Deno.test("compares two Uint8Arrays", () => {
  const a = Uint8Array.from([0, 1, 2, 4]);
  const b = Uint8Array.from([0, 1, 2, 3]);

  assertEquals([a, b].sort(compare), [
    b,
    a,
  ]);
  assertEquals([b, a].sort(compare), [
    b,
    a,
  ]);
});

Deno.test("compares two Uint8Arrays with different lengths", () => {
  const a = Uint8Array.from([0, 1, 2, 3, 4]);
  const b = Uint8Array.from([0, 1, 2, 3]);

  assertEquals([a, b].sort(compare), [
    b,
    a,
  ]);
  assertEquals([b, a].sort(compare), [
    b,
    a,
  ]);
});

Deno.test("finds two Uint8Arrays equal", () => {
  const a = Uint8Array.from([0, 1, 2, 3]);
  const b = Uint8Array.from([0, 1, 2, 3]);

  assert(equals(a, b));
});

Deno.test("finds two Uint8Arrays not equal", () => {
  const a = Uint8Array.from([0, 1, 2, 3]);
  const b = Uint8Array.from([0, 1, 2, 4]);

  assertFalse(equals(a, b));
});

Deno.test("finds two Uint8Arrays with different lengths not equal", () => {
  const a = Uint8Array.from([0, 1, 2, 3]);
  const b = Uint8Array.from([0, 1, 2, 3, 4]);

  assertFalse(equals(a, b));
});

Deno.test("xorCompare", () => {
  assertEquals(
    xorCompare(Uint8Array.from([0, 0]), Uint8Array.from([0, 1])),
    -1,
  );
  assertEquals(xorCompare(Uint8Array.from([0, 1]), Uint8Array.from([0, 1])), 0);
  assertEquals(xorCompare(Uint8Array.from([1, 1]), Uint8Array.from([0, 1])), 1);
});
