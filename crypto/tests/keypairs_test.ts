import { assert, assertEquals } from "@std/assert";
import { randomBytes } from "../mod.ts";
import { P256Keypair } from "../p256/keypair.ts";
import * as p256 from "../p256/operations.ts";
import { Secp256k1Keypair } from "../secp256k1/keypair.ts";
import * as secp from "../secp256k1/operations.ts";

let secpKeypair: Secp256k1Keypair;
let secpImported: Secp256k1Keypair;

Deno.test("secp256k1 has the same DID on import", () => {
  secpKeypair = Secp256k1Keypair.create({ exportable: true });
  const exported = secpKeypair.export();
  secpImported = Secp256k1Keypair.import(exported, { exportable: true });

  assertEquals(secpKeypair.did(), secpImported.did());
});

Deno.test("secp256k1 produces valid signature", () => {
  const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const sig = secpImported.sign(data);

  const validSig = secp.verifyDidSig(secpKeypair.did(), data, sig);

  assert(validSig);
});

Deno.test("secp256k1 produces valid sig on typed array of large arraybuffer", () => {
  const bytes = randomBytes(8192);
  const arrBuf = bytes.buffer;
  const sliceView = new Uint8Array(arrBuf, 1024, 1024);
  assertEquals(sliceView.buffer.byteLength, 8192);
  const sig = secpImported.sign(sliceView);
  const validSig = secp.verifyDidSig(secpKeypair.did(), sliceView, sig);
  assert(validSig);
});

let p256Keypair: P256Keypair;
let p256Imported: P256Keypair;

Deno.test("P-256 has the same DID on import", () => {
  p256Keypair = P256Keypair.create({ exportable: true });
  const exported = p256Keypair.export();
  p256Imported = P256Keypair.import(exported, { exportable: true });

  assertEquals(p256Keypair.did(), p256Imported.did());
});

Deno.test("P-256 produces a valid signature", () => {
  const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const sig = p256Imported.sign(data);

  const validSig = p256.verifyDidSig(p256Keypair.did(), data, sig);

  assert(validSig);
});

Deno.test("P-256 produces valid sig on typed array of large arraybuffer", () => {
  const bytes = randomBytes(8192);
  const arrBuf = bytes.buffer;
  const sliceView = new Uint8Array(arrBuf, 1024, 1024);
  assertEquals(sliceView.buffer.byteLength, 8192);
  const sig = p256Imported.sign(sliceView);
  const validSig = p256.verifyDidSig(p256Keypair.did(), sliceView, sig);
  assert(validSig);
});
