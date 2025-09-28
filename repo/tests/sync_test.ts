import { streamToBuffer } from "@atp/common";
import { assertEquals, assertRejects } from "@std/assert";
import * as crypto from "@atp/crypto";
import {
  CidSet,
  getAndParseRecord,
  readCar,
  readCarWithRoot,
  Repo,
  type RepoContents,
  RepoVerificationError,
} from "../mod.ts";
import { MemoryBlockstore } from "../storage/index.ts";
import * as sync from "../sync/index.ts";
import * as util from "./_util.ts";

let storage: MemoryBlockstore;
let repo: Repo;
let keypair: crypto.Keypair;
let repoData: RepoContents;

const repoDid = "did:example:test";

// Setup for sync tests
Deno.test("sync setup", async () => {
  storage = new MemoryBlockstore();
  keypair = crypto.Secp256k1Keypair.create();
  repo = await Repo.create(storage, repoDid, keypair);
  const filled = await util.fillRepo(repo, keypair, 20);
  repo = filled.repo;
  repoData = filled.data;
});

Deno.test("sync a full repo", async () => {
  const carBytes = await streamToBuffer(sync.getFullRepo(storage, repo.cid));
  const car = await readCarWithRoot(carBytes);
  const verified = await sync.verifyRepo(
    car.blocks,
    car.root,
    repoDid,
    keypair.did(),
  );
  const syncStorage = new MemoryBlockstore();
  syncStorage.applyCommit(verified.commit);
  const loadedRepo = Repo.load(syncStorage, car.root);
  const contents = await loadedRepo.getContents();
  assertEquals(contents, repoData);
  const contentsFromOps: RepoContents = {};
  for (const write of verified.creates) {
    contentsFromOps[write.collection] ??= {};
    const parsed = getAndParseRecord(car.blocks, write.cid);
    contentsFromOps[write.collection][write.rkey] = parsed.record;
  }
  assertEquals(contentsFromOps, repoData);
});

Deno.test("sync does not sync duplicate blocks", async () => {
  const carBytes = await streamToBuffer(sync.getFullRepo(storage, repo.cid));
  const car = await readCar(carBytes);
  const cids = new CidSet();
  car.blocks.forEach((_, cid) => {
    if (cids.has(cid)) {
      throw new Error(`duplicate block: :${cid.toString()}`);
    }
    cids.add(cid);
  });
});

Deno.test("sync syncs a repo that is behind", async () => {
  // add more to providers's repo & have consumer catch up
  const edit = await util.formatEdit(repo, repoData, keypair, {
    adds: 10,
    updates: 10,
    deletes: 10,
  });
  const verified = await sync.verifyDiff(
    repo,
    edit.commit.newBlocks,
    edit.commit.cid,
    repoDid,
    keypair.did(),
  );
  storage.applyCommit(verified.commit);
  repo = Repo.load(storage, verified.commit.cid);
  const contents = await repo.getContents();
  assertEquals(contents, edit.data);
});

Deno.test("sync throws on a bad signature", async () => {
  const badRepo = await util.addBadCommit(repo, keypair);
  const carBytes = await streamToBuffer(
    sync.getFullRepo(storage, badRepo.cid),
  );
  const car = await readCarWithRoot(carBytes);
  await assertRejects(
    () => sync.verifyRepo(car.blocks, car.root, repoDid, keypair.did()),
    RepoVerificationError,
  );
});
