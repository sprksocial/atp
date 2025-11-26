import { assertEquals } from "@std/assert";
import { BooleanSchema } from "../schema/boolean.ts";
import { DictSchema } from "../schema/dict.ts";
import { EnumSchema } from "../schema/enum.ts";
import { IntegerSchema } from "../schema/integer.ts";
import { ObjectSchema } from "../schema/object.ts";
import { StringSchema } from "../schema/string.ts";

const simpleSchema = new ObjectSchema(
  {
    name: new StringSchema({}),
    age: new IntegerSchema({}),
    gender: new EnumSchema(["male", "female"]),
  },
  {
    required: ["name"],
    nullable: ["gender"],
  },
);

Deno.test("ObjectSchema simple schema validates plain objects", () => {
  const result = simpleSchema.validate({
    name: "Alice",
    age: 30,
    gender: "female",
  });
  assertEquals(result.success, true);
});

Deno.test("ObjectSchema simple schema rejects non-objects", () => {
  const result = simpleSchema.validate("not an object");
  assertEquals(result.success, false);
});

Deno.test("ObjectSchema simple schema rejects missing properties", () => {
  const result = simpleSchema.validate({
    age: 30,
    gender: "female",
  });
  assertEquals(result.success, false);
});

Deno.test("ObjectSchema simple schema validates optional properties", () => {
  const result = simpleSchema.validate({
    name: "Alice",
  });
  assertEquals(result.success, true);
});

Deno.test("ObjectSchema simple schema validates nullable properties", () => {
  const result = simpleSchema.validate({
    name: "Alice",
    gender: null,
  });
  assertEquals(result.success, true);
});

Deno.test("ObjectSchema simple schema rejects invalid property types", () => {
  const result = simpleSchema.validate({
    name: "Alice",
    age: "thirty",
  });
  assertEquals(result.success, false);
});

Deno.test("ObjectSchema simple schema ignores extra properties", () => {
  const result = simpleSchema.validate({
    name: "Alice",
    age: 30,
    extra: "value",
  });
  assertEquals(result.success, true);
});

const strictSchema = new ObjectSchema(
  {
    id: new StringSchema({}),
    score: new IntegerSchema({}),
  },
  {
    required: ["id", "score"],
    unknownProperties: "strict",
  },
);

Deno.test("ObjectSchema strict schema rejects extra properties", () => {
  const result = strictSchema.validate({
    id: "item1",
    score: 100,
    extra: "not allowed",
  });
  assertEquals(result.success, false);
});

Deno.test("ObjectSchema strict schema accepts only defined properties", () => {
  const result = strictSchema.validate({
    id: "item1",
    score: 100,
  });
  assertEquals(result.success, true);
});

const unknownPropertiesSchema = new ObjectSchema(
  {
    title: new StringSchema({}),
  },
  {
    required: ["title"],
    unknownProperties: new DictSchema(
      new EnumSchema(["tag1", "tag2"]),
      new BooleanSchema({}),
    ),
  },
);

Deno.test("schema with unknownProperties validator validates extra properties with the provided validator", () => {
  const result = unknownPropertiesSchema.validate({
    title: "My Post",
    tag1: true,
    tag2: false,
  });
  assertEquals(result.success, true);
});

Deno.test("schema with unknownProperties rejects extra properties that fail the provided validator", () => {
  const result = unknownPropertiesSchema.validate({
    title: "My Post",
    tag1: "not a boolean",
  });
  assertEquals(result.success, false);
});
