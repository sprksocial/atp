import { assert, assertFalse } from "@std/assert";
import { CID } from "../cid.ts";
import { isObject, isPlainObject } from "../object.ts";

Deno.test("isObject returns true for plain objects", () => {
  assert(isObject({}));
  assert(isObject({ a: 1 }));
});

Deno.test("isObject returns true for CIDs", () => {
  const cid = CID.parse(
    "bafyreidfayvfuwqa7qlnopdjiqrxzs6blmoeu4rujcjtnci5beludirz2a",
  );
  assert(isObject(cid));
});

Deno.test("isObject returns true for class instances", () => {
  class MyClass {}
  assert(isObject(new MyClass()));
});

Deno.test("isObject returns true for arrays", () => {
  assert(isObject([]));
  assert(isObject([1, 2, 3]));
});

Deno.test("isObject returns false for null", () => {
  assertFalse(isObject(null));
});

Deno.test("isObject returns false for non-objects", () => {
  assertFalse(isObject(42));
  assertFalse(isObject("string"));
  assertFalse(isObject(undefined));
  assertFalse(isObject(true));
});

Deno.test("isPlainObject returns true for plain objects", () => {
  assert(isPlainObject({}));
  assert(isPlainObject({ a: 1 }));
});

Deno.test("isPlainObject returns true for objects with null prototype", () => {
  const obj = Object.create(null);
  obj.a = 1;
  assert(isPlainObject(obj));
  assert(isPlainObject({ __proto__: null, foo: "bar" }));
});

Deno.test("isPlainObject returns false for class instances", () => {
  class MyClass {}
  assertFalse(isPlainObject(new MyClass()));
});

Deno.test("isPlainObject returns false for CIDs", () => {
  const cid = CID.parse(
    "bafyreidfayvfuwqa7qlnopdjiqrxzs6blmoeu4rujcjtnci5beludirz2a",
  );
  assertFalse(isPlainObject(cid));
});

Deno.test("isPlainObject returns false for arrays", () => {
  assertFalse(isPlainObject([]));
  assertFalse(isPlainObject([1, 2, 3]));
});

Deno.test("isPlainObject returns false for null", () => {
  assertFalse(isPlainObject(null));
});

Deno.test("isPlainObject returns false for non-objects", () => {
  assertFalse(isPlainObject(42));
  assertFalse(isPlainObject("string"));
  assertFalse(isPlainObject(undefined));
  assertFalse(isPlainObject(true));
});
