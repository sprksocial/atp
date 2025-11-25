import { assert, assertEquals, assertFalse } from "@std/assert";
import { isBlobRef, isLegacyBlobRef } from "../blob.ts";
import { CID } from "../cid.ts";

// await cidForRawBytes(Buffer.from('Hello, World!'))
const blobCid = CID.parse(
  "bafkreig77vqcdozl2wyk6z3cscaj5q5fggi53aoh64fewkdiri3cdauyn4",
);
// await cidForLex(Buffer.from('Hello, World!'))
const lexCid = CID.parse(
  "bafyreic52vzks7wdklat4evp3vimohl55i2unzqpshz2ytka5omzr7exdy",
);

Deno.test("isBlobRef tests valid blobCid and lexCid", () => {
  assertEquals(blobCid.code, 0x55); // raw
  assertEquals(blobCid.multihash.code, 0x12); // sha2-256
  assertEquals(lexCid.code, 0x71); // dag-cbor
  assertEquals(lexCid.multihash.code, 0x12); // sha2-256
});

Deno.test("isBlobRef parses valid blob", () => {
  assert(
    isBlobRef({
      $type: "blob",
      ref: blobCid,
      mimeType: "image/jpeg",
      size: 10000,
    }),
  );

  assert(
    isBlobRef(
      {
        $type: "blob",
        ref: lexCid,
        mimeType: "image/jpeg",
        size: 10000,
      },
      // In non-strict mode, any CID should be accepted
      { strict: false },
    ),
  );
});

Deno.test("isBlobRef rejects invalid inputs", () => {
  assertFalse(
    isBlobRef({
      $type: "blob",
      ref: { $link: blobCid.toString() },
      mimeType: "image/jpeg",
      size: "10000",
    }),
  );
  assertFalse(
    isBlobRef(
      {
        $type: "blob",
        ref: { $link: blobCid.toString() },
        mimeType: "image/jpeg",
        size: "10000",
      },
      { strict: true },
    ),
  );

  assertFalse(
    isBlobRef({
      $type: "blob",
      mimeType: "image/jpeg",
      size: 10000,
    }),
  );

  assertFalse(
    isBlobRef(
      {
        $type: "blob",
        mimeType: "image/jpeg",
        size: 10000,
      },
      { strict: true },
    ),
  );
});

Deno.test("isBlobRef rejects invalid CID/multihash code", () => {
  assert(
    isBlobRef(
      {
        $type: "blob",
        ref: blobCid,
        mimeType: "image/jpeg",
        size: 10000,
      },
      { strict: true },
    ),
  );

  assertFalse(
    isBlobRef(
      {
        $type: "blob",
        ref: lexCid,
        mimeType: "image/jpeg",
        size: 10000,
      },
      { strict: true },
    ),
  );
});

Deno.test("isBlobRef rejects extra keys", () => {
  assertFalse(
    isBlobRef({
      $type: "blob",
      ref: blobCid,
      mimeType: "image/jpeg",
      size: 10000,
      extra: "not allowed",
    }),
  );

  assertFalse(
    isBlobRef(
      {
        $type: "blob",
        ref: blobCid,
        mimeType: "image/jpeg",
        size: 10000,
        extra: "not allowed",
      },
      { strict: true },
    ),
  );
});

Deno.test("isLegacyBlobRef parses valid legacy blob", () => {
  assert(
    isLegacyBlobRef({
      cid: blobCid.toString(),
      mimeType: "image/jpeg",
    }),
  );

  assert(
    isLegacyBlobRef({
      cid: lexCid.toString(),
      mimeType: "image/jpeg",
    }),
  );
});

Deno.test("isLegacyBlobRef rejects invalid inputs", () => {
  assertFalse(
    isLegacyBlobRef({
      cid: "babbaaa",
      mimeType: "image/jpeg",
    }),
  );

  assertFalse(
    isLegacyBlobRef({
      cid: 12345,
      mimeType: "image/jpeg",
    }),
  );

  assertFalse(
    isLegacyBlobRef({
      mimeType: "image/jpeg",
    }),
  );
});

Deno.test("isLegacyBlobRef rejects extra keys", () => {
  assertFalse(
    isLegacyBlobRef({
      cid: blobCid.toString(),
      mimeType: "image/jpeg",
      extra: "not allowed",
    }),
  );
});
