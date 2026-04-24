import { assertEquals, assertRejects } from "@std/assert";
import {
  formatGeneratedText,
  GeneratedTextFormatError,
} from "../build/formatter.ts";

Deno.test("formatGeneratedText formats TypeScript output programmatically", async () => {
  const formatted = await formatGeneratedText(
    "/tmp/example.ts",
    'const   value={foo:"bar",items:[1,2,3]};',
  );

  assertEquals(
    formatted,
    'const value = { foo: "bar", items: [1, 2, 3] };\n',
  );
});

Deno.test("formatGeneratedText reports formatter failures with the file path", async () => {
  await assertRejects(
    async () => await formatGeneratedText("/tmp/bad.ts", "const = ;"),
    GeneratedTextFormatError,
    "Failed to format generated TypeScript file /tmp/bad.ts",
  );
});
