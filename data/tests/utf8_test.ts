import { utf8Len } from "../index.ts";
import { graphemeLen } from "../utf8.ts";
import { assertEquals } from "@std/assert";

Deno.test("graphemeLen computes grapheme length", () => {
  assertEquals(graphemeLen("a"), 1);
  assertEquals(graphemeLen("~"), 1);
  assertEquals(graphemeLen("ö"), 1);
  assertEquals(graphemeLen("ñ"), 1);
  assertEquals(graphemeLen("©"), 1);
  assertEquals(graphemeLen("⽘"), 1);
  assertEquals(graphemeLen("☎"), 1);
  assertEquals(graphemeLen("𓋓"), 1);
  assertEquals(graphemeLen("😀"), 1);
  assertEquals(graphemeLen("👨‍👩‍👧‍👧"), 1);
  assertEquals(graphemeLen("a~öñ©⽘☎𓋓😀👨‍👩‍👧‍👧"), 10);
  // https://github.com/bluesky-social/atproto/issues/4321
  assertEquals(graphemeLen("नमस्ते"), 3);
});

Deno.test("utf8Len computes utf8 string length", () => {
  assertEquals(utf8Len("a"), 1);
  assertEquals(utf8Len("~"), 1);
  assertEquals(utf8Len("ö"), 2);
  assertEquals(utf8Len("ñ"), 2);
  assertEquals(utf8Len("©"), 2);
  assertEquals(utf8Len("⽘"), 3);
  assertEquals(utf8Len("☎"), 3);
  assertEquals(utf8Len("𓋓"), 4);
  assertEquals(utf8Len("😀"), 4);
  assertEquals(utf8Len("👨‍👩‍👧‍👧"), 25);
});
