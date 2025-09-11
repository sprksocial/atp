import { CID } from "npm:multiformats/cid";
import * as ui8 from "npm:uint8arrays";
import { cborDecodeMulti, cborEncode, type CborObject } from "../mod.ts";
import { assert, assertEquals } from "jsr:@std/assert";

Deno.test("decodes concatenated dag-cbor messages", () => {
  const one = {
    a: 123,
    b: CID.parse(
      "bafyreidfayvfuwqa7qlnopdjiqrxzs6blmoeu4rujcjtnci5beludirz2a",
    ),
  };
  const two = {
    c: new Uint8Array([1, 2, 3]),
    d: CID.parse(
      "bafyreidfayvfuwqa7qlnopdjiqrxzs6blmoeu4rujcjtnci5beludirz2a",
    ),
  };
  const encoded = ui8.concat([cborEncode(one), cborEncode(two)]);
  const decoded = cborDecodeMulti(encoded);
  assertEquals(decoded.length, 2);
  assertEquals(decoded[0], one);
  assertEquals(decoded[1], two);
});

Deno.test("parses safe ints as number", () => {
  const one = {
    test: Number.MAX_SAFE_INTEGER,
  };
  const encoded = cborEncode(one);
  const decoded = cborDecodeMulti(encoded);
  const first = decoded[0] as CborObject;
  assert(Number.isInteger(first?.["test"]));
});
