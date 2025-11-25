import { assert, assertEquals, assertFalse } from "@std/assert";
import { isLanguage, parseLanguage } from "../language.ts";

Deno.test("languages validates BCP 47", () => {
  // valid
  assert(isLanguage("de"));
  assert(isLanguage("de-CH"));
  assert(isLanguage("de-DE-1901"));
  assert(isLanguage("es-419"));
  assert(isLanguage("sl-IT-nedis"));
  assert(isLanguage("mn-Cyrl-MN"));
  assert(isLanguage("x-fr-CH"));
  assert(isLanguage("en-GB-boont-r-extended-sequence-x-private"));
  assert(isLanguage("sr-Cyrl"));
  assert(isLanguage("hy-Latn-IT-arevela"));
  assert(isLanguage("i-klingon"));
  // invalid
  assertFalse(isLanguage(""));
  assertFalse(isLanguage("x"));
  assertFalse(isLanguage("de-CH-"));
  assertFalse(isLanguage("i-bad-grandfathered"));
});

Deno.test("languages parses BCP 47", () => {
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
  assertEquals(parseLanguage("en-GB-boont-r-extended-sequence-x-private"), {
    language: "en",
    region: "GB",
    variant: "boont",
    extension: "r-extended-sequence",
    privateUse: "x-private",
  });
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
  assertEquals(parseLanguage(""), null);
  assertEquals(parseLanguage("x"), null);
  assertEquals(parseLanguage("de-CH-"), null);
  assertEquals(parseLanguage("i-bad-grandfathered"), null);
});
