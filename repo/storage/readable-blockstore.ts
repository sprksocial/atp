import type { CID } from "multiformats/cid";
import type { check } from "@atp/common";
import type { RepoRecord } from "@atp/lexicon";
import type { BlockMap } from "../block-map.ts";
import { MissingBlockError } from "../error.ts";
import * as parse from "../parse.ts";
import { cborToLexRecord } from "../util.ts";

export abstract class ReadableBlockstore {
  abstract getBytes(cid: CID): Uint8Array | null;
  abstract has(cid: CID): boolean;
  abstract getBlocks(
    cids: CID[],
  ): { blocks: BlockMap; missing: CID[] };

  attemptRead<T>(
    cid: CID,
    def: check.Def<T>,
  ): { obj: T; bytes: Uint8Array } | null {
    const bytes = this.getBytes(cid);
    if (!bytes) return null;
    return parse.parseObjByDef(bytes, cid, def);
  }

  readObjAndBytes<T>(
    cid: CID,
    def: check.Def<T>,
  ): { obj: T; bytes: Uint8Array } {
    const read = this.attemptRead(cid, def);
    if (!read) {
      throw new MissingBlockError(cid, def.name);
    }
    return read;
  }

  readObj<T>(cid: CID, def: check.Def<T>): T {
    const obj = this.readObjAndBytes(cid, def);
    return obj.obj;
  }

  attemptReadRecord(cid: CID): RepoRecord | null {
    try {
      return this.readRecord(cid);
    } catch {
      return null;
    }
  }

  readRecord(cid: CID): RepoRecord {
    const bytes = this.getBytes(cid);
    if (!bytes) {
      throw new MissingBlockError(cid);
    }
    return cborToLexRecord(bytes);
  }
}

export default ReadableBlockstore;
