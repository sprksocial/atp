import * as ui8 from "npm:uint8arrays";
import {
  cborDecode,
  cborEncode,
  cidForCbor,
  ipldEquals,
  ipldToJson,
  jsonToIpld,
} from "../mod.ts";
import { vectors } from "./interop/ipld-vectors.ts";
import { assert, assertEquals } from "jsr:@std/assert";

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
