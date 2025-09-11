import { assertEquals, assertStrictEquals } from "jsr:@std/assert";
import * as util from "../util.ts";

Deno.test("noUndefinedVals - removes undefined top-level keys", () => {
  const obj: Record<string, unknown> = {
    foo: 123,
    bar: undefined,
  };

  const result = util.noUndefinedVals(obj);

  assertStrictEquals(result, obj);
  assertEquals(result, {
    foo: 123,
  });
});

Deno.test("noUndefinedVals - handles empty objects", () => {
  assertEquals(util.noUndefinedVals({}), {});
});

Deno.test("noUndefinedVals - leaves deep values intact", () => {
  const obj: Record<string, unknown> = {
    foo: 123,
    bar: {
      baz: undefined,
    },
  };
  const result = util.noUndefinedVals(obj);

  assertEquals(result, {
    foo: 123,
    bar: {
      baz: undefined,
    },
  });
});

Deno.test("flattenUint8Arrays - flattens to single array of values", () => {
  const arr = [new Uint8Array([0xa, 0xb]), new Uint8Array([0xc, 0xd])];

  const flat = util.flattenUint8Arrays(arr);

  assertEquals([...flat], [0xa, 0xb, 0xc, 0xd]);
});

Deno.test("flattenUint8Arrays - flattens empty arrays", () => {
  const arr = [new Uint8Array(0), new Uint8Array(0)];
  const flat = util.flattenUint8Arrays(arr);

  assertEquals(flat.length, 0);
});

Deno.test("streamToUI8Array - reads iterable into array", async () => {
  const iterable: AsyncIterable<Uint8Array> = {
    async *[Symbol.asyncIterator]() {
      yield new Uint8Array([0xa, 0xb]);
      yield new Uint8Array([0xc, 0xd]);
    },
  };
  const buffer = await util.streamToUI8Array(iterable);

  assertEquals([...buffer], [0xa, 0xb, 0xc, 0xd]);
});

Deno.test("asyncFilter - filters array values", async () => {
  const result = await util.asyncFilter(
    [0, 1, 2],
    (n) => Promise.resolve(n === 0),
  );

  assertEquals(result, [0]);
});

Deno.test("range - generates numeric range", () => {
  assertEquals(util.range(4), [0, 1, 2, 3]);
});

Deno.test("dedupeStrs - removes duplicates", () => {
  assertEquals(util.dedupeStrs(["a", "a", "b"]), ["a", "b"]);
});

Deno.test("parseIntWithFallback - accepts undefined", () => {
  assertEquals(util.parseIntWithFallback(undefined, -10), -10);
});

Deno.test("parseIntWithFallback - parses numbers", () => {
  assertEquals(util.parseIntWithFallback("100", -10), 100);
});

Deno.test("parseIntWithFallback - supports non-numeric fallbacks", () => {
  assertEquals(util.parseIntWithFallback(undefined, "foo"), "foo");
});
