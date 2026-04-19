import type { Cid } from "@atp/lex/data";
import type { check } from "@atp/common";
import type { BlockMap } from "../block-map.ts";
import { MissingBlockError } from "../error.ts";
import * as parse from "../parse.ts";
import type { RepoRecord } from "../types.ts";
import { cborToLexRecord } from "../util.ts";

export abstract class ReadableBlockstore {
  abstract getBytes(cid: Cid): Uint8Array | null;
  abstract has(cid: Cid): boolean;
  abstract getBlocks(
    cids: Cid[],
  ): { blocks: BlockMap; missing: Cid[] };

  attemptRead<T>(
    cid: Cid,
    def: check.Def<T>,
  ): { obj: T; bytes: Uint8Array } | null {
    const bytes = this.getBytes(cid);
    if (!bytes) return null;
    return parse.parseObjByDef(bytes, cid, def);
  }

  readObjAndBytes<T>(
    cid: Cid,
    def: check.Def<T>,
  ): { obj: T; bytes: Uint8Array } {
    const read = this.attemptRead(cid, def);
    if (!read) {
      throw new MissingBlockError(cid, def.name);
    }
    return read;
  }

  readObj<T>(cid: Cid, def: check.Def<T>): T {
    const obj = this.readObjAndBytes(cid, def);
    return obj.obj;
  }

  attemptReadRecord(cid: Cid): RepoRecord | null {
    try {
      return this.readRecord(cid);
    } catch {
      return null;
    }
  }

  readRecord(cid: Cid): RepoRecord {
    const bytes = this.getBytes(cid);
    if (!bytes) {
      throw new MissingBlockError(cid);
    }
    return cborToLexRecord(bytes);
  }
}

export default ReadableBlockstore;
