import { CID } from "multiformats/cid";
import { type LexiconDoc, Lexicons, parseLexiconDoc } from "../mod.ts";
import LexiconDocs from "./scaffolds/lexicons.ts";
import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";

const lex = new Lexicons(LexiconDocs);

Deno.test("Validates records correctly", () => {
  {
    const res = lex.validate("com.example.kitchenSink", {
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
      datetime: new Date().toISOString(),
      atUri: "at://did:web:example.com/com.example.test/self",
      did: "did:web:example.com",
      cid: "bafyreidfayvfuwqa7qlnopdjiqrxzs6blmoeu4rujcjtnci5beludirz2a",
      bytes: new Uint8Array([0, 1, 2, 3]),
      cidLink: CID.parse(
        "bafyreidfayvfuwqa7qlnopdjiqrxzs6blmoeu4rujcjtnci5beludirz2a",
      ),
    });
    assert(res.success);
  }
  {
    const res = lex.validate("com.example.kitchenSink", {});
    assertFalse(res.success);
    if (res.success) throw new Error("Asserted");
    assertEquals(res.error?.message, 'Record must have the property "object"');
  }
});
Deno.test("Validates objects correctly", () => {
  {
    const res = lex.validate("com.example.kitchenSink#object", {
      object: { boolean: true },
      array: ["one", "two"],
      boolean: true,
      integer: 123,
      string: "string",
    });
    assert(res.success);
  }
  {
    const res = lex.validate("com.example.kitchenSink#object", {});
    assertFalse(res.success);
    if (res.success) throw new Error("Asserted");
    assertEquals(res.error?.message, 'Object must have the property "object"');
  }
});
Deno.test("fails when a required property is missing", () => {
  const schema = {
    lexicon: 1,
    id: "com.example.kitchenSink",
    defs: {
      test: {
        type: "object",
        required: ["foo"],
        properties: {},
      },
    },
  };
  assertThrows(() => {
    parseLexiconDoc(schema);
  }, 'Required field \\"foo\\" not defined');
});
Deno.test("allows unknown fields to be present", () => {
  const schema = {
    lexicon: 1,
    id: "com.example.unknownFields",
    defs: {
      test: {
        type: "object",
        properties: {},
        foo: 3,
      },
    },
  };

  assert(parseLexiconDoc(schema));
});
Deno.test("fails lexicon parsing when uri is invalid", () => {
  const schema: LexiconDoc = {
    lexicon: 1,
    id: "com.example.invalidUri",
    defs: {
      main: {
        type: "object",
        properties: {
          test: { type: "ref", ref: "com.example.invalid#test#test" },
        },
      },
    },
  };

  assertThrows(() => {
    new Lexicons([schema]);
  }, "Uri can only have one hash segment");
});
Deno.test("fails validation when ref uri has multiple hash segments", () => {
  const schema: LexiconDoc = {
    lexicon: 1,
    id: "com.example.invalidUri",
    defs: {
      main: {
        type: "object",
        properties: {
          test: { type: "integer" },
        },
      },
      object: {
        type: "object",
        required: ["test"],
        properties: {
          test: {
            type: "union",
            refs: ["com.example.invalidUri"],
          },
        },
      },
    },
  };
  const lexicons = new Lexicons([schema]);
  assertThrows(() => {
    lexicons.validate("com.example.invalidUri#object", {
      test: {
        $type: "com.example.invalidUri#main#main",
        test: 123,
      },
    });
  }, "Uri can only have one hash segment");
});
Deno.test("union handles both implicit and explicit #main", () => {
  const schemas: LexiconDoc[] = [
    {
      lexicon: 1,
      id: "com.example.implicitMain",
      defs: {
        main: {
          type: "object",
          required: ["test"],
          properties: {
            test: { type: "string" },
          },
        },
      },
    },
    {
      lexicon: 1,
      id: "com.example.testImplicitMain",
      defs: {
        main: {
          type: "object",
          required: ["union"],
          properties: {
            union: {
              type: "union",
              refs: ["com.example.implicitMain"],
            },
          },
        },
      },
    },
    {
      lexicon: 1,
      id: "com.example.testExplicitMain",
      defs: {
        main: {
          type: "object",
          required: ["union"],
          properties: {
            union: {
              type: "union",
              refs: ["com.example.implicitMain#main"],
            },
          },
        },
      },
    },
  ];

  const lexicon = new Lexicons(schemas);

  let result = lexicon.validate("com.example.testImplicitMain", {
    union: {
      $type: "com.example.implicitMain",
      test: 123,
    },
  });
  assertFalse(result.success);
  assertEquals(result["error"]?.message, "Object/union/test must be a string");

  result = lexicon.validate("com.example.testImplicitMain", {
    union: {
      $type: "com.example.implicitMain#main",
      test: 123,
    },
  });
  assertFalse(result.success);
  assertEquals(result["error"]?.message, "Object/union/test must be a string");

  result = lexicon.validate("com.example.testExplicitMain", {
    union: {
      $type: "com.example.implicitMain",
      test: 123,
    },
  });
  assertFalse(result.success);
  assertEquals(result["error"]?.message, "Object/union/test must be a string");

  result = lexicon.validate("com.example.testExplicitMain", {
    union: {
      $type: "com.example.implicitMain#main",
      test: 123,
    },
  });
  assertFalse(result.success);
  assertEquals(result["error"]?.message, "Object/union/test must be a string");
});
