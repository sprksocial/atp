import { assertThrows } from "jsr:@std/assert";
import { ensureValidTid, InvalidTidError } from "../mod.ts";

Deno.test("tid validation - conforms to interop valid tid", async () => {
  const expectValid = (t: string) => {
    ensureValidTid(t);
  };

  const filePath =
    new URL("./interop/tid_syntax_valid.txt", import.meta.url).pathname;
  const fileContent = await Deno.readTextFile(filePath);
  const lines = fileContent.split("\n");

  for (const line of lines) {
    if (line.startsWith("#") || line.length === 0) {
      continue;
    }
    expectValid(line);
  }
});

Deno.test("tid validation - conforms to interop invalid tids", async () => {
  const expectInvalid = (t: string) => {
    assertThrows(() => ensureValidTid(t), InvalidTidError);
  };

  const filePath =
    new URL("./interop/tid_syntax_invalid.txt", import.meta.url).pathname;
  const fileContent = await Deno.readTextFile(filePath);
  const lines = fileContent.split("\n");

  for (const line of lines) {
    if (line.startsWith("#") || line.length === 0) {
      continue;
    }
    expectInvalid(line);
  }
});
