import { Lexicons } from "../mod.ts";
import LexiconDocs from "./scaffolds/lexicons.ts";
import { assertEquals, assertThrows } from "@std/assert";

const lex = new Lexicons(LexiconDocs);

Deno.test("Passes valid inputs", () => {
  lex.assertValidXrpcInput("com.example.procedure", {
    object: { boolean: true },
    array: ["one", "two"],
    boolean: true,
    float: 123.45,
    integer: 123,
    string: "string",
  });
});

Deno.test("Validates the input", () => {
  // dont need to check this extensively since it's the same logic as tested in record validation
  assertThrows(() => {
    lex.assertValidXrpcInput("com.example.procedure", {
      object: { boolean: "string" },
      array: ["one", "two"],
      boolean: true,
      float: 123.45,
      integer: 123,
      string: "string",
    });
  }, "Input/object/boolean must be a boolean");
  assertThrows(() => {
    lex.assertValidXrpcInput("com.example.procedure", {});
  }, 'Input must have the property "object"');
});

Deno.test("Passes valid outputs", () => {
  lex.assertValidXrpcOutput("com.example.query", {
    object: { boolean: true },
    array: ["one", "two"],
    boolean: true,
    float: 123.45,
    integer: 123,
    string: "string",
  });
  lex.assertValidXrpcOutput("com.example.procedure", {
    object: { boolean: true },
    array: ["one", "two"],
    boolean: true,
    float: 123.45,
    integer: 123,
    string: "string",
  });
});

Deno.test("Validates the output", () => {
  // dont need to check this extensively since it's the same logic as tested in record validation
  assertThrows(() => {
    lex.assertValidXrpcOutput("com.example.query", {
      object: { boolean: "string" },
      array: ["one", "two"],
      boolean: true,
      float: 123.45,
      integer: 123,
      string: "string",
    });
  }, "Output/object/boolean must be a boolean");
  assertThrows(() => {
    lex.assertValidXrpcOutput("com.example.procedure", {});
  }, 'Output must have the property "object"');
});

Deno.test("Passes valid parameters", () => {
  const queryResult = lex.assertValidXrpcParams("com.example.query", {
    boolean: true,
    integer: 123,
    string: "string",
    array: ["x", "y"],
  });
  assertEquals(queryResult, {
    boolean: true,
    integer: 123,
    string: "string",
    array: ["x", "y"],
    def: 0,
  });
  const paramResult = lex.assertValidXrpcParams("com.example.procedure", {
    boolean: true,
    integer: 123,
    string: "string",
    array: ["x", "y"],
    def: 1,
  });
  assertEquals(paramResult, {
    boolean: true,
    integer: 123,
    string: "string",
    array: ["x", "y"],
    def: 1,
  });
});

Deno.test("Handles required correctly", () => {
  lex.assertValidXrpcParams("com.example.query", {
    boolean: true,
    integer: 123,
  });
  assertThrows(() => {
    lex.assertValidXrpcParams("com.example.query", {
      boolean: true,
    });
  }, 'Params must have the property "integer"');
  assertThrows(() => {
    lex.assertValidXrpcParams("com.example.query", {
      boolean: true,
      integer: undefined,
    });
  }, 'Params must have the property "integer"');
});

Deno.test("Validates parameter types", () => {
  assertThrows(() => {
    lex.assertValidXrpcParams("com.example.query", {
      boolean: "string",
      integer: 123,
      string: "string",
    });
  }, "boolean must be a boolean");
  assertThrows(() => {
    lex.assertValidXrpcParams("com.example.query", {
      boolean: true,
      float: 123.45,
      integer: 123,
      string: "string",
      array: "x",
    });
  }, "array must be an array");
});
