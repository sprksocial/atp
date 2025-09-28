import { CID } from "multiformats";
import { assertEquals, assertRejects } from "@std/assert";
import {
  type DataAdd,
  type DataDelete,
  DataDiff,
  type DataUpdate,
} from "../data-diff.ts";
import { MST } from "../mst/index.ts";
import { countPrefixLen, InvalidMstKeyError } from "../mst/util.ts";
import { MemoryBlockstore } from "../storage/index.ts";
import * as util from "./_util.ts";

let blockstore: MemoryBlockstore;
let mst: MST;
let mapping: Record<string, CID>;
let shuffled: [string, CID][];

// Setup for main MST tests
Deno.test("MST setup", async () => {
  blockstore = new MemoryBlockstore();
  mst = await MST.create(blockstore);
  mapping = await util.generateBulkDataKeys(1000, blockstore);
  shuffled = util.shuffle(Object.entries(mapping));
});

Deno.test("MST adds records", async () => {
  for (const entry of shuffled) {
    mst = await mst.add(entry[0], entry[1]);
  }
  for (const entry of shuffled) {
    const got = await mst.get(entry[0]);
    assertEquals(entry[1].equals(got), true);
  }

  const totalSize = await mst.leafCount();
  assertEquals(totalSize, 1000);
});

Deno.test("MST edits records", async () => {
  let editedMst = mst;
  const toEdit = shuffled.slice(0, 100);

  const edited: [string, CID][] = [];
  for (const entry of toEdit) {
    const newCid = await util.randomCid();
    editedMst = await editedMst.update(entry[0], newCid);
    edited.push([entry[0], newCid]);
  }

  for (const entry of edited) {
    const got = await editedMst.get(entry[0]);
    assertEquals(entry[1].equals(got), true);
  }

  const totalSize = await editedMst.leafCount();
  assertEquals(totalSize, 1000);
});

Deno.test("MST deletes records", async () => {
  let deletedMst = mst;
  const toDelete = shuffled.slice(0, 100);
  const theRest = shuffled.slice(100);
  for (const entry of toDelete) {
    deletedMst = await deletedMst.delete(entry[0]);
  }

  const totalSize = await deletedMst.leafCount();
  assertEquals(totalSize, 900);

  for (const entry of toDelete) {
    const got = await deletedMst.get(entry[0]);
    assertEquals(got, null);
  }
  for (const entry of theRest) {
    const got = await deletedMst.get(entry[0]);
    assertEquals(entry[1].equals(got), true);
  }
});

Deno.test("MST is order independent", async () => {
  const allNodes = await mst.allNodes();

  let recreated = await MST.create(blockstore);
  const reshuffled = util.shuffle(Object.entries(mapping));
  for (const entry of reshuffled) {
    recreated = await recreated.add(entry[0], entry[1]);
  }
  const allReshuffled = await recreated.allNodes();

  assertEquals(allNodes.length, allReshuffled.length);
  for (let i = 0; i < allNodes.length; i++) {
    assertEquals(await allNodes[i].equals(allReshuffled[i]), true);
  }
});

Deno.test("MST saves and loads from blockstore", async () => {
  const root = await util.saveMst(blockstore, mst);
  const loaded = MST.load(blockstore, root);
  const origNodes = await mst.allNodes();
  const loadedNodes = await loaded.allNodes();
  assertEquals(origNodes.length, loadedNodes.length);
  for (let i = 0; i < origNodes.length; i++) {
    assertEquals(await origNodes[i].equals(loadedNodes[i]), true);
  }
});

Deno.test("MST diffs", async () => {
  let toDiff = mst;

  const toAdd = Object.entries(
    await util.generateBulkDataKeys(100, blockstore),
  );
  const toEdit = shuffled.slice(500, 600);
  const toDel = shuffled.slice(400, 500);

  const expectedAdds: Record<string, DataAdd> = {};
  const expectedUpdates: Record<string, DataUpdate> = {};
  const expectedDels: Record<string, DataDelete> = {};

  for (const entry of toAdd) {
    toDiff = await toDiff.add(entry[0], entry[1]);
    expectedAdds[entry[0]] = { key: entry[0], cid: entry[1] };
  }
  for (const entry of toEdit) {
    const updated = await util.randomCid();
    toDiff = await toDiff.update(entry[0], updated);
    expectedUpdates[entry[0]] = {
      key: entry[0],
      prev: entry[1],
      cid: updated,
    };
  }
  for (const entry of toDel) {
    toDiff = await toDiff.delete(entry[0]);
    expectedDels[entry[0]] = { key: entry[0], cid: entry[1] };
  }

  const diff = await DataDiff.of(toDiff, mst);

  assertEquals(diff.addList().length, 100);
  assertEquals(diff.updateList().length, 100);
  assertEquals(diff.deleteList().length, 100);

  assertEquals(diff.adds, expectedAdds);
  assertEquals(diff.updates, expectedUpdates);
  assertEquals(diff.deletes, expectedDels);

  // ensure we correctly report all added CIDs
  for await (const entry of toDiff.walk()) {
    let cid: CID;
    if (entry.isTree()) {
      cid = await entry.getPointer();
    } else {
      cid = entry.value;
    }
    const found = (blockstore.has(cid)) ||
      diff.newMstBlocks.has(cid) ||
      diff.newLeafCids.has(cid);
    assertEquals(found, true);
  }
});

Deno.test("utils counts prefix length", () => {
  assertEquals(countPrefixLen("abc", "abc"), 3);
  assertEquals(countPrefixLen("", "abc"), 0);
  assertEquals(countPrefixLen("abc", ""), 0);
  assertEquals(countPrefixLen("ab", "abc"), 2);
  assertEquals(countPrefixLen("abc", "ab"), 2);
  assertEquals(countPrefixLen("abcde", "abc"), 3);
  assertEquals(countPrefixLen("abc", "abcde"), 3);
  assertEquals(countPrefixLen("abcde", "abc1"), 3);
  assertEquals(countPrefixLen("abcde", "abb"), 2);
  assertEquals(countPrefixLen("abcde", "qbb"), 0);
  assertEquals(countPrefixLen("", "asdf"), 0);
  assertEquals(countPrefixLen("abc", "abc\x00"), 3);
  assertEquals(countPrefixLen("abc\x00", "abc"), 3);
});

// MST Interop Allowable Keys tests
Deno.test("MST Allowable Keys rejects the empty key", async () => {
  const blockstore = new MemoryBlockstore();
  const mst = await MST.create(blockstore);
  const cid1 = CID.parse(
    "bafyreie5cvv4h45feadgeuwhbcutmh6t2ceseocckahdoe6uat64zmz454",
  );

  await assertRejects(
    async () => await mst.add("", cid1),
    InvalidMstKeyError,
  );
});

Deno.test("MST Allowable Keys rejects a key with no collection", async () => {
  const blockstore = new MemoryBlockstore();
  const mst = await MST.create(blockstore);
  const cid1 = CID.parse(
    "bafyreie5cvv4h45feadgeuwhbcutmh6t2ceseocckahdoe6uat64zmz454",
  );

  await assertRejects(
    async () => await mst.add("asdf", cid1),
    InvalidMstKeyError,
  );
});

Deno.test("MST Allowable Keys rejects a key with a nested collection", async () => {
  const blockstore = new MemoryBlockstore();
  const mst = await MST.create(blockstore);
  const cid1 = CID.parse(
    "bafyreie5cvv4h45feadgeuwhbcutmh6t2ceseocckahdoe6uat64zmz454",
  );

  await assertRejects(
    async () => await mst.add("nested/collection/asdf", cid1),
    InvalidMstKeyError,
  );
});

Deno.test("MST Allowable Keys rejects on empty coll or rkey", async () => {
  const blockstore = new MemoryBlockstore();
  const mst = await MST.create(blockstore);
  const cid1 = CID.parse(
    "bafyreie5cvv4h45feadgeuwhbcutmh6t2ceseocckahdoe6uat64zmz454",
  );

  await assertRejects(
    async () => await mst.add("coll/", cid1),
    InvalidMstKeyError,
  );
  await assertRejects(
    async () => await mst.add("/rkey", cid1),
    InvalidMstKeyError,
  );
});

Deno.test("MST Allowable Keys rejects non-ascii chars", async () => {
  const blockstore = new MemoryBlockstore();
  const mst = await MST.create(blockstore);
  const cid1 = CID.parse(
    "bafyreie5cvv4h45feadgeuwhbcutmh6t2ceseocckahdoe6uat64zmz454",
  );

  await assertRejects(
    async () => await mst.add("coll/jalapeñoA", cid1),
    InvalidMstKeyError,
  );
  await assertRejects(
    async () => await mst.add("coll/coöperative", cid1),
    InvalidMstKeyError,
  );
  await assertRejects(
    async () => await mst.add("coll/abc💩", cid1),
    InvalidMstKeyError,
  );
});

Deno.test("MST Allowable Keys rejects ascii that we dont support", async () => {
  const blockstore = new MemoryBlockstore();
  const mst = await MST.create(blockstore);
  const cid1 = CID.parse(
    "bafyreie5cvv4h45feadgeuwhbcutmh6t2ceseocckahdoe6uat64zmz454",
  );

  const unsupportedKeys = [
    "coll/key$",
    "coll/key%",
    "coll/key(",
    "coll/key)",
    "coll/key+",
    "coll/key=",
    "coll/@handle",
    "coll/any space",
    "coll/#extra",
    "coll/any+space",
    "coll/number[3]",
    "coll/number(3)",
    "coll/dHJ1ZQ==",
    'coll/"quote"',
  ];

  for (const key of unsupportedKeys) {
    await assertRejects(
      async () => await mst.add(key, cid1),
      InvalidMstKeyError,
    );
  }
});

Deno.test("MST Allowable Keys rejects keys over 1024 chars", async () => {
  const blockstore = new MemoryBlockstore();
  const mst = await MST.create(blockstore);
  const cid1 = CID.parse(
    "bafyreie5cvv4h45feadgeuwhbcutmh6t2ceseocckahdoe6uat64zmz454",
  );

  const longKey =
    "coll/asdofiupoiwqeurfpaosidfuapsodirupasoirupasoeiruaspeoriuaspeoriu2p3o4iu1pqw3oiuaspdfoiuaspdfoiuasdfpoiasdufpwoieruapsdofiuaspdfoiuasdpfoiausdfpoasidfupasodifuaspdofiuasdpfoiasudfpoasidfuapsodfiuasdpfoiausdfpoasidufpasodifuapsdofiuasdpofiuasdfpoaisdufpaoasdofiupoiwqeurfpaosidfuapsodirupasoirupasoeiruaspeoriuaspeoriu2p3o4iu1pqw3oiuaspdfoiuaspdfoiuasdfpoiasdufpwoieruapsdofiuaspdfoiuasdpfoiausdfpoasidfupasodifuaspdofiuasdpfoiasudfpoasidfuapsodfiuasdpfoiausdfpoasidufpasodifuapsdofiuasdpofiuasdfpoaisdufpaoasdofiupoiwqeurfpaosidfuapsodirupasoirupasoeiruaspeoriuaspeoriu2p3o4iu1pqw3oiuaspdfoiuaspdfoiuasdfpoiasdufpwoieruapsdofiuaspdfoiuasdpfoiausdfpoasidfupasodifuaspdofiuasdpfoiasudfpoasidfuapsodfiuasdpfoiausdfpoasidufpasodifuapsdofiuasdpofiuasdfpoaisdufpaoasdofiupoiwqeurfpaosidfuapsodirupasoirupasoeiruaspeoriuaspeoriu2p3o4iu1pqw3oiuaspdfoiuaspdfoiuasdfpoiasdufpwoieruapsdofiuaspdfoiuasdpfoiausdfpoasidfupasodifuaspdofiuasdpfoiasudfpoasidfuapsodfiuasdpfoiausdfpoasidufpasodifuapsdofiuasdpofiuasdfpoaisdufpaoasdofiupoiwqeurfpaosidfuapsodirupasoirupasoeiruaspeoriuaspeoriu2p3o4iu1pqw3oiuaspdfoiuaspdfoiuasdfpoiasdufpwoieruapsdofiuaspdfoiuasdpfoiausdfpoasidfupasodifuaspdofiuasdpfoiasudfpoasidfuapsodfiuasdpfoiausdfpoasidufpasodifuapsdofiuasdpofiuasdfpoaisdufpao";

  await assertRejects(
    async () => await mst.add(longKey, cid1),
    InvalidMstKeyError,
  );
});

Deno.test("MST Allowable Keys allows valid keys", async () => {
  const blockstore = new MemoryBlockstore();
  let mst = await MST.create(blockstore);
  const cid1 = CID.parse(
    "bafyreie5cvv4h45feadgeuwhbcutmh6t2ceseocckahdoe6uat64zmz454",
  );

  const validKeys = [
    "coll/3jui7kd54zh2y",
    "coll/self",
    "coll/example.com",
    "com.example/rkey",
    "coll/~1.2-3_",
    "coll/dHJ1ZQ",
    "coll/pre:fix",
    "coll/_",
  ];

  for (const key of validKeys) {
    mst = await mst.add(key, cid1);
  }
});

// MST Interop Known Maps tests
Deno.test('MST Known Maps computes "empty" tree root CID', async () => {
  const blockstore = new MemoryBlockstore();
  const mst = await MST.create(blockstore);

  assertEquals(await mst.leafCount(), 0);
  assertEquals(
    (await mst.getPointer()).toString(),
    "bafyreie5737gdxlw5i64vzichcalba3z2v5n6icifvx5xytvske7mr3hpm",
  );
});

Deno.test('MST Known Maps computes "trivial" tree root CID', async () => {
  const blockstore = new MemoryBlockstore();
  let mst = await MST.create(blockstore);
  const cid1 = CID.parse(
    "bafyreie5cvv4h45feadgeuwhbcutmh6t2ceseocckahdoe6uat64zmz454",
  );

  mst = await mst.add("com.example.record/3jqfcqzm3fo2j", cid1);
  assertEquals(await mst.leafCount(), 1);
  assertEquals(
    (await mst.getPointer()).toString(),
    "bafyreibj4lsc3aqnrvphp5xmrnfoorvru4wynt6lwidqbm2623a6tatzdu",
  );
});

Deno.test('MST Known Maps computes "singlelayer2" tree root CID', async () => {
  const blockstore = new MemoryBlockstore();
  let mst = await MST.create(blockstore);
  const cid1 = CID.parse(
    "bafyreie5cvv4h45feadgeuwhbcutmh6t2ceseocckahdoe6uat64zmz454",
  );

  mst = await mst.add("com.example.record/3jqfcqzm3fx2j", cid1);
  assertEquals(await mst.leafCount(), 1);
  assertEquals(mst.layer, 2);
  assertEquals(
    (await mst.getPointer()).toString(),
    "bafyreih7wfei65pxzhauoibu3ls7jgmkju4bspy4t2ha2qdjnzqvoy33ai",
  );
});

Deno.test('MST Known Maps computes "simple" tree root CID', async () => {
  const blockstore = new MemoryBlockstore();
  let mst = await MST.create(blockstore);
  const cid1 = CID.parse(
    "bafyreie5cvv4h45feadgeuwhbcutmh6t2ceseocckahdoe6uat64zmz454",
  );

  mst = await mst.add("com.example.record/3jqfcqzm3fp2j", cid1); // level 0
  mst = await mst.add("com.example.record/3jqfcqzm3fr2j", cid1); // level 0
  mst = await mst.add("com.example.record/3jqfcqzm3fs2j", cid1); // level 1
  mst = await mst.add("com.example.record/3jqfcqzm3ft2j", cid1); // level 0
  mst = await mst.add("com.example.record/3jqfcqzm4fc2j", cid1); // level 0
  assertEquals(await mst.leafCount(), 5);
  assertEquals(
    (await mst.getPointer()).toString(),
    "bafyreicmahysq4n6wfuxo522m6dpiy7z7qzym3dzs756t5n7nfdgccwq7m",
  );
});

// MST Interop Edge Cases tests
Deno.test("MST Edge Cases trims top of tree on delete", async () => {
  const blockstore = new MemoryBlockstore();
  let mst = await MST.create(blockstore);
  const cid1 = CID.parse(
    "bafyreie5cvv4h45feadgeuwhbcutmh6t2ceseocckahdoe6uat64zmz454",
  );

  const l1root = "bafyreifnqrwbk6ffmyaz5qtujqrzf5qmxf7cbxvgzktl4e3gabuxbtatv4";
  const l0root = "bafyreie4kjuxbwkhzg2i5dljaswcroeih4dgiqq6pazcmunwt2byd725vi";

  mst = await mst.add("com.example.record/3jqfcqzm3fn2j", cid1); // level 0
  mst = await mst.add("com.example.record/3jqfcqzm3fo2j", cid1); // level 0
  mst = await mst.add("com.example.record/3jqfcqzm3fp2j", cid1); // level 0
  mst = await mst.add("com.example.record/3jqfcqzm3fs2j", cid1); // level 1
  mst = await mst.add("com.example.record/3jqfcqzm3ft2j", cid1); // level 0
  mst = await mst.add("com.example.record/3jqfcqzm3fu2j", cid1); // level 0

  assertEquals(await mst.leafCount(), 6);
  assertEquals(mst.layer, 1);
  assertEquals((await mst.getPointer()).toString(), l1root);

  mst = await mst.delete("com.example.record/3jqfcqzm3fs2j"); // level 1
  assertEquals(await mst.leafCount(), 5);
  assertEquals(mst.layer, 0);
  assertEquals((await mst.getPointer()).toString(), l0root);
});

Deno.test("MST Edge Cases handles insertion that splits two layers down", async () => {
  const blockstore = new MemoryBlockstore();
  let mst = await MST.create(blockstore);
  const cid1 = CID.parse(
    "bafyreie5cvv4h45feadgeuwhbcutmh6t2ceseocckahdoe6uat64zmz454",
  );

  const l1root = "bafyreiettyludka6fpgp33stwxfuwhkzlur6chs4d2v4nkmq2j3ogpdjem";
  const l2root = "bafyreid2x5eqs4w4qxvc5jiwda4cien3gw2q6cshofxwnvv7iucrmfohpm";

  mst = await mst.add("com.example.record/3jqfcqzm3fo2j", cid1); // A; level 0
  mst = await mst.add("com.example.record/3jqfcqzm3fp2j", cid1); // B; level 0
  mst = await mst.add("com.example.record/3jqfcqzm3fr2j", cid1); // C; level 0
  mst = await mst.add("com.example.record/3jqfcqzm3fs2j", cid1); // D; level 1
  mst = await mst.add("com.example.record/3jqfcqzm3ft2j", cid1); // E; level 0
  // GAP for F
  mst = await mst.add("com.example.record/3jqfcqzm3fz2j", cid1); // G; level 0
  mst = await mst.add("com.example.record/3jqfcqzm4fc2j", cid1); // H; level 0
  mst = await mst.add("com.example.record/3jqfcqzm4fd2j", cid1); // I; level 1
  mst = await mst.add("com.example.record/3jqfcqzm4ff2j", cid1); // J; level 0
  mst = await mst.add("com.example.record/3jqfcqzm4fg2j", cid1); // K; level 0
  mst = await mst.add("com.example.record/3jqfcqzm4fh2j", cid1); // L; level 0

  assertEquals(await mst.leafCount(), 11);
  assertEquals(mst.layer, 1);
  assertEquals((await mst.getPointer()).toString(), l1root);

  // insert F, which will push E out of the node with G+H to a new node under D
  mst = await mst.add("com.example.record/3jqfcqzm3fx2j", cid1); // F; level 2
  assertEquals(await mst.leafCount(), 12);
  assertEquals(mst.layer, 2);
  assertEquals((await mst.getPointer()).toString(), l2root);

  // remove F, which should push E back over with G+H
  mst = await mst.delete("com.example.record/3jqfcqzm3fx2j"); // F; level 2
  assertEquals(await mst.leafCount(), 11);
  assertEquals(mst.layer, 1);
  assertEquals((await mst.getPointer()).toString(), l1root);
});

Deno.test("MST Edge Cases handles new layers that are two higher than existing", async () => {
  const blockstore = new MemoryBlockstore();
  let mst = await MST.create(blockstore);
  const cid1 = CID.parse(
    "bafyreie5cvv4h45feadgeuwhbcutmh6t2ceseocckahdoe6uat64zmz454",
  );

  const l0root = "bafyreidfcktqnfmykz2ps3dbul35pepleq7kvv526g47xahuz3rqtptmky";
  const l2root = "bafyreiavxaxdz7o7rbvr3zg2liox2yww46t7g6hkehx4i4h3lwudly7dhy";
  const l2root2 = "bafyreig4jv3vuajbsybhyvb7gggvpwh2zszwfyttjrj6qwvcsp24h6popu";

  mst = await mst.add("com.example.record/3jqfcqzm3ft2j", cid1); // A; level 0
  mst = await mst.add("com.example.record/3jqfcqzm3fz2j", cid1); // C; level 0
  assertEquals(await mst.leafCount(), 2);
  assertEquals(mst.layer, 0);
  assertEquals((await mst.getPointer()).toString(), l0root);

  // insert B, which is two levels above
  mst = await mst.add("com.example.record/3jqfcqzm3fx2j", cid1); // B; level 2
  assertEquals(await mst.leafCount(), 3);
  assertEquals(mst.layer, 2);
  assertEquals((await mst.getPointer()).toString(), l2root);

  // remove B
  mst = await mst.delete("com.example.record/3jqfcqzm3fx2j"); // B; level 2
  assertEquals(await mst.leafCount(), 2);
  assertEquals(mst.layer, 0);
  assertEquals((await mst.getPointer()).toString(), l0root);

  // insert B (level=2) and D (level=1)
  mst = await mst.add("com.example.record/3jqfcqzm3fx2j", cid1); // B; level 2
  mst = await mst.add("com.example.record/3jqfcqzm4fd2j", cid1); // D; level 1
  assertEquals(await mst.leafCount(), 4);
  assertEquals(mst.layer, 2);
  assertEquals((await mst.getPointer()).toString(), l2root2);

  // remove D
  mst = await mst.delete("com.example.record/3jqfcqzm4fd2j"); // D; level 1
  assertEquals(await mst.leafCount(), 3);
  assertEquals(mst.layer, 2);
  assertEquals((await mst.getPointer()).toString(), l2root);
});
