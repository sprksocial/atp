import { CID } from "multiformats/cid";
import * as ui8 from "@atp/bytes";
import { dataToCborBlock, streamToBytes, wait } from "@atp/common";
import { type CarBlock, readCarStream, writeCarStream } from "../mod.ts";
import fixtures from "./car-file-fixtures.json" with { type: "json" };
import { assertEquals, assertRejects } from "@std/assert";

for (const fixture of fixtures) {
  Deno.test("correctly writes car files", async () => {
    const root = CID.parse(fixture.root);
    async function* blockIter() {
      for (const block of fixture.blocks) {
        const cid = CID.parse(block.cid);
        const bytes = ui8.fromString(block.bytes, "base64");
        yield { cid, bytes };
      }
    }
    const carStream = writeCarStream(root, blockIter());
    const car = await streamToBytes(carStream);
    const carB64 = ui8.toString(car, "base64");
    assertEquals(carB64, fixture.car);
  });

  Deno.test("correctly reads carfiles", async () => {
    const carStream = [ui8.fromString(fixture.car, "base64")];
    const { roots, blocks } = await readCarStream(carStream);
    assertEquals(roots.length, 1);
    assertEquals(roots[0].toString(), fixture.root);
    const carBlocks: CarBlock[] = [];
    for await (const block of blocks) {
      carBlocks.push(block);
    }
    assertEquals(carBlocks.length, fixture.blocks.length);
    for (let i = 0; i < carBlocks.length; i++) {
      assertEquals(carBlocks[i].cid.toString(), fixture.blocks[i].cid);
      assertEquals(
        ui8.toString(carBlocks[i].bytes, "base64"),
        fixture.blocks[i].bytes,
      );
    }
  });
}

Deno.test("writeCar propagates errors", async () => {
  const iterate = async () => {
    async function* blockIterator() {
      await wait(0);
      const block = await dataToCborBlock({ test: 1 });
      yield block;
      throw new Error("Oops!");
    }
    const iter = writeCarStream(null, blockIterator());
    for await (const _bytes of iter) {
      // no-op
    }
  };
  await assertRejects(() => iterate(), "Oops!");
});

Deno.test("verifies CIDs", async () => {
  const block0 = await dataToCborBlock({ block: 0 });
  const block1 = await dataToCborBlock({ block: 1 });
  const block2 = await dataToCborBlock({ block: 2 });
  const block3 = await dataToCborBlock({ block: 3 });
  const badBlock = await dataToCborBlock({ block: "bad" });
  const blockIter = async function* () {
    yield block0;
    yield block1;
    yield block2;
    yield { cid: block3.cid, bytes: badBlock.bytes };
  };
  const flush = async function (iter: AsyncIterable<unknown>) {
    for await (const _ of iter) {
      // no-op
    }
  };
  const badCar = await readCarStream(writeCarStream(block0.cid, blockIter()));
  await assertRejects(() => flush(badCar.blocks), "Not a valid CID for bytes");
});

Deno.test("skips CID verification", async () => {
  const block0 = await dataToCborBlock({ block: 0 });
  const block1 = await dataToCborBlock({ block: 1 });
  const block2 = await dataToCborBlock({ block: 2 });
  const block3 = await dataToCborBlock({ block: 3 });
  const badBlock = await dataToCborBlock({ block: "bad" });
  const blockIter = async function* () {
    yield block0;
    yield block1;
    yield block2;
    yield { cid: block3.cid, bytes: badBlock.bytes };
  };
  const flush = async function (iter: AsyncIterable<unknown>) {
    for await (const _ of iter) {
      // no-op
    }
  };
  const badCar = await readCarStream(
    writeCarStream(block0.cid, blockIter()),
    { skipCidVerification: true },
  );
  assertEquals(await flush(badCar.blocks), undefined);
});
