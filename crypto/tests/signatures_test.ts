import fs from "node:fs";
import * as bytes from "@atp/bytes";
import {
  multibaseToBytes,
  P256_JWT_ALG,
  parseDidKey,
  SECP256K1_JWT_ALG,
} from "../mod.ts";
import * as p256 from "../p256/operations.ts";
import * as secp from "../secp256k1/operations.ts";
import { compressPubkey as compressP256 } from "../p256/encoding.ts";
import { compressPubkey as compressSecp } from "../secp256k1/encoding.ts";
import { assert, assertEquals, assertFalse } from "@std/assert";

let vectors: TestVector[];

Deno.test.beforeAll(() => {
  vectors = JSON.parse(
    fs.readFileSync(`${import.meta.dirname}/interop/signature-fixtures.json`)
      .toString(),
  );
});

Deno.test("verifies secp256k1 and P-256 test vectors", () => {
  for (const vector of vectors) {
    const messageBytes = bytes.fromString(
      vector.messageBase64,
      "base64",
    );
    const signatureBytes = bytes.fromString(
      vector.signatureBase64,
      "base64",
    );
    const keyBytes = multibaseToBytes(vector.publicKeyMultibase);
    const didKey = parseDidKey(vector.publicKeyDid);

    // Compress the didKey.keyBytes to match the compressed format from multibase
    let compressedDidKeyBytes: Uint8Array;
    if (vector.algorithm === P256_JWT_ALG) {
      compressedDidKeyBytes = compressP256(didKey.keyBytes);
    } else if (vector.algorithm === SECP256K1_JWT_ALG) {
      compressedDidKeyBytes = compressSecp(didKey.keyBytes);
    } else {
      throw new Error("Unsupported algorithm for key compression");
    }

    assert(bytes.equals(keyBytes, compressedDidKeyBytes));
    if (vector.algorithm === P256_JWT_ALG) {
      const verified = p256.verifySig(
        keyBytes,
        messageBytes,
        signatureBytes,
      );
      assertEquals(verified, vector.validSignature);
    } else if (vector.algorithm === SECP256K1_JWT_ALG) {
      const verified = secp.verifySig(
        keyBytes,
        messageBytes,
        signatureBytes,
      );
      assertEquals(verified, vector.validSignature);
    } else {
      throw new Error("Unsupported test vector");
    }
  }
});

Deno.test("verifies high-s signatures with explicit option", () => {
  const highSVectors = vectors.filter((vec) => vec.tags.includes("high-s"));
  assert(highSVectors.length >= 2);
  for (const vector of highSVectors) {
    const messageBytes = bytes.fromString(
      vector.messageBase64,
      "base64",
    );
    const signatureBytes = bytes.fromString(
      vector.signatureBase64,
      "base64",
    );
    const keyBytes = multibaseToBytes(vector.publicKeyMultibase);
    const didKey = parseDidKey(vector.publicKeyDid);

    // Compress the didKey.keyBytes to match the compressed format from multibase
    let compressedDidKeyBytes: Uint8Array;
    if (vector.algorithm === P256_JWT_ALG) {
      compressedDidKeyBytes = compressP256(didKey.keyBytes);
    } else if (vector.algorithm === SECP256K1_JWT_ALG) {
      compressedDidKeyBytes = compressSecp(didKey.keyBytes);
    } else {
      throw new Error("Unsupported algorithm for key compression");
    }

    assert(bytes.equals(keyBytes, compressedDidKeyBytes));
    if (vector.algorithm === P256_JWT_ALG) {
      const verified = p256.verifySig(
        keyBytes,
        messageBytes,
        signatureBytes,
        { allowMalleableSig: true },
      );
      assert(verified);
      assertFalse(vector.validSignature); // otherwise would fail per low-s requirement
    } else if (vector.algorithm === SECP256K1_JWT_ALG) {
      const verified = secp.verifySig(
        keyBytes,
        messageBytes,
        signatureBytes,
        { allowMalleableSig: true },
      );
      assert(verified);
      assertFalse(vector.validSignature); // otherwise would fail per low-s requirement
    } else {
      throw new Error("Unsupported test vector");
    }
  }
});

Deno.test("verifies der-encoded signatures with explicit option", () => {
  const DERVectors = vectors.filter((vec) => vec.tags.includes("der-encoded"));
  assert(DERVectors.length >= 2);
  for (const vector of DERVectors) {
    const messageBytes = bytes.fromString(
      vector.messageBase64,
      "base64",
    );
    const signatureBytes = bytes.fromString(
      vector.signatureBase64,
      "base64",
    );
    const keyBytes = multibaseToBytes(vector.publicKeyMultibase);
    const didKey = parseDidKey(vector.publicKeyDid);

    // Compress the didKey.keyBytes to match the compressed format from multibase
    let compressedDidKeyBytes: Uint8Array;
    if (vector.algorithm === P256_JWT_ALG) {
      compressedDidKeyBytes = compressP256(didKey.keyBytes);
    } else if (vector.algorithm === SECP256K1_JWT_ALG) {
      compressedDidKeyBytes = compressSecp(didKey.keyBytes);
    } else {
      throw new Error("Unsupported algorithm for key compression");
    }

    assert(bytes.equals(keyBytes, compressedDidKeyBytes));
    if (vector.algorithm === P256_JWT_ALG) {
      const verified = p256.verifySig(
        keyBytes,
        messageBytes,
        signatureBytes,
        { allowMalleableSig: true },
      );
      assert(verified);
      assertFalse(vector.validSignature); // otherwise would fail per low-s requirement
    } else if (vector.algorithm === SECP256K1_JWT_ALG) {
      const verified = secp.verifySig(
        keyBytes,
        messageBytes,
        signatureBytes,
        { allowMalleableSig: true },
      );
      assert(verified);
      assertFalse(vector.validSignature);
    } else {
      throw new Error("Unsupported test vector");
    }
  }
});

type TestVector = {
  algorithm: string;
  publicKeyDid: string;
  publicKeyMultibase: string;
  messageBase64: string;
  signatureBase64: string;
  validSignature: boolean;
  tags: string[];
};
