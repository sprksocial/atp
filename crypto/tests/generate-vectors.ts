import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { equals, fromString, toString } from "@atp/bytes";
import { cborEncode } from "@atp/common";
import {
  bytesToMultibase,
  P256_JWT_ALG,
  SECP256K1_JWT_ALG,
  sha256,
} from "../mod.ts";
import { P256Keypair } from "../p256/keypair.ts";
import { Secp256k1Keypair } from "../secp256k1/keypair.ts";
import { p256 as nobleP256 } from "@noble/curves/nist.js";
import { secp256k1 as nobleK256 } from "@noble/curves/secp256k1.js";

type TestVector = {
  comment: string;
  messageBase64: string;
  algorithm: string;
  didDocSuite: string;
  publicKeyDid: string;
  publicKeyMultibase: string;
  signatureBase64: string;
  validSignature: boolean;
  tags: string[];
};

function generateTestVectors(): TestVector[] {
  const p256Key = P256Keypair.create({ exportable: true });
  const secpKey = Secp256k1Keypair.create({ exportable: true });
  const messageBytes = cborEncode({ hello: "world" });
  const messageBase64 = toString(messageBytes, "base64");

  return [
    // Valid signatures
    {
      comment: "valid P-256 key and signature, with low-S signature",
      messageBase64,
      algorithm: P256_JWT_ALG, // "ES256"
      didDocSuite: "EcdsaSecp256r1VerificationKey2019",
      publicKeyDid: p256Key.did(),
      publicKeyMultibase: bytesToMultibase(
        p256Key.publicKeyBytes(),
        "base58btc",
      ),
      signatureBase64: toString(
        p256Key.sign(messageBytes),
        "base64",
      ),
      validSignature: true,
      tags: [],
    },
    {
      comment: "valid K-256 key and signature, with low-S signature",
      messageBase64,
      algorithm: SECP256K1_JWT_ALG, // "ES256K"
      didDocSuite: "EcdsaSecp256k1VerificationKey2019",
      publicKeyDid: secpKey.did(),
      publicKeyMultibase: bytesToMultibase(
        secpKey.publicKeyBytes(),
        "base58btc",
      ),
      signatureBase64: toString(
        secpKey.sign(messageBytes),
        "base64",
      ),
      validSignature: true,
      tags: [],
    },
    // High-S signatures (should be rejected)
    {
      comment: "P-256 key with high-S signature (should be rejected)",
      messageBase64,
      algorithm: P256_JWT_ALG,
      didDocSuite: "EcdsaSecp256r1VerificationKey2019",
      publicKeyDid: p256Key.did(),
      publicKeyMultibase: bytesToMultibase(
        p256Key.publicKeyBytes(),
        "base58btc",
      ),
      signatureBase64: makeHighSSig(
        messageBytes,
        p256Key.export(),
        P256_JWT_ALG,
      ),
      validSignature: false,
      tags: ["high-s"],
    },
    {
      comment: "K-256 key with high-S signature (should be rejected)",
      messageBase64,
      algorithm: SECP256K1_JWT_ALG,
      didDocSuite: "EcdsaSecp256k1VerificationKey2019",
      publicKeyDid: secpKey.did(),
      publicKeyMultibase: bytesToMultibase(
        secpKey.publicKeyBytes(),
        "base58btc",
      ),
      signatureBase64: makeHighSSig(
        messageBytes,
        secpKey.export(),
        SECP256K1_JWT_ALG,
      ),
      validSignature: false,
      tags: ["high-s"],
    },
    // DER-encoded signatures (should be rejected)
    {
      comment: "P-256 key with DER-encoded signature (should be rejected)",
      messageBase64,
      algorithm: P256_JWT_ALG,
      didDocSuite: "EcdsaSecp256r1VerificationKey2019",
      publicKeyDid: p256Key.did(),
      publicKeyMultibase: bytesToMultibase(
        p256Key.publicKeyBytes(),
        "base58btc",
      ),
      signatureBase64: makeDerEncodedSig(
        messageBytes,
        p256Key.export(),
        P256_JWT_ALG,
      ),
      validSignature: false,
      tags: ["der-encoded"],
    },
    {
      comment: "K-256 key with DER-encoded signature (should be rejected)",
      messageBase64,
      algorithm: SECP256K1_JWT_ALG,
      didDocSuite: "EcdsaSecp256k1VerificationKey2019",
      publicKeyDid: secpKey.did(),
      publicKeyMultibase: bytesToMultibase(
        secpKey.publicKeyBytes(),
        "base58btc",
      ),
      signatureBase64: makeDerEncodedSig(
        messageBytes,
        secpKey.export(),
        SECP256K1_JWT_ALG,
      ),
      validSignature: false,
      tags: ["der-encoded"],
    },
  ];
}

function makeHighSSig(
  msgBytes: Uint8Array,
  keyBytes: Uint8Array,
  alg: string,
): string {
  const hash = sha256(msgBytes);

  let sig: string | undefined;
  let attempts = 0;
  const maxAttempts = 1000;

  do {
    attempts++;
    if (attempts > maxAttempts) {
      throw new Error("Failed to generate high-S signature after max attempts");
    }

    if (alg === SECP256K1_JWT_ALG) {
      const attempt = nobleK256.sign(hash, keyBytes, { lowS: false });
      const sigObj = nobleK256.Signature.fromBytes(attempt);
      if (sigObj.hasHighS()) {
        sig = toString(attempt, "base64");
      }
    } else {
      const attempt = nobleP256.sign(hash, keyBytes, { lowS: false });
      const sigObj = nobleP256.Signature.fromBytes(attempt);
      if (sigObj.hasHighS()) {
        sig = toString(attempt, "base64");
      }
    }
  } while (sig === undefined);
  return sig;
}

function makeDerEncodedSig(
  msgBytes: Uint8Array,
  keyBytes: Uint8Array,
  alg: string,
): string {
  const hash = sha256(msgBytes);

  // Generate a regular low-S signature first
  let signature: Uint8Array;
  if (alg === SECP256K1_JWT_ALG) {
    signature = nobleK256.sign(hash, keyBytes, { lowS: true });
  } else {
    signature = nobleP256.sign(hash, keyBytes, { lowS: true });
  }

  // Create a mock DER-encoded signature by wrapping the signature
  // This creates an invalid signature format that should be rejected
  const derHeader = new Uint8Array([0x30, 0x44, 0x02, 0x20]);
  const derMiddle = new Uint8Array([0x02, 0x20]);
  const derLike = new Uint8Array([
    ...derHeader,
    ...signature.slice(0, 32),
    ...derMiddle,
    ...signature.slice(32),
  ]);

  return toString(derLike, "base64");
}

// Generate and save the test vectors
const vectors = generateTestVectors();
const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, "interop", "signature-fixtures.json");

writeFileSync(outputPath, JSON.stringify(vectors, null, 2));

console.log(`Generated ${vectors.length} test vectors`);
console.log(`Saved to: ${outputPath}`);

// Verify that the generated vectors are valid
console.log("\nVerifying generated vectors...");
import * as p256 from "../p256/operations.ts";
import * as secp from "../secp256k1/operations.ts";
import { multibaseToBytes, parseDidKey } from "../mod.ts";
import { compressPubkey as compressP256 } from "../p256/encoding.ts";
import { compressPubkey as compressSecp } from "../secp256k1/encoding.ts";

let validCount = 0;
let invalidCount = 0;

for (const vector of vectors) {
  const messageBytes = fromString(vector.messageBase64, "base64");
  const signatureBytes = fromString(
    vector.signatureBase64,
    "base64",
  );
  const keyBytes = multibaseToBytes(vector.publicKeyMultibase);
  const didKey = parseDidKey(vector.publicKeyDid);

  // Verify key consistency
  let compressedDidKey = didKey.keyBytes;
  if (didKey.keyBytes.length === 65) {
    if (vector.algorithm === P256_JWT_ALG) {
      compressedDidKey = compressP256(didKey.keyBytes);
    } else if (vector.algorithm === SECP256K1_JWT_ALG) {
      compressedDidKey = compressSecp(didKey.keyBytes);
    }
  }

  const keysMatch = equals(keyBytes, compressedDidKey);
  if (!keysMatch) {
    console.log(`❌ Key mismatch for: ${vector.comment}`);
    continue;
  }

  // Verify signature
  let verified = false;
  try {
    if (vector.algorithm === P256_JWT_ALG) {
      verified = p256.verifySig(didKey.keyBytes, messageBytes, signatureBytes);
    } else if (vector.algorithm === SECP256K1_JWT_ALG) {
      verified = secp.verifySig(didKey.keyBytes, messageBytes, signatureBytes);
    }
  } catch {
    verified = false;
  }

  if (verified === vector.validSignature) {
    console.log(`✅ ${vector.comment}`);
    validCount++;
  } else {
    console.log(
      `❌ ${vector.comment} - expected ${vector.validSignature}, got ${verified}`,
    );
    invalidCount++;
  }
}

console.log(
  `\nVerification complete: ${validCount} valid, ${invalidCount} invalid`,
);
