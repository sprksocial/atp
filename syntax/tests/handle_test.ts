import { assertEquals, assertThrows } from "jsr:@std/assert";
import {
  ensureValidHandle,
  ensureValidHandleRegex,
  InvalidHandleError,
  normalizeAndEnsureValidHandle,
} from "../mod.ts";

Deno.test("handle validation - allows valid handles", () => {
  const expectValid = (h: string) => {
    ensureValidHandle(h);
    ensureValidHandleRegex(h);
  };

  expectValid("A.ISI.EDU");
  expectValid("XX.LCS.MIT.EDU");
  expectValid("SRI-NIC.ARPA");
  expectValid("john.test");
  expectValid("jan.test");
  expectValid("a234567890123456789.test");
  expectValid("john2.test");
  expectValid("john-john.test");
  expectValid("john.bsky.app");
  expectValid("jo.hn");
  expectValid("a.co");
  expectValid("a.org");
  expectValid("joh.n");
  expectValid("j0.h0");
  const longHandle = "shoooort" + ".loooooooooooooooooooooooooong".repeat(8) +
    ".test";
  assertEquals(longHandle.length, 253);
  expectValid(longHandle);
  expectValid("short." + "o".repeat(63) + ".test");
  expectValid("jaymome-johnber123456.test");
  expectValid("jay.mome-johnber123456.test");
  expectValid("john.test.bsky.app");

  // NOTE: this probably isn't ever going to be a real domain, but my read of
  // the RFC is that it would be possible
  expectValid("john.t");
});

// NOTE: we may change this at the proto level; currently only disallowed at
// the registration level
Deno.test("handle validation - allows .local and .arpa handles (proto-level)", () => {
  const expectValid = (h: string) => {
    ensureValidHandle(h);
    ensureValidHandleRegex(h);
  };

  expectValid("laptop.local");
  expectValid("laptop.arpa");
});

Deno.test("handle validation - allows punycode handles", () => {
  const expectValid = (h: string) => {
    ensureValidHandle(h);
    ensureValidHandleRegex(h);
  };

  expectValid("xn--ls8h.test"); // 💩.test
  expectValid("xn--bcher-kva.tld"); // bücher.tld
  expectValid("xn--3jk.com");
  expectValid("xn--w3d.com");
  expectValid("xn--vqb.com");
  expectValid("xn--ppd.com");
  expectValid("xn--cs9a.com");
  expectValid("xn--8r9a.com");
  expectValid("xn--cfd.com");
  expectValid("xn--5jk.com");
  expectValid("xn--2lb.com");
});

Deno.test("handle validation - allows onion (Tor) handles", () => {
  const expectValid = (h: string) => {
    ensureValidHandle(h);
    ensureValidHandleRegex(h);
  };

  expectValid("expyuzz4wqqyqhjn.onion");
  expectValid("friend.expyuzz4wqqyqhjn.onion");
  expectValid(
    "g2zyxa5ihm7nsggfxnu52rck2vv4rvmdlkiu3zzui5du4xyclen53wid.onion",
  );
  expectValid(
    "friend.g2zyxa5ihm7nsggfxnu52rck2vv4rvmdlkiu3zzui5du4xyclen53wid.onion",
  );
  expectValid(
    "friend.g2zyxa5ihm7nsggfxnu52rck2vv4rvmdlkiu3zzui5du4xyclen53wid.onion",
  );
  expectValid(
    "2gzyxa5ihm7nsggfxnu52rck2vv4rvmdlkiu3zzui5du4xyclen53wid.onion",
  );
  expectValid(
    "friend.2gzyxa5ihm7nsggfxnu52rck2vv4rvmdlkiu3zzui5du4xyclen53wid.onion",
  );
});

Deno.test("handle validation - throws on invalid handles", () => {
  const expectInvalid = (h: string) => {
    assertThrows(() => ensureValidHandle(h), InvalidHandleError);
    assertThrows(() => ensureValidHandleRegex(h), InvalidHandleError);
  };

  expectInvalid("did:thing.test");
  expectInvalid("did:thing");
  expectInvalid("john-.test");
  expectInvalid("john.0");
  expectInvalid("john.-");
  expectInvalid("short." + "o".repeat(64) + ".test");
  expectInvalid("short" + ".loooooooooooooooooooooooong".repeat(10) + ".test");
  const longHandle = "shooooort" + ".loooooooooooooooooooooooooong".repeat(8) +
    ".test";
  assertEquals(longHandle.length, 254);
  expectInvalid(longHandle);
  expectInvalid("xn--bcher-.tld");
  expectInvalid("john..test");
  expectInvalid("jo_hn.test");
  expectInvalid("-john.test");
  expectInvalid(".john.test");
  expectInvalid("jo!hn.test");
  expectInvalid("jo%hn.test");
  expectInvalid("jo&hn.test");
  expectInvalid("jo@hn.test");
  expectInvalid("jo*hn.test");
  expectInvalid("jo|hn.test");
  expectInvalid("jo:hn.test");
  expectInvalid("jo/hn.test");
  expectInvalid("john💩.test");
  expectInvalid("bücher.test");
  expectInvalid("john .test");
  expectInvalid("john.test.");
  expectInvalid("john");
  expectInvalid("john.");
  expectInvalid(".john");
  expectInvalid("john.test.");
  expectInvalid(".john.test");
  expectInvalid(" john.test");
  expectInvalid("john.test ");
  expectInvalid("joh-.test");
  expectInvalid("john.-est");
  expectInvalid("john.tes-");
});

Deno.test('handle validation - throws on "dotless" TLD handles', () => {
  const expectInvalid = (h: string) => {
    assertThrows(() => ensureValidHandle(h), InvalidHandleError);
    assertThrows(() => ensureValidHandleRegex(h), InvalidHandleError);
  };

  expectInvalid("org");
  expectInvalid("ai");
  expectInvalid("gg");
  expectInvalid("io");
});

Deno.test("handle validation - correctly validates corner cases (modern vs. old RFCs)", () => {
  const expectValid = (h: string) => {
    ensureValidHandle(h);
    ensureValidHandleRegex(h);
  };
  const expectInvalid = (h: string) => {
    assertThrows(() => ensureValidHandle(h), InvalidHandleError);
    assertThrows(() => ensureValidHandleRegex(h), InvalidHandleError);
  };

  expectValid("12345.test");
  expectValid("8.cn");
  expectValid("4chan.org");
  expectValid("4chan.o-g");
  expectValid("blah.4chan.org");
  expectValid("thing.a01");
  expectValid("120.0.0.1.com");
  expectValid("0john.test");
  expectValid("9sta--ck.com");
  expectValid("99stack.com");
  expectValid("0ohn.test");
  expectValid("john.t--t");
  expectValid("thing.0aa.thing");

  expectInvalid("cn.8");
  expectInvalid("thing.0aa");
  expectInvalid("thing.0aa");
});

Deno.test("handle validation - does not allow IP addresses as handles", () => {
  const expectInvalid = (h: string) => {
    assertThrows(() => ensureValidHandle(h), InvalidHandleError);
    assertThrows(() => ensureValidHandleRegex(h), InvalidHandleError);
  };

  expectInvalid("127.0.0.1");
  expectInvalid("192.168.0.142");
  expectInvalid("fe80::7325:8a97:c100:94b");
  expectInvalid("2600:3c03::f03c:9100:feb0:af1f");
});

Deno.test("handle validation - is consistent with examples from stackoverflow", () => {
  const expectValid = (h: string) => {
    ensureValidHandle(h);
    ensureValidHandleRegex(h);
  };
  const expectInvalid = (h: string) => {
    assertThrows(() => ensureValidHandle(h), InvalidHandleError);
    assertThrows(() => ensureValidHandleRegex(h), InvalidHandleError);
  };

  const okStackoverflow = [
    "stack.com",
    "sta-ck.com",
    "sta---ck.com",
    "sta--ck9.com",
    "stack99.com",
    "sta99ck.com",
    "google.com.uk",
    "google.co.in",
    "google.com",
    "maselkowski.pl",
    "m.maselkowski.pl",
    "xn--masekowski-d0b.pl",
    "xn--fiqa61au8b7zsevnm8ak20mc4a87e.xn--fiqs8s",
    "xn--stackoverflow.com",
    "stackoverflow.xn--com",
    "stackoverflow.co.uk",
    "xn--masekowski-d0b.pl",
    "xn--fiqa61au8b7zsevnm8ak20mc4a87e.xn--fiqs8s",
  ];
  okStackoverflow.forEach(expectValid);

  const badStackoverflow = [
    "-notvalid.at-all",
    "-thing.com",
    "www.masełkowski.pl.com",
  ];
  badStackoverflow.forEach(expectInvalid);
});

Deno.test("handle validation - conforms to interop valid handles", async () => {
  const expectValid = (h: string) => {
    ensureValidHandle(h);
    ensureValidHandleRegex(h);
  };

  const filePath =
    new URL("./interop/handle_syntax_valid.txt", import.meta.url).pathname;
  const fileContent = await Deno.readTextFile(filePath);
  const lines = fileContent.split("\n");

  for (const line of lines) {
    if (line.startsWith("#") || line.length === 0) {
      continue;
    }
    expectValid(line);
  }
});

Deno.test("handle validation - conforms to interop invalid handles", async () => {
  const expectInvalid = (h: string) => {
    assertThrows(() => ensureValidHandle(h), InvalidHandleError);
    assertThrows(() => ensureValidHandleRegex(h), InvalidHandleError);
  };

  const filePath =
    new URL("./interop/handle_syntax_invalid.txt", import.meta.url).pathname;
  const fileContent = await Deno.readTextFile(filePath);
  const lines = fileContent.split("\n");

  for (const line of lines) {
    if (line.startsWith("#") || line.length === 0) {
      continue;
    }
    expectInvalid(line);
  }
});

Deno.test("normalization - normalizes handles", () => {
  const normalized = normalizeAndEnsureValidHandle("JoHn.TeST");
  assertEquals(normalized, "john.test");
});

Deno.test("normalization - throws on invalid normalized handles", () => {
  assertThrows(
    () => normalizeAndEnsureValidHandle("JoH!n.TeST"),
    InvalidHandleError,
  );
});
