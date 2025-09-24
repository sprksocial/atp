import { equals, fromString } from "@atp/ui8";
import { P256Keypair, Secp256k1Keypair } from "../mod.ts";
import * as did from "../did.ts";
import { assert, assertEquals } from "@std/assert";

Deno.test("secp256k1 derives the correct DID from the privatekey", () => {
  for (const vector of secpTestVectors) {
    const keypair = Secp256k1Keypair.import(vector.seed);
    const did = keypair.did();
    assertEquals(did, vector.id);
  }
});

Deno.test("secp256k1 converts between bytes and did", () => {
  for (const vector of secpTestVectors) {
    const keypair = Secp256k1Keypair.import(vector.seed);
    const didKey = did.formatDidKey("ES256K", keypair.publicKeyBytes());
    assertEquals(didKey, vector.id);
    const { jwtAlg, keyBytes } = did.parseDidKey(didKey);
    assertEquals(jwtAlg, "ES256K");
    assertEquals(
      equals(keyBytes, keypair.publicKeyBytes()),
      true,
    );
  }
});

Deno.test("P-256 derives the correct DID from the JWK", () => {
  for (const vector of p256TestVectors) {
    const bytes = fromString(
      vector.privateKeyBase58,
      "base58btc",
    );
    const keypair = P256Keypair.import(bytes);
    const did = keypair.did();
    assertEquals(did, vector.id);
  }
});

Deno.test("P-256 converts between bytes and did", () => {
  for (const vector of p256TestVectors) {
    const bytes = fromString(
      vector.privateKeyBase58,
      "base58btc",
    );
    const keypair = P256Keypair.import(bytes);
    const didKey = did.formatDidKey("ES256", keypair.publicKeyBytes());
    assertEquals(didKey, vector.id);
    const { jwtAlg, keyBytes } = did.parseDidKey(didKey);
    assertEquals(jwtAlg, "ES256");
    assert(equals(keyBytes, keypair.publicKeyBytes()));
  }
});

// did:key secp256k1 test vectors from W3C
// https://github.com/w3c-ccg/did-method-key/blob/main/test-vectors/secp256k1.json
const secpTestVectors = [
  {
    seed: "9085d2bef69286a6cbb51623c8fa258629945cd55ca705cc4e66700396894e0c",
    id: "did:key:zQ3shokFTS3brHcDQrn82RUDfCZESWL1ZdCEJwekUDPQiYBme",
  },
  {
    seed: "f0f4df55a2b3ff13051ea814a8f24ad00f2e469af73c363ac7e9fb999a9072ed",
    id: "did:key:zQ3shtxV1FrJfhqE1dvxYRcCknWNjHc3c5X1y3ZSoPDi2aur2",
  },
  {
    seed: "6b0b91287ae3348f8c2f2552d766f30e3604867e34adc37ccbb74a8e6b893e02",
    id: "did:key:zQ3shZc2QzApp2oymGvQbzP8eKheVshBHbU4ZYjeXqwSKEn6N",
  },
  {
    seed: "c0a6a7c560d37d7ba81ecee9543721ff48fea3e0fb827d42c1868226540fac15",
    id: "did:key:zQ3shadCps5JLAHcZiuX5YUtWHHL8ysBJqFLWvjZDKAWUBGzy",
  },
  {
    seed: "175a232d440be1e0788f25488a73d9416c04b6f924bea6354bf05dd2f1a75133",
    id: "did:key:zQ3shptjE6JwdkeKN4fcpnYQY3m9Cet3NiHdAfpvSUZBFoKBj",
  },
];

// did:key p-256 test vectors from W3C
// https://github.com/w3c-ccg/did-method-key/blob/main/test-vectors/nist-curves.json
const p256TestVectors = [
  {
    privateKeyBase58: "9p4VRzdmhsnq869vQjVCTrRry7u4TtfRxhvBFJTGU2Cp",
    id: "did:key:zDnaeTiq1PdzvZXUaMdezchcMJQpBdH2VN4pgrrEhMCCbmwSb",
  },
];
