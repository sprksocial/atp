import { assertEquals } from "@std/assert";
import * as did from "../did.ts";
import * as p256Encoding from "../p256/encoding.ts";
import { P256Keypair } from "../p256/keypair.ts";
import * as secpEncoding from "../secp256k1/encoding.ts";
import { Secp256k1Keypair } from "../secp256k1/keypair.ts";

let secpKeyBytes: Uint8Array;
let secpCompressed: Uint8Array;

Deno.test("secp256k1 compresses a key to the correct length", () => {
  const keypair = Secp256k1Keypair.create();
  const parsed = did.parseDidKey(keypair.did());
  secpKeyBytes = parsed.keyBytes;
  secpCompressed = secpEncoding.compressPubkey(secpKeyBytes);
  assertEquals(secpCompressed.length, 33);
});

Deno.test("secp256k1 decompresses a key to the original", () => {
  const decompressed = secpEncoding.decompressPubkey(secpCompressed);
  assertEquals(decompressed.length, 65);
  assertEquals(decompressed, secpKeyBytes);
});

Deno.test("works consistently", () => {
  const pubkeys: Uint8Array[] = [];
  for (let i = 0; i < 100; i++) {
    const key = Secp256k1Keypair.create();
    const parsed = did.parseDidKey(key.did());
    pubkeys.push(parsed.keyBytes);
  }
  const compressed = pubkeys.map(secpEncoding.compressPubkey);
  const decompressed = compressed.map(secpEncoding.decompressPubkey);
  assertEquals(pubkeys, decompressed);
});

let p256KeyBytes: Uint8Array;
let p256Compressed: Uint8Array;

Deno.test("P-256 compresses a key to the correct length", () => {
  const keypair = P256Keypair.create();
  const parsed = did.parseDidKey(keypair.did());
  p256KeyBytes = parsed.keyBytes;
  p256Compressed = p256Encoding.compressPubkey(p256KeyBytes);
  assertEquals(p256Compressed.length, 33);
});

Deno.test("decompresses a key to the original", () => {
  const decompressed = p256Encoding.decompressPubkey(p256Compressed);
  assertEquals(decompressed.length, 65);
  assertEquals(decompressed, p256KeyBytes);
});

Deno.test("works consistently", () => {
  const pubkeys: Uint8Array[] = [];
  for (let i = 0; i < 100; i++) {
    const key = P256Keypair.create();
    const parsed = did.parseDidKey(key.did());
    pubkeys.push(parsed.keyBytes);
  }
  const compressed = pubkeys.map(p256Encoding.compressPubkey);
  const decompressed = compressed.map(p256Encoding.decompressPubkey);
  assertEquals(pubkeys, decompressed);
});
