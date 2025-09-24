import bases from "../util.ts";
import { fromString, type SupportedEncodings, toString } from "../string.ts";
import { assert, assertEquals, assertThrows } from "@std/assert";

const supportedBases = Object.keys(bases) as SupportedEncodings[];

Deno.test("fromString creates a Uint8Array from a string", () => {
  const str = "hello world";
  const arr = new TextEncoder().encode(str);

  assertEquals(fromString(str), arr);
});

supportedBases.filter((base) => base !== "base256emoji").forEach((base) => {
  Deno.test(`fromString creates a Uint8Array from a ${base} string`, () => {
    const arr = Uint8Array.from([0, 1, 2, 3]);
    const str = toString(arr, base);

    assertEquals(fromString(str, base), arr);
  });
});

Deno.test("fromString creates a Uint8Array from a base64 string with non-printable utf8 characters", () => {
  const str = "AAECA6q7zA";
  const arr = Uint8Array.from([0, 1, 2, 3, 170, 187, 204]);

  assertEquals(fromString(str, "base64"), arr);
});

Deno.test("fromString creates a Uint8Array from an ascii string", () => {
  const str = [
    String.fromCharCode(0),
    String.fromCharCode(1),
    String.fromCharCode(2),
    String.fromCharCode(3),
    String.fromCharCode(4),
  ].join("");
  const arr = Uint8Array.from([0, 1, 2, 3, 4]);

  assertEquals(fromString(str, "ascii"), arr);
});

Deno.test("fromString throws when an unknown base is passed", () => {
  const str = "hello world";

  // @ts-expect-error 'derp' is not a valid encoding
  assertThrows(() => fromString(str, "derp"), /Unsupported encoding/);
});

Deno.test("fromString returns Uint8Array", () => {
  const a = fromString("derp");
  const slice = a.slice();

  // node slice is a copy operation, Uint8Array slice is a no-copy operation
  assert(slice.buffer !== a.buffer);
});

Deno.test("toString creates a String from a Uint8Array", () => {
  const str = "hello world";
  const arr = new TextEncoder().encode(str);

  assertEquals(toString(arr), str);
});

Deno.test("toString creates a hex string from a Uint8Array with non-printable utf8 characters", () => {
  const str = "00010203aabbcc";
  const arr = Uint8Array.from([0, 1, 2, 3, 170, 187, 204]);

  assertEquals(toString(arr, "base16"), str);
});

Deno.test("toString creates a base32 string from a Uint8Array with non-printable utf8 characters", () => {
  const str = "aaaqea5kxpga";
  const arr = Uint8Array.from([0, 1, 2, 3, 170, 187, 204]);

  assertEquals(toString(arr, "base32"), str);
});

Deno.test("toString creates a base36 string from a Uint8Array with non-printable utf8 characters", () => {
  const str = "0e52zorf0";
  const arr = Uint8Array.from([0, 1, 2, 3, 170, 187, 204]);

  assertEquals(toString(arr, "base36"), str);
});

Deno.test("toString creates a base64 string from a Uint8Array with non-printable utf8 characters", () => {
  const str = "AAECA6q7zA";
  const arr = Uint8Array.from([0, 1, 2, 3, 170, 187, 204]);

  assertEquals(toString(arr, "base64"), str);
});

Deno.test("toString creates an ascii string from a Uint8Array", () => {
  const str = [
    String.fromCharCode(0),
    String.fromCharCode(1),
    String.fromCharCode(2),
    String.fromCharCode(3),
    String.fromCharCode(4),
  ].join("");
  const arr = Uint8Array.from([0, 1, 2, 3, 4]);

  assertEquals(toString(arr, "ascii"), str);
});

Deno.test("toString throws when an unknown base is passed", () => {
  const arr = Uint8Array.from([0, 1, 2, 3, 170, 187, 204]);

  // @ts-expect-error 'derp' is not a valid encoding
  assertThrows(() => toString(arr, "derp"), /Unsupported encoding/);
});
