import { equals } from "@atp/bytes";
import { parseCid } from "@atp/lex/data";
import {
  encodeLexBytes,
  encodeLexLink,
  jsonToLex,
  lexParse,
  lexParseJsonBytes,
  lexStringify,
  lexToJson,
  parseLexBytes,
  parseLexLink,
} from "@atp/lex/json";
import { assert, assertEquals, assertRejects } from "@std/assert";

Deno.test("parses and encodes lex bytes", () => {
  const bytes = new TextEncoder().encode("hello");

  assertEquals(parseLexBytes({ $bytes: "aGVsbG8" }), bytes);
  assertEquals(encodeLexBytes(bytes), { $bytes: "aGVsbG8" });
});

Deno.test("parses and encodes lex links", () => {
  const cid = parseCid(
    "bafyreidfayvfuwqa7qlnopdjiqrxzs6blmoeu4rujcjtnci5beludirz2a",
  );

  assertEquals(
    parseLexLink({ $link: cid.toString() })?.toString(),
    cid.toString(),
  );
  assertEquals(encodeLexLink(cid), { $link: cid.toString() });
});

Deno.test("round trips lex values through json helpers", () => {
  const cid = parseCid(
    "bafyreidfayvfuwqa7qlnopdjiqrxzs6blmoeu4rujcjtnci5beludirz2a",
  );
  const blobCid = parseCid(
    "bafkreig77vqcdozl2wyk6z3cscaj5q5fggi53aoh64fewkdiri3cdauyn4",
  );
  const bytes = new Uint8Array([1, 2, 3]);
  const value = {
    cid,
    bytes,
    blob: {
      $type: "blob" as const,
      ref: blobCid,
      mimeType: "image/png",
      size: 3,
    },
  };

  const json = lexToJson(value);
  const parsed = jsonToLex(json, { strict: true }) as typeof value;

  assertEquals((json as { cid: { $link: string } }).cid.$link, cid.toString());
  assertEquals(parsed.cid.toString(), cid.toString());
  assert(equals(parsed.bytes, bytes));
  assertEquals(parsed.blob.ref.toString(), blobCid.toString());
});

Deno.test("exports lexParse and lexStringify from the root package", () => {
  const cid = parseCid(
    "bafyreidfayvfuwqa7qlnopdjiqrxzs6blmoeu4rujcjtnci5beludirz2a",
  );
  const json = lexStringify({ ref: cid });
  const parsed = lexParse<{ ref: typeof cid }>(json);

  assertEquals(json, `{"ref":{"$link":"${cid.toString()}"}}`);
  assertEquals(parsed.ref.toString(), cid.toString());
});

Deno.test("parses json bytes into lex values", () => {
  const cid = parseCid(
    "bafyreidfayvfuwqa7qlnopdjiqrxzs6blmoeu4rujcjtnci5beludirz2a",
  );
  const input =
    `{"ref":{"$link":"${cid.toString()}"},"bytes":{"$bytes":"AQID"}}`;
  const parsed = lexParseJsonBytes(
    new TextEncoder().encode(input),
  ) as unknown as {
    ref: { toString(): string };
    bytes: Uint8Array;
  };

  assertEquals(parsed.ref.toString(), cid.toString());
  assert(equals(parsed.bytes, new Uint8Array([1, 2, 3])));
});

Deno.test("keeps invalid special objects as plain objects in non-strict mode", () => {
  const parsed = lexParse<{ $link: string }>('{"$link":"not-a-cid"}', {
    strict: false,
  });

  assertEquals(parsed, { $link: "not-a-cid" });
});

Deno.test("rejects invalid special objects in strict mode", async () => {
  await assertRejects(
    async () => {
      await Promise.resolve(
        lexParse('{"$link":"not-a-cid"}', { strict: true }),
      );
    },
    TypeError,
    "Invalid $link object",
  );
});
