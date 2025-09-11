import { ZodError } from "zod";
import { check } from "../mod.ts";
import { assertEquals, assertThrows } from "jsr:@std/assert";

Deno.test("checks object against definition", () => {
  const checkable: check.Checkable<boolean> = {
    parse(obj) {
      return Boolean(obj);
    },
    safeParse(obj) {
      return {
        success: true,
        data: Boolean(obj),
      };
    },
  };

  assertEquals(check.is(true, checkable), true);
});

Deno.test("handles failed checks", () => {
  const checkable: check.Checkable<boolean> = {
    parse(obj) {
      return Boolean(obj);
    },
    safeParse() {
      return {
        success: false,
        error: new ZodError([]),
      };
    },
  };

  assertEquals(check.is(true, checkable), false);
});

Deno.test("returns value on success", () => {
  const checkable: check.Checkable<boolean> = {
    parse(obj) {
      return Boolean(obj);
    },
    safeParse(obj) {
      return {
        success: true,
        data: Boolean(obj),
      };
    },
  };

  assertEquals(check.assure(checkable, true), true);
});

Deno.test("throws on failure", () => {
  const err = new Error("foo");
  const checkable: check.Checkable<boolean> = {
    parse() {
      throw err;
    },
    safeParse() {
      throw err;
    },
  };

  assertThrows(() => check.assure(checkable, true), err.message);
});

const falseTestValues: unknown[] = [null, undefined, "foo", 123, true];

for (const obj of falseTestValues) {
  Deno.test(`isObject returns false for ${obj}`, () => {
    assertEquals(check.isObject(obj), false);
  });
}

Deno.test("isObject returns true for objects", () => {
  assertEquals(check.isObject({}), true);
});

Deno.test("isObject returns true for instances of classes", () => {
  const obj = new (class {})();
  assertEquals(check.isObject(obj), true);
});
