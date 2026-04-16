import { assertEquals } from "@std/assert";
import { formatGeneratedText } from "../build/formatter.ts";

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
