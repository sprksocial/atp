import { CID } from "multiformats/cid";
import { Lexicons } from "../mod.ts";
import LexiconDocs from "./scaffolds/lexicons.ts";
import { assert, assertEquals, assertThrows } from "@std/assert";

const lex = new Lexicons(LexiconDocs);

const passingSink = {
  $type: "com.example.kitchenSink",
  object: {
    object: { boolean: true },
    array: ["one", "two"],
    boolean: true,
    integer: 123,
    string: "string",
  },
  array: ["one", "two"],
  boolean: true,
  integer: 123,
  string: "string",
  bytes: new Uint8Array([0, 1, 2, 3]),
  cidLink: CID.parse(
    "bafyreidfayvfuwqa7qlnopdjiqrxzs6blmoeu4rujcjtnci5beludirz2a",
  ),
};

Deno.test("Passes valid schemas", () => {
  lex.assertValidRecord("com.example.kitchenSink", passingSink);
});

Deno.test("Fails invalid input types", () => {
  assertThrows(() => {
    lex.assertValidRecord("com.example.kitchenSink", undefined);
  }, "Record must be an object");
  assertThrows(() => {
    lex.assertValidRecord("com.example.kitchenSink", 1234);
  }, "Record must be an object");
  assertThrows(() => {
    lex.assertValidRecord("com.example.kitchenSink", "string");
  }, "Record must be an object");
});

Deno.test("Fails incorrect $type", () => {
  assertThrows(() => {
    lex.assertValidRecord("com.example.kitchenSink", {});
  }, "Record/$type must be a string");
  assertThrows(() => {
    lex.assertValidRecord("com.example.kitchenSink", { $type: "foo" });
  }, "Invalid $type: must be lex:com.example.kitchenSink, got foo");
});

Deno.test("Fails missing required", () => {
  assertThrows(() => {
    lex.assertValidRecord("com.example.kitchenSink", {
      $type: "com.example.kitchenSink",
      array: ["one", "two"],
      boolean: true,
      integer: 123,
      string: "string",
      datetime: new Date().toISOString(),
      atUri: "at://did:web:example.com/com.example.test/self",
      did: "did:web:example.com",
      cid: "bafyreidfayvfuwqa7qlnopdjiqrxzs6blmoeu4rujcjtnci5beludirz2a",
      bytes: new Uint8Array([0, 1, 2, 3]),
      cidLink: CID.parse(
        "bafyreidfayvfuwqa7qlnopdjiqrxzs6blmoeu4rujcjtnci5beludirz2a",
      ),
    });
  }, "Record must have the property 'object'");
  assertThrows(() => {
    lex.assertValidRecord("com.example.kitchenSink", {
      ...passingSink,
      object: undefined,
    });
  }, "Record must have the property 'object'");
});

Deno.test("Fails incorrect types", () => {
  assertThrows(() => {
    lex.assertValidRecord("com.example.kitchenSink", {
      ...passingSink,
      object: {
        ...passingSink.object,
        object: { boolean: "1234" },
      },
    });
  }, "Record/object/object/boolean must be a boolean");
  assertThrows(() => {
    lex.assertValidRecord("com.example.kitchenSink", {
      ...passingSink,
      object: true,
    });
  }, "Record/object must be an object");
  assertThrows(() => {
    lex.assertValidRecord("com.example.kitchenSink", {
      ...passingSink,
      array: 1234,
    });
  }, "Record/array must be an array");
  assertThrows(() => {
    lex.assertValidRecord("com.example.kitchenSink", {
      ...passingSink,
      integer: true,
    });
  }, "Record/integer must be an integer");
  assertThrows(() => {
    lex.assertValidRecord("com.example.kitchenSink", {
      ...passingSink,
      string: {},
    });
  }, "Record/string must be a string");
  assertThrows(() => {
    lex.assertValidRecord("com.example.kitchenSink", {
      ...passingSink,
      bytes: 1234,
    });
  }, "Record/bytes must be a byte array");
  assertThrows(() => {
    lex.assertValidRecord("com.example.kitchenSink", {
      ...passingSink,
      cidLink: "bafyreidfayvfuwqa7qlnopdjiqrxzs6blmoeu4rujcjtnci5beludirz2a",
    });
  }, "Record/cidLink must be a CID");
});

Deno.test("Handles optional properties correctly", () => {
  lex.assertValidRecord("com.example.optional", {
    $type: "com.example.optional",
  });
});

Deno.test("Handles default properties correctly", () => {
  const result = lex.assertValidRecord("com.example.default", {
    $type: "com.example.default",
    object: {},
  });
  assertEquals(result, {
    $type: "com.example.default",
    boolean: false,
    integer: 0,
    string: "",
    object: {
      boolean: true,
      integer: 1,
      string: "x",
    },
  });
  assert(!("datetime" in (result as Record<string, unknown>)));
});

Deno.test("Handles unions correctly", () => {
  lex.assertValidRecord("com.example.union", {
    $type: "com.example.union",
    unionOpen: {
      $type: "com.example.kitchenSink#object",
      object: { boolean: true },
      array: ["one", "two"],
      boolean: true,
      integer: 123,
      string: "string",
    },
    unionClosed: {
      $type: "com.example.kitchenSink#subobject",
      boolean: true,
    },
  });
  lex.assertValidRecord("com.example.union", {
    $type: "com.example.union",
    unionOpen: {
      $type: "com.example.other",
    },
    unionClosed: {
      $type: "com.example.kitchenSink#subobject",
      boolean: true,
    },
  });
  assertThrows(() => {
    lex.assertValidRecord("com.example.union", {
      $type: "com.example.union",
      unionOpen: {},
      unionClosed: {},
    });
  }, 'Record/unionOpen must be an object which includes the "$type" property');
  assertThrows(
    () => {
      lex.assertValidRecord("com.example.union", {
        $type: "com.example.union",
        unionOpen: {
          $type: "com.example.other",
        },
        unionClosed: {
          $type: "com.example.other",
          boolean: true,
        },
      });
    },
    "Record/unionClosed $type must be one of lex:com.example.kitchenSink#object, lex:com.example.kitchenSink#subobject",
  );
});

Deno.test("Handles unknowns correctly", () => {
  lex.assertValidRecord("com.example.unknown", {
    $type: "com.example.unknown",
    unknown: { foo: "bar" },
  });
  assertThrows(() => {
    lex.assertValidRecord("com.example.unknown", {
      $type: "com.example.unknown",
    });
  }, 'Record must have the property "unknown"');
});

Deno.test("Applies array length constraints", () => {
  lex.assertValidRecord("com.example.arrayLength", {
    $type: "com.example.arrayLength",
    array: [1, 2, 3],
  });
  assertThrows(() => {
    lex.assertValidRecord("com.example.arrayLength", {
      $type: "com.example.arrayLength",
      array: [1],
    });
  }, "Record/array must not have fewer than 2 elements");
  assertThrows(() => {
    lex.assertValidRecord("com.example.arrayLength", {
      $type: "com.example.arrayLength",
      array: [1, 2, 3, 4, 5],
    });
  }, "Record/array must not have more than 4 elements");
});

Deno.test("Applies array item constraints", () => {
  assertThrows(() => {
    lex.assertValidRecord("com.example.arrayLength", {
      $type: "com.example.arrayLength",
      array: [1, "2", 3],
    });
  }, "Record/array/1 must be an integer");
  assertThrows(() => {
    lex.assertValidRecord("com.example.arrayLength", {
      $type: "com.example.arrayLength",
      array: [1, undefined, 3],
    });
  }, "Record/array/1 must be an integer");
});

Deno.test("Applies boolean const constraint", () => {
  lex.assertValidRecord("com.example.boolConst", {
    $type: "com.example.boolConst",
    boolean: false,
  });
  assertThrows(() => {
    lex.assertValidRecord("com.example.boolConst", {
      $type: "com.example.boolConst",
      boolean: true,
    });
  }, "Record/boolean must be false");
});

Deno.test("Applies integer range constraint", () => {
  lex.assertValidRecord("com.example.integerRange", {
    $type: "com.example.integerRange",
    integer: 2,
  });
  assertThrows(() => {
    lex.assertValidRecord("com.example.integerRange", {
      $type: "com.example.integerRange",
      integer: 1,
    });
  }, "Record/integer can not be less than 2");
  assertThrows(() => {
    lex.assertValidRecord("com.example.integerRange", {
      $type: "com.example.integerRange",
      integer: 5,
    });
  }, "Record/integer can not be greater than 4");
});

Deno.test("Applies integer enum constraint", () => {
  lex.assertValidRecord("com.example.integerEnum", {
    $type: "com.example.integerEnum",
    integer: 2,
  });
  assertThrows(() => {
    lex.assertValidRecord("com.example.integerEnum", {
      $type: "com.example.integerEnum",
      integer: 0,
    });
  }, "Record/integer must be one of (1|2)");
});

Deno.test("Applies integer const constraint", () => {
  lex.assertValidRecord("com.example.integerConst", {
    $type: "com.example.integerConst",
    integer: 0,
  });
  assertThrows(() => {
    lex.assertValidRecord("com.example.integerConst", {
      $type: "com.example.integerConst",
      integer: 1,
    });
  }, "Record/integer must be 0");
});

Deno.test("Applies integer whole-number constraint", () => {
  assertThrows(() => {
    lex.assertValidRecord("com.example.integerRange", {
      $type: "com.example.integerRange",
      integer: 2.5,
    });
  }, "Record/integer must be an integer");
});

Deno.test("Applies string length constraint", () => {
  // Shorter than two UTF8 characters
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLength", {
      $type: "com.example.stringLength",
      string: "",
    });
  }, "Record/string must not be shorter than 2 characters");
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLength", {
      $type: "com.example.stringLength",
      string: "a",
    });
  }, "Record/string must not be shorter than 2 characters");

  // Two to four UTF8 characters
  lex.assertValidRecord("com.example.stringLength", {
    $type: "com.example.stringLength",
    string: "ab",
  });
  lex.assertValidRecord("com.example.stringLength", {
    $type: "com.example.stringLength",
    string: "\u0301", // Combining acute accent (2 bytes)
  });
  lex.assertValidRecord("com.example.stringLength", {
    $type: "com.example.stringLength",
    string: "a\u0301", // 'a' + combining acute accent (1 + 2 bytes = 3 bytes)
  });
  lex.assertValidRecord("com.example.stringLength", {
    $type: "com.example.stringLength",
    string: "aé", // 'a' (1 byte) + 'é' (2 bytes) = 3 bytes
  });
  lex.assertValidRecord("com.example.stringLength", {
    $type: "com.example.stringLength",
    string: "abc",
  });
  lex.assertValidRecord("com.example.stringLength", {
    $type: "com.example.stringLength",
    string: "一", // CJK character (3 bytes)
  });
  lex.assertValidRecord("com.example.stringLength", {
    $type: "com.example.stringLength",
    string: "\uD83D", // Unpaired high surrogate (3 bytes)
  });
  lex.assertValidRecord("com.example.stringLength", {
    $type: "com.example.stringLength",
    string: "abcd",
  });
  lex.assertValidRecord("com.example.stringLength", {
    $type: "com.example.stringLength",
    string: "éé", // 'é' + 'é' (2 + 2 bytes = 4 bytes)
  });
  lex.assertValidRecord("com.example.stringLength", {
    $type: "com.example.stringLength",
    string: "aaé", // 1 + 1 + 2 = 4 bytes
  });
  lex.assertValidRecord("com.example.stringLength", {
    $type: "com.example.stringLength",
    string: "👋", // 4 bytes
  });

  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLength", {
      $type: "com.example.stringLength",
      string: "abcde",
    });
  }, "Record/string must not be longer than 4 characters");
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLength", {
      $type: "com.example.stringLength",
      string: "a\u0301\u0301", // 1 + (2 * 2) = 5 bytes
    });
  }, "Record/string must not be longer than 4 characters");
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLength", {
      $type: "com.example.stringLength",
      string: "\uD83D\uD83D", // Two unpaired high surrogates (3 * 2 = 6 bytes)
    });
  }, "Record/string must not be longer than 4 characters");
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLength", {
      $type: "com.example.stringLength",
      string: "ééé", // 2 + 2 + 2 bytes = 6 bytes
    });
  }, "Record/string must not be longer than 4 characters");
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLength", {
      $type: "com.example.stringLength",
      string: "👋a", // 4 + 1 bytes = 5 bytes
    });
  }, "Record/string must not be longer than 4 characters");
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLength", {
      $type: "com.example.stringLength",
      string: "👨👨", // 4 + 4 = 8 bytes
    });
  }, "Record/string must not be longer than 4 characters");
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLength", {
      $type: "com.example.stringLength",
      string: "👨‍👩‍👧‍👧", // 4 emojis × 4 bytes + 3 ZWJs × 3 bytes = 25 bytes
    });
  }, "Record/string must not be longer than 4 characters");
});

Deno.test("Applies string length constraint (no minLength)", () => {
  // Shorter than two UTF8 characters
  lex.assertValidRecord("com.example.stringLengthNoMinLength", {
    $type: "com.example.stringLengthNoMinLength",
    string: "",
  });
  lex.assertValidRecord("com.example.stringLengthNoMinLength", {
    $type: "com.example.stringLengthNoMinLength",
    string: "a",
  });

  // Two to four UTF8 characters
  lex.assertValidRecord("com.example.stringLengthNoMinLength", {
    $type: "com.example.stringLengthNoMinLength",
    string: "ab",
  });
  lex.assertValidRecord("com.example.stringLengthNoMinLength", {
    $type: "com.example.stringLengthNoMinLength",
    string: "\u0301", // Combining acute accent (2 bytes)
  });
  lex.assertValidRecord("com.example.stringLengthNoMinLength", {
    $type: "com.example.stringLengthNoMinLength",
    string: "a\u0301", // 'a' + combining acute accent (1 + 2 bytes = 3 bytes)
  });
  lex.assertValidRecord("com.example.stringLengthNoMinLength", {
    $type: "com.example.stringLengthNoMinLength",
    string: "aé", // 'a' (1 byte) + 'é' (2 bytes) = 3 bytes
  });
  lex.assertValidRecord("com.example.stringLengthNoMinLength", {
    $type: "com.example.stringLengthNoMinLength",
    string: "abc",
  });
  lex.assertValidRecord("com.example.stringLengthNoMinLength", {
    $type: "com.example.stringLengthNoMinLength",
    string: "一", // CJK character (3 bytes)
  });
  lex.assertValidRecord("com.example.stringLengthNoMinLength", {
    $type: "com.example.stringLengthNoMinLength",
    string: "\uD83D", // Unpaired high surrogate (3 bytes)
  });
  lex.assertValidRecord("com.example.stringLengthNoMinLength", {
    $type: "com.example.stringLengthNoMinLength",
    string: "abcd",
  });
  lex.assertValidRecord("com.example.stringLengthNoMinLength", {
    $type: "com.example.stringLengthNoMinLength",
    string: "éé", // 'é' + 'é' (2 + 2 bytes = 4 bytes)
  });
  lex.assertValidRecord("com.example.stringLengthNoMinLength", {
    $type: "com.example.stringLengthNoMinLength",
    string: "aaé", // 1 + 1 + 2 = 4 bytes
  });
  lex.assertValidRecord("com.example.stringLengthNoMinLength", {
    $type: "com.example.stringLengthNoMinLength",
    string: "👋", // 4 bytes
  });

  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLengthNoMinLength", {
      $type: "com.example.stringLengthNoMinLength",
      string: "abcde",
    });
  }, "Record/string must not be longer than 4 characters");
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLengthNoMinLength", {
      $type: "com.example.stringLengthNoMinLength",
      string: "a\u0301\u0301", // 1 + (2 * 2) = 5 bytes
    });
  }, "Record/string must not be longer than 4 characters");
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLengthNoMinLength", {
      $type: "com.example.stringLengthNoMinLength",
      string: "\uD83D\uD83D", // Two unpaired high surrogates (3 * 2 = 6 bytes)
    });
  }, "Record/string must not be longer than 4 characters");
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLengthNoMinLength", {
      $type: "com.example.stringLengthNoMinLength",
      string: "ééé", // 2 + 2 + 2 bytes = 6 bytes
    });
  }, "Record/string must not be longer than 4 characters");
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLengthNoMinLength", {
      $type: "com.example.stringLengthNoMinLength",
      string: "👋a", // 4 + 1 bytes = 5 bytes
    });
  }, "Record/string must not be longer than 4 characters");
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLengthNoMinLength", {
      $type: "com.example.stringLengthNoMinLength",
      string: "👨👨", // 4 + 4 = 8 bytes
    });
  }, "Record/string must not be longer than 4 characters");
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLengthNoMinLength", {
      $type: "com.example.stringLengthNoMinLength",
      string: "👨‍👩‍👧‍👧", // 4 emojis × 4 bytes + 3 ZWJs × 3 bytes = 25 bytes
    });
  }, "Record/string must not be longer than 4 characters");
});

Deno.test("Applies grapheme string length constraint", () => {
  // Shorter than two graphemes
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLengthGrapheme", {
      $type: "com.example.stringLengthGrapheme",
      string: "",
    });
  }, "Record/string must not be shorter than 2 graphemes");
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLengthGrapheme", {
      $type: "com.example.stringLengthGrapheme",
      string: "\u0301\u0301\u0301", // Three combining acute accents
    });
  }, "Record/string must not be shorter than 2 graphemes");
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLengthGrapheme", {
      $type: "com.example.stringLengthGrapheme",
      string: "a",
    });
  }, "Record/string must not be shorter than 2 graphemes");
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLengthGrapheme", {
      $type: "com.example.stringLengthGrapheme",
      string: "a\u0301\u0301\u0301\u0301", // 'á́́́' ('a' with four combining acute accents)
    });
  }, "Record/string must not be shorter than 2 graphemes");
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLengthGrapheme", {
      $type: "com.example.stringLengthGrapheme",
      string: "5\uFE0F", // '5️' with emoji presentation
    });
  }, "Record/string must not be shorter than 2 graphemes");
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLengthGrapheme", {
      $type: "com.example.stringLengthGrapheme",
      string: "👨‍👩‍👧‍👧",
    });
  }, "Record/string must not be shorter than 2 graphemes");

  // Two to four graphemes
  lex.assertValidRecord("com.example.stringLengthGrapheme", {
    $type: "com.example.stringLengthGrapheme",
    string: "ab",
  });
  lex.assertValidRecord("com.example.stringLengthGrapheme", {
    $type: "com.example.stringLengthGrapheme",
    string: "a\u0301b", // 'áb' with combining accent
  });
  lex.assertValidRecord("com.example.stringLengthGrapheme", {
    $type: "com.example.stringLengthGrapheme",
    string: "a\u0301b\u0301", // 'áb́'
  });
  lex.assertValidRecord("com.example.stringLengthGrapheme", {
    $type: "com.example.stringLengthGrapheme",
    string: "😀😀",
  });
  lex.assertValidRecord("com.example.stringLengthGrapheme", {
    $type: "com.example.stringLengthGrapheme",
    string: "12👨‍👩‍👧‍👧",
  });
  lex.assertValidRecord("com.example.stringLengthGrapheme", {
    $type: "com.example.stringLengthGrapheme",
    string: "abcd",
  });
  lex.assertValidRecord("com.example.stringLengthGrapheme", {
    $type: "com.example.stringLengthGrapheme",
    string: "a\u0301b\u0301c\u0301d\u0301", // 'áb́ćd́'
  });

  // Longer than four graphemes
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLengthGrapheme", {
      $type: "com.example.stringLengthGrapheme",
      string: "abcde",
    });
  }, "Record/string must not be longer than 4 graphemes");
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLengthGrapheme", {
      $type: "com.example.stringLengthGrapheme",
      string: "a\u0301b\u0301c\u0301d\u0301e\u0301", // 'áb́ćd́é'
    });
  }, "Record/string must not be longer than 4 graphemes");
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLengthGrapheme", {
      $type: "com.example.stringLengthGrapheme",
      string: "😀😀😀😀😀",
    });
  }, "Record/string must not be longer than 4 graphemes");
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringLengthGrapheme", {
      $type: "com.example.stringLengthGrapheme",
      string: "ab😀de",
    });
  }, "Record/string must not be longer than 4 graphemes");
});

Deno.test("Applies string enum constraint", () => {
  lex.assertValidRecord("com.example.stringEnum", {
    $type: "com.example.stringEnum",
    string: "a",
  });
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringEnum", {
      $type: "com.example.stringEnum",
      string: "c",
    });
  }, "Record/string must be one of (a|b)");
});

Deno.test("Applies string const constraint", () => {
  lex.assertValidRecord("com.example.stringConst", {
    $type: "com.example.stringConst",
    string: "a",
  });
  assertThrows(() => {
    lex.assertValidRecord("com.example.stringConst", {
      $type: "com.example.stringConst",
      string: "b",
    });
  }, "Record/string must be a");
});

Deno.test("Applies datetime formatting constraint", () => {
  for (
    const datetime of [
      "2022-12-12T00:50:36.809Z",
      "2022-12-12T00:50:36Z",
      "2022-12-12T00:50:36.8Z",
      "2022-12-12T00:50:36.80Z",
      "2022-12-12T00:50:36+00:00",
      "2022-12-12T00:50:36.8+00:00",
      "2022-12-11T19:50:36-05:00",
      "2022-12-11T19:50:36.8-05:00",
      "2022-12-11T19:50:36.80-05:00",
      "2022-12-11T19:50:36.809-05:00",
    ]
  ) {
    lex.assertValidRecord("com.example.datetime", {
      $type: "com.example.datetime",
      datetime,
    });
  }
  assertThrows(
    () => {
      lex.assertValidRecord("com.example.datetime", {
        $type: "com.example.datetime",
        datetime: "bad date",
      });
    },
    "Record/datetime must be an valid atproto datetime (both RFC-3339 and ISO-8601)",
  );
});

Deno.test("Applies uri formatting constraint", () => {
  for (
    const uri of [
      "https://example.com",
      "https://example.com/with/path",
      "https://example.com/with/path?and=query",
      "at://bsky.social",
      "did:example:test",
    ]
  ) {
    lex.assertValidRecord("com.example.uri", {
      $type: "com.example.uri",
      uri,
    });
  }
  assertThrows(() => {
    lex.assertValidRecord("com.example.uri", {
      $type: "com.example.uri",
      uri: "not a uri",
    });
  }, "Record/uri must be a uri");
});

Deno.test("Applies at-uri formatting constraint", () => {
  lex.assertValidRecord("com.example.atUri", {
    $type: "com.example.atUri",
    atUri: "at://did:web:example.com/com.example.test/self",
  });
  assertThrows(() => {
    lex.assertValidRecord("com.example.atUri", {
      $type: "com.example.atUri",
      atUri: "http://not-atproto.com",
    });
  }, "Record/atUri must be a valid at-uri");
});

Deno.test("Applies did formatting constraint", () => {
  lex.assertValidRecord("com.example.did", {
    $type: "com.example.did",
    did: "did:web:example.com",
  });
  lex.assertValidRecord("com.example.did", {
    $type: "com.example.did",
    did: "did:plc:12345678abcdefghijklmnop",
  });

  assertThrows(() => {
    lex.assertValidRecord("com.example.did", {
      $type: "com.example.did",
      did: "bad did",
    });
  }, "Record/did must be a valid did");
  assertThrows(() => {
    lex.assertValidRecord("com.example.did", {
      $type: "com.example.did",
      did: "did:short",
    });
  }, "Record/did must be a valid did");
});

Deno.test("Applies handle formatting constraint", () => {
  lex.assertValidRecord("com.example.handle", {
    $type: "com.example.handle",
    handle: "test.bsky.social",
  });
  lex.assertValidRecord("com.example.handle", {
    $type: "com.example.handle",
    handle: "bsky.test",
  });

  assertThrows(() => {
    lex.assertValidRecord("com.example.handle", {
      $type: "com.example.handle",
      handle: "bad handle",
    });
  }, "Record/handle must be a valid handle");
  assertThrows(() => {
    lex.assertValidRecord("com.example.handle", {
      $type: "com.example.handle",
      handle: "-bad-.test",
    });
  }, "Record/handle must be a valid handle");
});

Deno.test("Applies at-identifier formatting constraint", () => {
  lex.assertValidRecord("com.example.atIdentifier", {
    $type: "com.example.atIdentifier",
    atIdentifier: "bsky.test",
  });
  lex.assertValidRecord("com.example.atIdentifier", {
    $type: "com.example.atIdentifier",
    atIdentifier: "did:plc:12345678abcdefghijklmnop",
  });

  assertThrows(() => {
    lex.assertValidRecord("com.example.atIdentifier", {
      $type: "com.example.atIdentifier",
      atIdentifier: "bad id",
    });
  }, "Record/atIdentifier must be a valid did or a handle");
  assertThrows(() => {
    lex.assertValidRecord("com.example.atIdentifier", {
      $type: "com.example.atIdentifier",
      atIdentifier: "-bad-.test",
    });
  }, "Record/atIdentifier must be a valid did or a handle");
});

Deno.test("Applies nsid formatting constraint", () => {
  lex.assertValidRecord("com.example.nsid", {
    $type: "com.example.nsid",
    nsid: "com.atproto.test",
  });
  lex.assertValidRecord("com.example.nsid", {
    $type: "com.example.nsid",
    nsid: "app.bsky.nested.test",
  });

  assertThrows(() => {
    lex.assertValidRecord("com.example.nsid", {
      $type: "com.example.nsid",
      nsid: "bad nsid",
    });
  }, "Record/nsid must be a valid nsid");
  assertThrows(() => {
    lex.assertValidRecord("com.example.nsid", {
      $type: "com.example.nsid",
      nsid: "com.bad-.foo",
    });
  }, "Record/nsid must be a valid nsid");
});

Deno.test("Applies cid formatting constraint", () => {
  lex.assertValidRecord("com.example.cid", {
    $type: "com.example.cid",
    cid: "bafyreidfayvfuwqa7qlnopdjiqrxzs6blmoeu4rujcjtnci5beludirz2a",
  });
  assertThrows(() => {
    lex.assertValidRecord("com.example.cid", {
      $type: "com.example.cid",
      cid: "abapsdofiuwrpoiasdfuaspdfoiu",
    });
  }, "Record/cid must be a cid string");
});

Deno.test("Applies language formatting constraint", () => {
  lex.assertValidRecord("com.example.language", {
    $type: "com.example.language",
    language: "en-US-boont",
  });
  assertThrows(() => {
    lex.assertValidRecord("com.example.language", {
      $type: "com.example.language",
      language: "not-a-language-",
    });
  }, "Record/language must be a well-formed BCP 47 language tag");
});

Deno.test("Applies bytes length constraints", () => {
  lex.assertValidRecord("com.example.byteLength", {
    $type: "com.example.byteLength",
    bytes: new Uint8Array([1, 2, 3]),
  });
  assertThrows(() =>
    lex.assertValidRecord("com.example.byteLength", {
      $type: "com.example.byteLength",
      bytes: new Uint8Array([1]),
    })
  );
  assertThrows(() =>
    lex.assertValidRecord("com.example.byteLength", {
      $type: "com.example.byteLength",
      bytes: new Uint8Array([1, 2, 3, 4, 5]),
    })
  );
});
