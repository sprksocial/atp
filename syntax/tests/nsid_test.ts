import { assertEquals, assertThrows } from "jsr:@std/assert";
import {
  ensureValidNsid,
  InvalidNsidError,
  isValidNsid,
  NSID,
  parseNsid,
  validateNsid,
  validateNsidRegex,
} from "../mod.ts";

Deno.test("NSID parsing & creation - parses valid NSIDs", () => {
  assertEquals(NSID.parse("com.example.foo").authority, "example.com");
  assertEquals(NSID.parse("com.example.foo").name, "foo");
  assertEquals(NSID.parse("com.example.foo").toString(), "com.example.foo");
  assertEquals(
    NSID.parse("com.long-thing1.cool.fooBarBaz").authority,
    "cool.long-thing1.com",
  );
  assertEquals(
    NSID.parse("com.long-thing1.cool.fooBarBaz").name,
    "fooBarBaz",
  );
  assertEquals(
    NSID.parse("com.long-thing1.cool.fooBarBaz").toString(),
    "com.long-thing1.cool.fooBarBaz",
  );
});

Deno.test("NSID parsing & creation - creates valid NSIDs", () => {
  assertEquals(NSID.create("example.com", "foo").authority, "example.com");
  assertEquals(NSID.create("example.com", "foo").name, "foo");
  assertEquals(
    NSID.create("example.com", "foo").toString(),
    "com.example.foo",
  );
  assertEquals(
    NSID.create("cool.long-thing1.com", "fooBarBaz").authority,
    "cool.long-thing1.com",
  );
  assertEquals(
    NSID.create("cool.long-thing1.com", "fooBarBaz").name,
    "fooBarBaz",
  );
  assertEquals(
    NSID.create("cool.long-thing1.com", "fooBarBaz").toString(),
    "com.long-thing1.cool.fooBarBaz",
  );
});

Deno.test("NSID validation - enforces spec details", () => {
  const expectValid = (h: string) => {
    assertEquals(isValidNsid(h), true);
    ensureValidNsid(h);
    assertEquals(parseNsid(h), h.split("."));
    const regexResult = validateNsidRegex(h);
    assertEquals(regexResult.success, true);
    const validationResult = validateNsid(h);
    assertEquals(validationResult.success, true);
  };
  const expectInvalid = (h: string) => {
    assertEquals(isValidNsid(h), false);
    assertThrows(() => parseNsid(h), InvalidNsidError);
    assertThrows(() => ensureValidNsid(h), InvalidNsidError);
    const regexResult = validateNsidRegex(h);
    assertEquals(regexResult.success, false);
    const validationResult = validateNsid(h);
    assertEquals(validationResult.success, false);
  };

  expectValid("com.example.foo");
  const longNsid = "com." + "o".repeat(63) + ".foo";
  expectValid(longNsid);

  const tooLongNsid = "com." + "o".repeat(64) + ".foo";
  expectInvalid(tooLongNsid);

  const longEnd = "com.example." + "o".repeat(63);
  expectValid(longEnd);

  const tooLongEnd = "com.example." + "o".repeat(64);
  expectInvalid(tooLongEnd);

  const longOverall = "com." + "middle.".repeat(40) + "foo";
  assertEquals(longOverall.length, 287);
  expectValid(longOverall);

  const tooLongOverall = "com." + "middle.".repeat(50) + "foo";
  assertEquals(tooLongOverall.length, 357);
  expectInvalid(tooLongOverall);
});

Deno.test("NSID validation - valid NSIDs", () => {
  const expectValid = (h: string) => {
    assertEquals(isValidNsid(h), true);
    ensureValidNsid(h);
    assertEquals(parseNsid(h), h.split("."));
    const regexResult = validateNsidRegex(h);
    assertEquals(regexResult.success, true);
    const validationResult = validateNsid(h);
    assertEquals(validationResult.success, true);
  };

  const validNsids = [
    "com.example.foo",
    "o".repeat(63) + ".foo.bar",
    "com." + "o".repeat(63) + ".foo",
    "com.example." + "o".repeat(63),
    "com." + "middle.".repeat(40) + "foo",
    "a-0.b-1.c",
    "a.0.c",
    "a.b.c",
    "a0.b1.c3",
    "a0.b1.cc",
    "a01.thing.record",
    "cn.8.lex.stuff",
    "com.example.f00",
    "com.example.fooBar",
    "m.xn--masekowski-d0b.pl",
    "net.users.bob.ping",
    "one.2.three",
    "one.two.three",
    "one.two.three.four-and.FiVe",
    "onion.2gzyxa5ihm7nsggfxnu52rck2vv4rvmdlkiu3zzui5du4xyclen53wid.lex.deleteThing",
    "onion.expyuzz4wqqyqhjn.spec.getThing",
    "onion.g2zyxa5ihm7nsggfxnu52rck2vv4rvmdlkiu3zzui5du4xyclen53wid.lex.deleteThing",
    "org.4chan.lex.getThing",
    "test.12345.record",
    "xn--fiqs8s.xn--fiqa61au8b7zsevnm8ak20mc4a87e.record.two",
  ];

  for (const validNsid of validNsids) {
    expectValid(validNsid);
  }
});

Deno.test("NSID validation - invalid NSIDs", () => {
  const invalidNsids = [
    "o".repeat(64) + ".foo.bar",
    "com." + "o".repeat(64) + ".foo",
    "com.example." + "o".repeat(64),
    "com." + "middle.".repeat(50) + "foo",
    "com.example.foo.*",
    "com.example.foo.blah*",
    "com.example.foo.*blah",
    "com.exa💩ple.thing",
    "a-0.b-1.c-3",
    "a-0.b-1.c-o",
    "1.0.0.127.record",
    "0two.example.foo",
    "example.com",
    "com.example",
    "a.",
    ".one.two.three",
    "one.two.three ",
    "one.two..three",
    "one .two.three",
    " one.two.three",
    "com.atproto.feed.p@st",
    "com.atproto.feed.p_st",
    "com.atproto.feed.p*st",
    "com.atproto.feed.po#t",
    "com.atproto.feed.p!ot",
    "com.example-.foo",
    "com.-example.foo",
    "com.example.0foo",
    "com.example.f-o",
  ];

  for (const invalidNsid of invalidNsids) {
    const result = validateNsid(invalidNsid);
    assertEquals(result.success, false);
  }
});

Deno.test("NSID validation - conforms to interop valid NSIDs", async () => {
  const expectValid = (h: string) => {
    assertEquals(isValidNsid(h), true);
    ensureValidNsid(h);
    assertEquals(parseNsid(h), h.split("."));
    const regexResult = validateNsidRegex(h);
    assertEquals(regexResult.success, true);
    const validationResult = validateNsid(h);
    assertEquals(validationResult.success, true);
  };

  const filePath =
    new URL("./interop/nsid_syntax_valid.txt", import.meta.url).pathname;
  const fileContent = await Deno.readTextFile(filePath);
  const lines = fileContent.split("\n");

  for (const line of lines) {
    if (line.startsWith("#") || line.length === 0) {
      continue;
    }
    expectValid(line);
  }
});

Deno.test("NSID validation - conforms to interop invalid NSIDs", async () => {
  const expectInvalid = (h: string) => {
    assertEquals(isValidNsid(h), false);
    assertThrows(() => parseNsid(h), InvalidNsidError);
    assertThrows(() => ensureValidNsid(h), InvalidNsidError);
    const regexResult = validateNsidRegex(h);
    assertEquals(regexResult.success, false);
    const validationResult = validateNsid(h);
    assertEquals(validationResult.success, false);
  };

  const filePath =
    new URL("./interop/nsid_syntax_invalid.txt", import.meta.url).pathname;
  const fileContent = await Deno.readTextFile(filePath);
  const lines = fileContent.split("\n");

  for (const line of lines) {
    if (line.startsWith("#") || line.length === 0) {
      continue;
    }
    expectInvalid(line);
  }
});
