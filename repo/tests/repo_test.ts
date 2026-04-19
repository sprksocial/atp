import { TID } from "@atp/common";
import { l } from "@atp/lex";
import { BlobRef as LegacyBlobRef } from "@atp/lexicon";
import { assertEquals } from "@std/assert";
import type * as crypto from "@atp/crypto";
import { Secp256k1Keypair } from "@atp/crypto";
import { type Cid, parseCid } from "@atp/lex/data";
import {
  BlockMap,
  cidForRecord,
  type RepoContents,
  type RepoInputRecord,
  verifyCommitSig,
  WriteOpAction,
} from "../mod.ts";
import { Repo } from "../repo.ts";
import { MemoryBlockstore } from "../storage/index.ts";
import * as util from "./_util.ts";

const collName = "com.example.posts";
const lexRecordSchema = l.record(
  "tid",
  "com.example.lexRecord",
  l.object({
    text: l.string(),
    note: l.optional(l.string()),
    ref: l.cidLink(),
    bytes: l.bytes(),
    blob: l.optional(l.blob()),
  }),
);

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

Deno.test("repo accepts records inferred from @atp/lex", async () => {
  const storage = new MemoryBlockstore();
  const keypair = Secp256k1Keypair.create();
  const collection = "com.example.lexRecord";
  const rkey = TID.nextStr();
  const ref = parseCid(
    "bafyreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku",
  );
  const record = lexRecordSchema.build({
    text: "hello",
    ref,
    bytes: new Uint8Array([1, 2, 3]),
    blob: {
      $type: "blob",
      mimeType: "image/png",
      ref,
      size: 3,
    },
  });

  const cid = await cidForRecord(record);
  const blocks = new BlockMap();

  assertEquals((await blocks.add(record)).toString(), cid.toString());

  const repo = await Repo.create(storage, keypair.did(), keypair, [{
    action: WriteOpAction.Create,
    collection,
    rkey,
    record,
  }]);
  const stored = await repo.getRecord(collection, rkey) as typeof record;

  assertEquals(stored.$type, record.$type);
  assertEquals(stored.text, record.text);
  assertEquals(stored.ref.toString(), record.ref.toString());
  assertEquals(stored.bytes, record.bytes);
  assertEquals(stored.blob?.ref.toString(), record.blob?.ref.toString());
  assertEquals(stored.blob?.mimeType, record.blob?.mimeType);
  assertEquals(stored.blob?.size, record.blob?.size);
  assertEquals("note" in stored, false);
});

Deno.test("repo accepts legacy lexicon blob refs in our compatibility layer", async () => {
  const storage = new MemoryBlockstore();
  const keypair = Secp256k1Keypair.create();
  const collection = "com.example.legacyBlob";
  const rkey = TID.nextStr();
  const ref = parseCid(
    "bafyreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku",
  );
  const record: RepoInputRecord = {
    $type: collection,
    text: "legacy",
    blob: new LegacyBlobRef(
      ref as unknown as ConstructorParameters<typeof LegacyBlobRef>[0],
      "image/png",
      7,
    ),
  };

  const cid = await cidForRecord(record);
  const blocks = new BlockMap();

  assertEquals((await blocks.add(record)).toString(), cid.toString());

  const repo = await Repo.create(storage, keypair.did(), keypair, [{
    action: WriteOpAction.Create,
    collection,
    rkey,
    record,
  }]);
  const stored = await repo.getRecord(collection, rkey) as {
    $type: string;
    text: string;
    blob: {
      $type: string;
      ref: Cid;
      mimeType: string;
      size: number;
    };
  };

  assertEquals(stored.$type, collection);
  assertEquals(stored.text, "legacy");
  assertEquals(stored.blob.$type, "blob");
  assertEquals(stored.blob.ref.toString(), ref.toString());
  assertEquals(stored.blob.mimeType, "image/png");
  assertEquals(stored.blob.size, 7);
});
