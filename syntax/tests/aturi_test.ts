import { assertEquals, assertThrows } from "jsr:@std/assert";
import { AtUri, ensureValidAtUri, ensureValidAtUriRegex } from "../mod.ts";

Deno.test("parses valid at uris", () => {
  //                 input   host    path    query   hash
  type AtUriTest = [string, string, string, string, string];
  const TESTS: AtUriTest[] = [
    ["foo.com", "foo.com", "", "", ""],
    ["at://foo.com", "foo.com", "", "", ""],
    ["at://foo.com/", "foo.com", "/", "", ""],
    ["at://foo.com/foo", "foo.com", "/foo", "", ""],
    ["at://foo.com/foo/", "foo.com", "/foo/", "", ""],
    ["at://foo.com/foo/bar", "foo.com", "/foo/bar", "", ""],
    ["at://foo.com?foo=bar", "foo.com", "", "foo=bar", ""],
    ["at://foo.com?foo=bar&baz=buux", "foo.com", "", "foo=bar&baz=buux", ""],
    ["at://foo.com/?foo=bar", "foo.com", "/", "foo=bar", ""],
    ["at://foo.com/foo?foo=bar", "foo.com", "/foo", "foo=bar", ""],
    ["at://foo.com/foo/?foo=bar", "foo.com", "/foo/", "foo=bar", ""],
    ["at://foo.com#hash", "foo.com", "", "", "#hash"],
    ["at://foo.com/#hash", "foo.com", "/", "", "#hash"],
    ["at://foo.com/foo#hash", "foo.com", "/foo", "", "#hash"],
    ["at://foo.com/foo/#hash", "foo.com", "/foo/", "", "#hash"],
    ["at://foo.com?foo=bar#hash", "foo.com", "", "foo=bar", "#hash"],

    [
      "did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw",
      "did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw",
      "",
      "",
      "",
    ],
    [
      "at://did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw",
      "did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw",
      "",
      "",
      "",
    ],
    [
      "at://did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw/",
      "did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw",
      "/",
      "",
      "",
    ],
    [
      "at://did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw/foo",
      "did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw",
      "/foo",
      "",
      "",
    ],
    [
      "at://did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw/foo/",
      "did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw",
      "/foo/",
      "",
      "",
    ],
    [
      "at://did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw/foo/bar",
      "did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw",
      "/foo/bar",
      "",
      "",
    ],
    [
      "at://did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw?foo=bar",
      "did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw",
      "",
      "foo=bar",
      "",
    ],
    [
      "at://did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw?foo=bar&baz=buux",
      "did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw",
      "",
      "foo=bar&baz=buux",
      "",
    ],
    [
      "at://did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw/?foo=bar",
      "did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw",
      "/",
      "foo=bar",
      "",
    ],
    [
      "at://did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw/foo?foo=bar",
      "did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw",
      "/foo",
      "foo=bar",
      "",
    ],
    [
      "at://did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw/foo/?foo=bar",
      "did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw",
      "/foo/",
      "foo=bar",
      "",
    ],
    [
      "at://did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw#hash",
      "did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw",
      "",
      "",
      "#hash",
    ],
    [
      "at://did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw/#hash",
      "did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw",
      "/",
      "",
      "#hash",
    ],
    [
      "at://did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw/foo#hash",
      "did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw",
      "/foo",
      "",
      "#hash",
    ],
    [
      "at://did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw/foo/#hash",
      "did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw",
      "/foo/",
      "",
      "#hash",
    ],
    [
      "at://did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw?foo=bar#hash",
      "did:example:EiAnKD8-jfdd0MDcZUjAbRgaThBrMxPTFOxcnfJhI7Ukaw",
      "",
      "foo=bar",
      "#hash",
    ],

    ["did:web:localhost%3A1234", "did:web:localhost%3A1234", "", "", ""],
    ["at://did:web:localhost%3A1234", "did:web:localhost%3A1234", "", "", ""],
    [
      "at://did:web:localhost%3A1234/",
      "did:web:localhost%3A1234",
      "/",
      "",
      "",
    ],
    [
      "at://did:web:localhost%3A1234/foo",
      "did:web:localhost%3A1234",
      "/foo",
      "",
      "",
    ],
    [
      "at://did:web:localhost%3A1234/foo/",
      "did:web:localhost%3A1234",
      "/foo/",
      "",
      "",
    ],
    [
      "at://did:web:localhost%3A1234/foo/bar",
      "did:web:localhost%3A1234",
      "/foo/bar",
      "",
      "",
    ],
    [
      "at://did:web:localhost%3A1234?foo=bar",
      "did:web:localhost%3A1234",
      "",
      "foo=bar",
      "",
    ],
    [
      "at://did:web:localhost%3A1234?foo=bar&baz=buux",
      "did:web:localhost%3A1234",
      "",
      "foo=bar&baz=buux",
      "",
    ],
    [
      "at://did:web:localhost%3A1234/?foo=bar",
      "did:web:localhost%3A1234",
      "/",
      "foo=bar",
      "",
    ],
    [
      "at://did:web:localhost%3A1234/foo?foo=bar",
      "did:web:localhost%3A1234",
      "/foo",
      "foo=bar",
      "",
    ],
    [
      "at://did:web:localhost%3A1234/foo/?foo=bar",
      "did:web:localhost%3A1234",
      "/foo/",
      "foo=bar",
      "",
    ],
    [
      "at://did:web:localhost%3A1234#hash",
      "did:web:localhost%3A1234",
      "",
      "",
      "#hash",
    ],
    [
      "at://did:web:localhost%3A1234/#hash",
      "did:web:localhost%3A1234",
      "/",
      "",
      "#hash",
    ],
    [
      "at://did:web:localhost%3A1234/foo#hash",
      "did:web:localhost%3A1234",
      "/foo",
      "",
      "#hash",
    ],
    [
      "at://did:web:localhost%3A1234/foo/#hash",
      "did:web:localhost%3A1234",
      "/foo/",
      "",
      "#hash",
    ],
    [
      "at://did:web:localhost%3A1234?foo=bar#hash",
      "did:web:localhost%3A1234",
      "",
      "foo=bar",
      "#hash",
    ],
    [
      "at://4513echo.bsky.social/app.bsky.feed.post/3jsrpdyf6ss23",
      "4513echo.bsky.social",
      "/app.bsky.feed.post/3jsrpdyf6ss23",
      "",
      "",
    ],
  ];
  for (const [uri, hostname, pathname, search, hash] of TESTS) {
    const urip = new AtUri(uri);
    assertEquals(urip.protocol, "at:");
    assertEquals(urip.host, hostname);
    assertEquals(urip.hostname, hostname);
    assertEquals(urip.origin, `at://${hostname}`);
    assertEquals(urip.pathname, pathname);
    assertEquals(urip.search, search);
    assertEquals(urip.hash, hash);
  }
});

Deno.test("handles ATP-specific parsing", () => {
  {
    const urip = new AtUri("at://foo.com");
    assertEquals(urip.collection, "");
    assertEquals(urip.rkey, "");
  }
  {
    const urip = new AtUri("at://foo.com/com.example.foo");
    assertEquals(urip.collection, "com.example.foo");
    assertEquals(urip.rkey, "");
  }
  {
    const urip = new AtUri("at://foo.com/com.example.foo/123");
    assertEquals(urip.collection, "com.example.foo");
    assertEquals(urip.rkey, "123");
  }
});

Deno.test("supports modifications", () => {
  const urip = new AtUri("at://foo.com");
  assertEquals(urip.toString(), "at://foo.com/");

  urip.host = "bar.com";
  assertEquals(urip.toString(), "at://bar.com/");
  urip.host = "did:web:localhost%3A1234";
  assertEquals(urip.toString(), "at://did:web:localhost%3A1234/");
  urip.host = "foo.com";

  urip.pathname = "/";
  assertEquals(urip.toString(), "at://foo.com/");
  urip.pathname = "/foo";
  assertEquals(urip.toString(), "at://foo.com/foo");
  urip.pathname = "foo";
  assertEquals(urip.toString(), "at://foo.com/foo");

  urip.collection = "com.example.foo";
  urip.rkey = "123";
  assertEquals(urip.toString(), "at://foo.com/com.example.foo/123");
  urip.rkey = "124";
  assertEquals(urip.toString(), "at://foo.com/com.example.foo/124");
  urip.collection = "com.other.foo";
  assertEquals(urip.toString(), "at://foo.com/com.other.foo/124");
  urip.pathname = "";
  urip.rkey = "123";
  assertEquals(urip.toString(), "at://foo.com/undefined/123");
  urip.pathname = "foo";

  urip.search = "?foo=bar";
  assertEquals(urip.toString(), "at://foo.com/foo?foo=bar");
  urip.searchParams.set("baz", "buux");
  assertEquals(urip.toString(), "at://foo.com/foo?foo=bar&baz=buux");

  urip.hash = "#hash";
  assertEquals(urip.toString(), "at://foo.com/foo?foo=bar&baz=buux#hash");
  urip.hash = "hash";
  assertEquals(urip.toString(), "at://foo.com/foo?foo=bar&baz=buux#hash");
});

Deno.test("supports relative URIs", () => {
  //                 input   path    query   hash
  type AtUriTest = [string, string, string, string];
  const TESTS: AtUriTest[] = [
    // input hostname pathname query hash
    ["", "", "", ""],
    ["/", "/", "", ""],
    ["/foo", "/foo", "", ""],
    ["/foo/", "/foo/", "", ""],
    ["/foo/bar", "/foo/bar", "", ""],
    ["?foo=bar", "", "foo=bar", ""],
    ["?foo=bar&baz=buux", "", "foo=bar&baz=buux", ""],
    ["/?foo=bar", "/", "foo=bar", ""],
    ["/foo?foo=bar", "/foo", "foo=bar", ""],
    ["/foo/?foo=bar", "/foo/", "foo=bar", ""],
    ["#hash", "", "", "#hash"],
    ["/#hash", "/", "", "#hash"],
    ["/foo#hash", "/foo", "", "#hash"],
    ["/foo/#hash", "/foo/", "", "#hash"],
    ["?foo=bar#hash", "", "foo=bar", "#hash"],
  ];
  const BASES: string[] = [
    "did:web:localhost%3A1234",
    "at://did:web:localhost%3A1234",
    "at://did:web:localhost%3A1234/foo/bar?foo=bar&baz=buux#hash",
    "did:web:localhost%3A1234",
    "at://did:web:localhost%3A1234",
    "at://did:web:localhost%3A1234/foo/bar?foo=bar&baz=buux#hash",
  ];

  for (const base of BASES) {
    const basep = new AtUri(base);
    for (const [relative, pathname, search, hash] of TESTS) {
      const urip = new AtUri(relative, base);
      assertEquals(urip.protocol, "at:");
      assertEquals(urip.host, basep.host);
      assertEquals(urip.hostname, basep.hostname);
      assertEquals(urip.origin, basep.origin);
      assertEquals(urip.pathname, pathname);
      assertEquals(urip.search, search);
      assertEquals(urip.hash, hash);
    }
  }
});

Deno.test("validation enforces spec basics", () => {
  const expectValid = (h: string) => {
    ensureValidAtUri(h);
    ensureValidAtUriRegex(h);
  };
  const expectInvalid = (h: string) => {
    assertThrows(() => ensureValidAtUri(h));
    assertThrows(() => ensureValidAtUriRegex(h));
  };

  expectValid("at://did:plc:asdf123");
  expectValid("at://user.bsky.social");
  expectValid("at://did:plc:asdf123/com.atproto.feed.post");
  expectValid("at://did:plc:asdf123/com.atproto.feed.post/record");

  expectValid("at://did:plc:asdf123#/frag");
  expectValid("at://user.bsky.social#/frag");
  expectValid("at://did:plc:asdf123/com.atproto.feed.post#/frag");
  expectValid("at://did:plc:asdf123/com.atproto.feed.post/record#/frag");

  expectInvalid("a://did:plc:asdf123");
  expectInvalid("at//did:plc:asdf123");
  expectInvalid("at:/a/did:plc:asdf123");
  expectInvalid("at:/did:plc:asdf123");
  expectInvalid("AT://did:plc:asdf123");
  expectInvalid("http://did:plc:asdf123");
  expectInvalid("://did:plc:asdf123");
  expectInvalid("at:did:plc:asdf123");
  expectInvalid("at:/did:plc:asdf123");
  expectInvalid("at:///did:plc:asdf123");
  expectInvalid("at://:/did:plc:asdf123");
  expectInvalid("at:/ /did:plc:asdf123");
  expectInvalid("at://did:plc:asdf123 ");
  expectInvalid("at://did:plc:asdf123/ ");
  expectInvalid(" at://did:plc:asdf123");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post ");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post# ");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post#/ ");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post#/frag ");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post#fr ag");
  expectInvalid("//did:plc:asdf123");
  expectInvalid("at://name");
  expectInvalid("at://name.0");
  expectInvalid("at://diD:plc:asdf123");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.p@st");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.p$st");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.p%st");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.p&st");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.p()t");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed_post");
  expectInvalid("at://did:plc:asdf123/-com.atproto.feed.post");
  expectInvalid("at://did:plc:asdf@123/com.atproto.feed.post");

  expectInvalid("at://DID:plc:asdf123");
  expectInvalid("at://user.bsky.123");
  expectInvalid("at://bsky");
  expectInvalid("at://did:plc:");
  expectInvalid("at://did:plc:");
  expectInvalid("at://frag");

  expectValid(
    "at://did:plc:asdf123/com.atproto.feed.post/" + "o".repeat(512),
  );
  expectInvalid(
    "at://did:plc:asdf123/com.atproto.feed.post/" + "o".repeat(8200),
  );
});

Deno.test("validation has specified behavior on edge cases", () => {
  const expectInvalid = (h: string) => {
    assertThrows(() => ensureValidAtUri(h));
    assertThrows(() => ensureValidAtUriRegex(h));
  };

  expectInvalid("at://user.bsky.social//");
  expectInvalid("at://user.bsky.social//com.atproto.feed.post");
  expectInvalid("at://user.bsky.social/com.atproto.feed.post//");
  expectInvalid(
    "at://did:plc:asdf123/com.atproto.feed.post/asdf123/more/more",
  );
  expectInvalid("at://did:plc:asdf123/short/stuff");
  expectInvalid("at://did:plc:asdf123/12345");
});

Deno.test("validation enforces no trailing slashes", () => {
  const expectValid = (h: string) => {
    ensureValidAtUri(h);
    ensureValidAtUriRegex(h);
  };
  const expectInvalid = (h: string) => {
    assertThrows(() => ensureValidAtUri(h));
    assertThrows(() => ensureValidAtUriRegex(h));
  };

  expectValid("at://did:plc:asdf123");
  expectInvalid("at://did:plc:asdf123/");

  expectValid("at://user.bsky.social");
  expectInvalid("at://user.bsky.social/");

  expectValid("at://did:plc:asdf123/com.atproto.feed.post");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post/");

  expectValid("at://did:plc:asdf123/com.atproto.feed.post/record");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post/record/");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post/record/#/frag");
});

Deno.test("validation enforces strict paths", () => {
  const expectValid = (h: string) => {
    ensureValidAtUri(h);
    ensureValidAtUriRegex(h);
  };
  const expectInvalid = (h: string) => {
    assertThrows(() => ensureValidAtUri(h));
    assertThrows(() => ensureValidAtUriRegex(h));
  };

  expectValid("at://did:plc:asdf123/com.atproto.feed.post/asdf123");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post/asdf123/asdf");
});

Deno.test("validation is restrictive about record keys", () => {
  const expectValid = (h: string) => {
    ensureValidAtUri(h);
    ensureValidAtUriRegex(h);
  };
  const expectInvalid = (h: string) => {
    assertThrows(() => ensureValidAtUri(h));
    assertThrows(() => ensureValidAtUriRegex(h));
  };

  // Valid record keys
  expectValid("at://did:plc:asdf123/com.atproto.feed.post/asdf123");
  expectValid("at://did:plc:asdf123/com.atproto.feed.post/a");
  expectValid("at://did:plc:asdf123/com.atproto.feed.post/asdf-123");
  expectValid("at://did:plc:asdf123/com.atproto.feed.post/self.");
  expectValid("at://did:plc:asdf123/com.atproto.feed.post/lang:");
  expectValid("at://did:plc:asdf123/com.atproto.feed.post/:");
  expectValid("at://did:plc:asdf123/com.atproto.feed.post/-");
  expectValid("at://did:plc:asdf123/com.atproto.feed.post/_");
  expectValid("at://did:plc:asdf123/com.atproto.feed.post/~");
  expectValid("at://did:plc:asdf123/com.atproto.feed.post/...");

  // Invalid record keys (now properly rejected)
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post/%23");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post/$@!*)(:,;~.sdf123");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post/~'sdf123");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post/$");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post/@");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post/!");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post/*");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post/(");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post/,");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post/;");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post/.");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post/..");
});

Deno.test("properly validates URL encoding in record keys", () => {
  const expectInvalid = (h: string) => {
    assertThrows(() => ensureValidAtUri(h));
    assertThrows(() => ensureValidAtUriRegex(h));
  };

  // These are now properly rejected as invalid record keys
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post/%30");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post/%3");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post/%");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post/%zz");
  expectInvalid("at://did:plc:asdf123/com.atproto.feed.post/%%%");
});

Deno.test("AtUri validation - is very permissive about fragments", () => {
  const expectValid = (h: string) => {
    ensureValidAtUri(h);
    ensureValidAtUriRegex(h);
  };
  const expectInvalid = (h: string) => {
    assertThrows(() => ensureValidAtUri(h));
    assertThrows(() => ensureValidAtUriRegex(h));
  };

  expectValid("at://did:plc:asdf123#/frac");

  expectInvalid("at://did:plc:asdf123#");
  expectInvalid("at://did:plc:asdf123##");
  expectInvalid("#at://did:plc:asdf123");
  expectInvalid("at://did:plc:asdf123#/asdf#/asdf");

  expectValid("at://did:plc:asdf123#/com.atproto.feed.post");
  expectValid("at://did:plc:asdf123#/com.atproto.feed.post/");
  expectValid("at://did:plc:asdf123#/asdf/");

  expectValid(
    "at://did:plc:asdf123/com.atproto.feed.post#/$@!*():,;~.sdf123",
  );
  expectValid("at://did:plc:asdf123#/[asfd]");

  expectValid("at://did:plc:asdf123#/$");
  expectValid("at://did:plc:asdf123#/*");
  expectValid("at://did:plc:asdf123#/;");
  expectValid("at://did:plc:asdf123#/,");
});

Deno.test("validation conforms to interop valid ATURIs", async () => {
  const expectValid = (h: string) => {
    ensureValidAtUri(h);
    ensureValidAtUriRegex(h);
  };

  const filePath =
    new URL("./interop/aturi_syntax_valid.txt", import.meta.url).pathname;
  const fileContent = await Deno.readTextFile(filePath);
  const lines = fileContent.split("\n");

  for (const line of lines) {
    if (line.startsWith("#") || line.length === 0) {
      continue;
    }
    expectValid(line);
  }
});

Deno.test("validation conforms to interop invalid ATURIs", async () => {
  const expectInvalid = (h: string) => {
    assertThrows(() => ensureValidAtUri(h));
    assertThrows(() => ensureValidAtUriRegex(h));
  };

  const filePath =
    new URL("./interop/aturi_syntax_invalid.txt", import.meta.url).pathname;
  const fileContent = await Deno.readTextFile(filePath);
  const lines = fileContent.split("\n");

  for (const line of lines) {
    if (line.startsWith("#") || line.length === 0) {
      continue;
    }
    expectInvalid(line);
  }
});
