import { CID } from "multiformats";
import { MST } from "../mst/index.ts";
import { BlockMap, MemoryBlockstore } from "../mod.ts";
import fixtures from "./commit-proof-fixtures.json" with { type: "json" };
import { assert, assertEquals } from "@std/assert";

for (const fixture of fixtures) {
  Deno.test(fixture.comment, async () => {
    const { leafValue, keys, adds, dels } = fixture;
    const leaf = CID.parse(leafValue);

    const storage = new MemoryBlockstore();
    let mst = await MST.create(storage);
    for (const key of keys) {
      mst = await mst.add(key, leaf);
    }

    const rootBeforeCommit = await mst.getPointer();
    assertEquals(rootBeforeCommit.toString(), fixture.rootBeforeCommit);

    for (const key of adds) {
      mst = await mst.add(key, leaf);
    }
    for (const key of dels) {
      mst = await mst.delete(key);
    }
    const rootAfterCommit = await mst.getPointer();
    assertEquals(rootAfterCommit.toString(), fixture.rootAfterCommit);
    const proofs = await Promise.all(
      [...adds, ...dels].map((key) => mst.getCoveringProof(key)),
    );
    const proof = proofs.reduce(
      (acc, cur) => acc.addMap(cur),
      new BlockMap(),
    );
    const blocksInProof = fixture.blocksInProof.map((cid) => CID.parse(cid));
    for (const cid of blocksInProof) {
      assert(proof.has(cid));
    }

    const invertAdds = adds.map((k) => (mst: MST) => mst.delete(k));
    const invertDels = dels.map((k) => (mst: MST) => mst.add(k, leaf));
    const invertOrders = permutations([...invertAdds, ...invertDels]);

    const proofStorage = new MemoryBlockstore(proof);
    for (const order of invertOrders) {
      let proofMst = MST.load(proofStorage, rootAfterCommit);
      for (const fn of order) {
        proofMst = await fn(proofMst);
      }
      const rootAfterInvert = await proofMst.getPointer();
      assertEquals(rootAfterInvert.toString(), fixture.rootBeforeCommit);
    }
  });
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];

  return arr.reduce((perms: T[][], item: T, i: number) => {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    return perms.concat(permutations(rest).map((p) => [item, ...p]));
  }, []);
}
