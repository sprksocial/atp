import { assertThrows } from "@std/assert";
import { ensureValidRecordKey, InvalidRecordKeyError } from "../mod.ts";

Deno.test("recordkey validation - conforms to interop valid recordkey", async () => {
  const expectValid = (r: string) => {
    ensureValidRecordKey(r);
  };

  const filePath =
    new URL("./interop/recordkey_syntax_valid.txt", import.meta.url).pathname;
  const fileContent = await Deno.readTextFile(filePath);
  const lines = fileContent.split("\n");

  for (const line of lines) {
    if (line.startsWith("#") || line.length === 0) {
      continue;
    }
    expectValid(line);
  }
});

Deno.test("recordkey validation - conforms to interop invalid recordkeys", async () => {
  const expectInvalid = (r: string) => {
    assertThrows(() => ensureValidRecordKey(r), InvalidRecordKeyError);
  };

  const filePath =
    new URL("./interop/recordkey_syntax_invalid.txt", import.meta.url).pathname;
  const fileContent = await Deno.readTextFile(filePath);
  const lines = fileContent.split("\n");

  for (const line of lines) {
    if (line.startsWith("#") || line.length === 0) {
      continue;
    }
    expectInvalid(line);
  }
});
