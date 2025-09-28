import { TID } from "@atp/common";
import { assertEquals } from "@std/assert";
import type * as crypto from "@atp/crypto";
import { Secp256k1Keypair } from "@atp/crypto";
import { type RepoContents, verifyCommitSig, WriteOpAction } from "../mod.ts";
import { Repo } from "../repo.ts";
import { MemoryBlockstore } from "../storage/index.ts";
import * as util from "./_util.ts";

const collName = "com.example.posts";

let storage: MemoryBlockstore;
let keypair: crypto.Keypair;
let repo: Repo;
let repoData: RepoContents;

Deno.test("repo creates repo", async () => {
  storage = new MemoryBlockstore();
  keypair = Secp256k1Keypair.create();
  repo = await Repo.create(storage, keypair.did(), keypair);
});

Deno.test("repo has proper metadata", () => {
  assertEquals(repo.did, keypair.did());
  assertEquals(repo.version, 3);
});

Deno.test("repo does basic operations", async () => {
  const rkey = TID.nextStr();
  const record = util.generateObject();
  repo = await repo.applyWrites(
    {
      action: WriteOpAction.Create,
      collection: collName,
      rkey,
      record,
    },
    keypair,
  );

  let got = await repo.getRecord(collName, rkey);
  assertEquals(got, record);

  const updatedRecord = util.generateObject();
  repo = await repo.applyWrites(
    {
      action: WriteOpAction.Update,
      collection: collName,
      rkey,
      record: updatedRecord,
    },
    keypair,
  );
  got = await repo.getRecord(collName, rkey);
  assertEquals(got, updatedRecord);

  repo = await repo.applyWrites(
    {
      action: WriteOpAction.Delete,
      collection: collName,
      rkey: rkey,
    },
    keypair,
  );
  got = await repo.getRecord(collName, rkey);
  assertEquals(got, null);
});

Deno.test("repo adds content collections", async () => {
  const filled = await util.fillRepo(repo, keypair, 100);
  repo = filled.repo;
  repoData = filled.data;
  const contents = await repo.getContents();
  assertEquals(contents, repoData);
});

Deno.test("repo edits and deletes content", async () => {
  const edit = await util.formatEdit(repo, repoData, keypair, {
    adds: 20,
    updates: 20,
    deletes: 20,
  });
  repo = await repo.applyCommit(edit.commit);
  repoData = edit.data;
  const contents = await repo.getContents();
  assertEquals(contents, repoData);
});

Deno.test("repo has a valid signature to commit", () => {
  const verified = verifyCommitSig(repo.commit, keypair.did());
  assertEquals(verified, true);
});

Deno.test("repo sets correct DID", () => {
  assertEquals(repo.did, keypair.did());
});

Deno.test("repo loads from blockstore", async () => {
  const reloadedRepo = Repo.load(storage, repo.cid);

  const contents = await reloadedRepo.getContents();
  assertEquals(contents, repoData);
  assertEquals(repo.did, keypair.did());
  assertEquals(repo.version, 3);
});
