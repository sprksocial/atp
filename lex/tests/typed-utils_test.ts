import { assert, assertEquals, assertStrictEquals } from "@std/assert";
import { l } from "@atp/lex";
import type { LexMap } from "@atp/lex/data";

const unknownTypedObject: l.Unknown$TypedObject = {
  $type: "com.example.unknown" as l.Unknown$Type,
};

const lexMap: LexMap = unknownTypedObject;
const nestedLexMap: LexMap = {
  arr: [unknownTypedObject],
  val: unknownTypedObject,
};

Deno.test("$typed adds $type when missing", () => {
  assertEquals(
    l.$typed({ text: "hello" }, "com.example.post"),
    {
      $type: "com.example.post",
      text: "hello",
    },
  );
});

Deno.test("$typed reuses typed values with the same $type", () => {
  const value: l.$Typed<{ text: string }, "com.example.post"> = {
    $type: "com.example.post",
    text: "hello",
  };

  assertStrictEquals(l.$typed(value, "com.example.post"), value);
});

Deno.test("$typed retags typed values without collapsing the result type", () => {
  const value: l.$Typed<{ text: string }, "com.example.old"> = {
    $type: "com.example.old",
    text: "hello",
  };

  const retagged: l.$Typed<{ text: string }, "com.example.new"> = l.$typed(
    value,
    "com.example.new",
  );

  assertEquals(retagged, {
    $type: "com.example.new",
    text: "hello",
  });
});

Deno.test("Un$Typed removes $type at the type level", () => {
  const value: l.Un$Typed<l.$Typed<{ text: string }, "com.example.post">> = {
    text: "hello",
  };

  assertEquals(value, { text: "hello" });
});

Deno.test("$TypedMaybe allows omitting $type", () => {
  const value: l.$TypedMaybe<{ text: string }, "com.example.post"> = {
    text: "hello",
  };

  assertEquals(value, { text: "hello" });
});

Deno.test("Unknown$TypedObject is assignable to LexMap", () => {
  assertEquals(lexMap, unknownTypedObject);
  assertEquals(nestedLexMap, {
    arr: [unknownTypedObject],
    val: unknownTypedObject,
  });
});

Deno.test("typedObject isTypeOf narrows Unknown$TypedObject", () => {
  const known = l.typedObject(
    "com.example.post",
    "main",
    l.object({
      text: l.string(),
    }),
  );
  const value: l.Unknown$TypedObject = {
    $type: "com.example.post" as l.Unknown$Type,
  };

  if (known.isTypeOf(value)) {
    const narrowed: { $type?: "com.example.post" } = value;
    assertEquals(narrowed.$type, "com.example.post");
    return;
  }

  assert(false);
});

Deno.test("open typed unions accept unknown payloads that are LexMap values", () => {
  const known = l.typedObject(
    "com.example.post",
    "main",
    l.object({
      text: l.string(),
    }),
  );
  const union = l.typedUnion([l.typedRef(() => known)], false);
  const parsed = union.parse({
    $type: "com.example.unknown",
    nested: {
      text: "hello",
    },
  });

  assertEquals(
    parsed as unknown,
    {
      $type: "com.example.unknown",
      nested: {
        text: "hello",
      },
    },
  );
});

Deno.test("open typed unions reject unknown payloads with non-LexMap values", () => {
  const known = l.typedObject(
    "com.example.post",
    "main",
    l.object({
      text: l.string(),
    }),
  );
  const union = l.typedUnion([l.typedRef(() => known)], false);
  const result = union.safeParse({
    $type: "com.example.unknown",
    nested: {
      bad: () => "nope",
    },
  });

  assert(!result.success);
  assertEquals(result.error.issues[0]?.path, ["nested", "bad"]);
});
