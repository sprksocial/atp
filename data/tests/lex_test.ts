import { assert } from "@std/assert";
import { isTypedLexMap } from "../lex.ts";
import { assertFalse } from "@std/assert/false";

Deno.test("isLexMap returns true for valid LexMap", () => {
  const record = {
    a: 123,
    b: "blah",
    c: true,
    d: null,
    e: new Uint8Array([1, 2, 3]),
    f: {
      nested: "value",
    },
    g: [1, 2, 3],
  };
  assertFalse(isTypedLexMap(record));
});

Deno.test("isLexMap returns false for non-records", () => {
  const values = [
    123,
    "blah",
    true,
    null,
    new Uint8Array([1, 2, 3]),
    [1, 2, 3],
  ];
  for (const value of values) {
    assertFalse(isTypedLexMap(value));
  }
});

Deno.test("isLexMap returns false for records with non-Lex values", () => {
  assertFalse(
    // @ts-expect-error value passed is not a LexMap
    isTypedLexMap({
      a: 123,
      b: () => {},
    }),
  );
  assertFalse(
    isTypedLexMap({
      a: 123,
      b: undefined,
    }),
  );
});

Deno.test("isTypedLexMap valid records", () => {
  for (
    const { json } of [
      {
        note: "trivial record",
        json: {
          $type: "com.example.blah",
          a: 123,
          b: "blah",
        },
      },
      {
        note: "float, but integer-like",
        json: {
          $type: "com.example.blah",
          a: 123.0,
          b: "blah",
        },
      },
      {
        note: "empty list and object",
        json: {
          $type: "com.example.blah",
          a: [],
          b: {},
        },
      },
    ]
  ) {
    assert(isTypedLexMap(json));
  }
});

Deno.test("isTypedLexMap invalid records", () => {
  for (
    const { json } of [
      {
        note: "float",
        json: {
          $type: "com.example.blah",
          a: 123.456,
          b: "blah",
        },
      },
      {
        note: "record with $type null",
        json: {
          $type: null,
          a: 123,
          b: "blah",
        },
      },
      {
        note: "record with $type wrong type",
        json: {
          $type: 123,
          a: 123,
          b: "blah",
        },
      },
      {
        note: "record with empty $type string",
        json: {
          $type: "",
          a: 123,
          b: "blah",
        },
      },
    ]
  ) {
    assertFalse(isTypedLexMap(json));
  }
});
