import { assertEquals, assertThrows } from "jsr:@std/assert";
import {
  ensureValidDatetime,
  InvalidDatetimeError,
  isValidDatetime,
  normalizeDatetime,
  normalizeDatetimeAlways,
} from "../mod.ts";

Deno.test("conforms to interop valid datetimes", async () => {
  const expectValid = (h: string) => {
    ensureValidDatetime(h);
    normalizeDatetime(h);
    normalizeDatetimeAlways(h);
  };

  const filePath =
    new URL("./interop/datetime_syntax_valid.txt", import.meta.url).pathname;
  const fileContent = await Deno.readTextFile(filePath);
  const lines = fileContent.split("\n");

  for (const line of lines) {
    if (line.startsWith("#") || line.length === 0) {
      continue;
    }
    if (!isValidDatetime(line)) {
      console.log(line);
    }
    expectValid(line);
  }
});

Deno.test("conforms to interop invalid datetimes", async () => {
  const expectInvalid = (h: string) => {
    assertThrows(() => ensureValidDatetime(h), InvalidDatetimeError);
  };

  const filePath =
    new URL("./interop/datetime_syntax_invalid.txt", import.meta.url).pathname;
  const fileContent = await Deno.readTextFile(filePath);
  const lines = fileContent.split("\n");

  for (const line of lines) {
    if (line.startsWith("#") || line.length === 0) {
      continue;
    }
    expectInvalid(line);
  }
});

Deno.test("conforms to interop invalid parse (semantics) datetimes", async () => {
  const expectInvalid = (h: string) => {
    assertThrows(() => ensureValidDatetime(h), InvalidDatetimeError);
  };

  const filePath =
    new URL("./interop/datetime_parse_invalid.txt", import.meta.url).pathname;
  const fileContent = await Deno.readTextFile(filePath);
  const lines = fileContent.split("\n");

  for (const line of lines) {
    if (line.startsWith("#") || line.length === 0) {
      continue;
    }
    expectInvalid(line);
  }
});

Deno.test("normalization - normalizes datetimes", () => {
  assertEquals(
    normalizeDatetime("1234-04-12T23:20:50Z"),
    "1234-04-12T23:20:50.000Z",
  );
  assertEquals(
    normalizeDatetime("1985-04-12T23:20:50Z"),
    "1985-04-12T23:20:50.000Z",
  );
  assertEquals(
    normalizeDatetime("1985-04-12T23:20:50.123"),
    "1985-04-12T23:20:50.123Z",
  );
  assertEquals(
    normalizeDatetime("1985-04-12 23:20:50.123"),
    "1985-04-12T23:20:50.123Z",
  );
  assertEquals(
    normalizeDatetime("1985-04-12T10:20:50.1+01:00"),
    "1985-04-12T09:20:50.100Z",
  );
  assertEquals(
    normalizeDatetime("Fri, 02 Jan 1999 12:34:56 GMT"),
    "1999-01-02T12:34:56.000Z",
  );
});

Deno.test("normalization - throws on invalid normalized datetimes", () => {
  assertThrows(() => normalizeDatetime(""), InvalidDatetimeError);
  assertThrows(() => normalizeDatetime("blah"), InvalidDatetimeError);
  assertThrows(
    () => normalizeDatetime("1999-19-39T23:20:50.123Z"),
    InvalidDatetimeError,
  );
  assertThrows(
    () => normalizeDatetime("-000001-12-31T23:00:00.000Z"),
    InvalidDatetimeError,
  );
  assertThrows(
    () => normalizeDatetime("0000-01-01T00:00:00+01:00"),
    InvalidDatetimeError,
  );
  assertThrows(
    () => normalizeDatetime("0001-01-01T00:00:00+01:00"),
    InvalidDatetimeError,
  );
});

Deno.test("normalization - normalizes datetimes always", () => {
  assertEquals(
    normalizeDatetimeAlways("1985-04-12T23:20:50Z"),
    "1985-04-12T23:20:50.000Z",
  );
  assertEquals(
    normalizeDatetimeAlways("blah"),
    "1970-01-01T00:00:00.000Z",
  );
  assertEquals(
    normalizeDatetimeAlways("0000-01-01T00:00:00+01:00"),
    "1970-01-01T00:00:00.000Z",
  );
});
