import { assert, assertEquals, assertFalse } from "jsr:@std/assert";
import {
  graphemeLen,
  parseLanguage,
  utf8Len,
  validateLanguage,
} from "../mod.ts";

Deno.test("calculates utf8 string length", () => {
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

Deno.test("calculates grapheme length", () => {
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
});

Deno.test("validates BCP 47", () => {
  // valid
  assert(validateLanguage("de"));
  assert(validateLanguage("de-CH"));
  assert(validateLanguage("de-DE-1901"));
  assert(validateLanguage("es-419"));
  assert(validateLanguage("sl-IT-nedis"));
  assert(validateLanguage("mn-Cyrl-MN"));
  assert(validateLanguage("x-fr-CH"));
  assert(
    validateLanguage("en-GB-boont-r-extended-sequence-x-private"),
  );
  assert(validateLanguage("sr-Cyrl"));
  assert(validateLanguage("hy-Latn-IT-arevela"));
  assert(validateLanguage("i-klingon"));
  // invalid
  assertFalse(validateLanguage(""));
  assertFalse(validateLanguage("x"));
  assertFalse(validateLanguage("de-CH-"));
  assertFalse(validateLanguage("i-bad-grandfathered"));
});

Deno.test("parses BCP 47", () => {
  // valid
  assertEquals(parseLanguage("de"), {
    language: "de",
  });
  assertEquals(parseLanguage("de-CH"), {
    language: "de",
    region: "CH",
  });
  assertEquals(parseLanguage("de-DE-1901"), {
    language: "de",
    region: "DE",
    variant: "1901",
  });
  assertEquals(parseLanguage("es-419"), {
    language: "es",
    region: "419",
  });
  assertEquals(parseLanguage("sl-IT-nedis"), {
    language: "sl",
    region: "IT",
    variant: "nedis",
  });
  assertEquals(parseLanguage("mn-Cyrl-MN"), {
    language: "mn",
    script: "Cyrl",
    region: "MN",
  });
  assertEquals(parseLanguage("x-fr-CH"), {
    privateUse: "x-fr-CH",
  });
  assertEquals(
    parseLanguage("en-GB-boont-r-extended-sequence-x-private"),
    {
      language: "en",
      region: "GB",
      variant: "boont",
      extension: "r-extended-sequence",
      privateUse: "x-private",
    },
  );
  assertEquals(parseLanguage("sr-Cyrl"), {
    language: "sr",
    script: "Cyrl",
  });
  assertEquals(parseLanguage("hy-Latn-IT-arevela"), {
    language: "hy",
    script: "Latn",
    region: "IT",
    variant: "arevela",
  });
  assertEquals(parseLanguage("i-klingon"), {
    grandfathered: "i-klingon",
  });
  // invalid
  assertFalse(parseLanguage(""));
  assertFalse(parseLanguage("x"));
  assertFalse(parseLanguage("de-CH-"));
  assertFalse(parseLanguage("i-bad-grandfathered"));
});
