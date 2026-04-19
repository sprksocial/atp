import * as ui8 from "@atp/bytes";
import {
  cborBytesToRecord,
  cborDecode,
  cborEncode,
  cidForCbor,
  dataToCborBlock,
  ipldEquals,
  ipldToJson,
  jsonToIpld,
} from "../mod.ts";
import { vectors } from "./interop/ipld-vectors.ts";
import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";

for (const vector of vectors) {
  Deno.test(`passes test vector: ${vector.name}`, async () => {
    const ipld = jsonToIpld(vector.json);
    const json = ipldToJson(ipld);
    const cbor = cborEncode(ipld);
    const ipldAgain = cborDecode(cbor);
    const jsonAgain = ipldToJson(ipldAgain);
    const cid = await cidForCbor(ipld);
    assertEquals(json, vector.json);
    assertEquals(jsonAgain, vector.json);
    assert(ipldEquals(ipld, vector.ipld));
    assert(ipldEquals(ipldAgain, vector.ipld));
    assert(ui8.equals(cbor, vector.cbor));
    assertEquals(cid.toString(), vector.cid);
  });
}

Deno.test("cidForCbor accepts ArrayBuffer inputs", async () => {
  const bytes = ui8.fromString("hello world");
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );

  const fromBytes = await cidForCbor(bytes);
  const fromBuffer = await cidForCbor(arrayBuffer);

  assertEquals(fromBuffer.toString(), fromBytes.toString());
});

Deno.test("cbor helpers reject undefined object members", async () => {
  const input = { a: undefined };

  assertThrows(() => cborEncode(input), Error);
  await assertRejects(() => dataToCborBlock(input), Error);
  await assertRejects(() => cidForCbor(input), Error);
});

Deno.test("cborBytesToRecord accepts bigint-valued maps", () => {
  const input = { big: 9007199254740993n };
  const bytes = cborEncode(input);

  assertEquals(cborDecode(bytes), input);
  assertEquals(cborBytesToRecord(bytes), input);
});
