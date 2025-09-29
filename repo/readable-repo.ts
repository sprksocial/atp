import type { CID } from "multiformats/cid";
import type { RepoRecord } from "@atp/lexicon";
import { MissingBlocksError } from "./error.ts";
import log from "./logger.ts";
import { MST } from "./mst/index.ts";
import * as parse from "./parse.ts";
import type { ReadableBlockstore } from "./storage/index.ts";
import { type Commit, def, type RepoContents } from "./types.ts";
import * as util from "./util.ts";

type Params = {
  storage: ReadableBlockstore;
  data: MST;
  commit: Commit;
  cid: CID;
};

export class ReadableRepo {
  storage: ReadableBlockstore;
  data: MST;
  commit: Commit;
  cid: CID;

  constructor(params: Params) {
    this.storage = params.storage;
    this.data = params.data;
    this.commit = params.commit;
    this.cid = params.cid;
  }

  static load(storage: ReadableBlockstore, commitCid: CID): ReadableRepo {
    const commit = storage.readObj(commitCid, def.versionedCommit);
    const data = MST.load(storage, (commit as { data: CID }).data);
    log.info("loaded repo for", { did: commit.did });
    return new ReadableRepo({
      storage,
      data,
      commit: util.ensureV3Commit(commit),
      cid: commitCid,
    });
  }

  get did(): string {
    return this.commit.did;
  }

  get version(): number {
    return this.commit.version;
  }

  async *walkRecords(from?: string): AsyncIterable<{
    collection: string;
    rkey: string;
    cid: CID;
    record: RepoRecord;
  }> {
    for await (const leaf of this.data.walkLeavesFrom(from ?? "")) {
      const { collection, rkey } = util.parseDataKey(leaf.key);
      const record = await this.storage.readRecord(leaf.value);
      yield { collection, rkey, cid: leaf.value, record };
    }
  }

  async getRecord(collection: string, rkey: string): Promise<unknown | null> {
    const dataKey = collection + "/" + rkey;
    const cid = await this.data.get(dataKey);
    if (!cid) return null;
    return this.storage.readObj(cid, def.unknown);
  }

  async getContents(): Promise<RepoContents> {
    const entries = await this.data.list();
    const cids = entries.map((e: { key: string; value: CID }) => e.value);
    const { blocks, missing } = await this.storage.getBlocks(cids);
    if (missing.length > 0) {
      throw new MissingBlocksError("getContents record", missing);
    }
    const contents: RepoContents = {};
    for (const entry of entries) {
      const { collection, rkey } = util.parseDataKey(entry.key);
      contents[collection] ??= {};
      const parsed = await parse.getAndParseRecord(blocks, entry.value);
      contents[collection][rkey] = parsed.record;
    }
    return contents;
  }
}
