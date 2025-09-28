import type { CID } from "multiformats/cid";
import type { BlockMap } from "../block-map.ts";
import { ReadableBlockstore } from "./readable-blockstore.ts";

export class SyncStorage extends ReadableBlockstore {
  constructor(
    public staged: ReadableBlockstore,
    public saved: ReadableBlockstore,
  ) {
    super();
  }

  getBytes(cid: CID): Uint8Array | null {
    const got = this.staged.getBytes(cid);
    if (got) return got;
    return this.saved.getBytes(cid);
  }

  getBlocks(cids: CID[]): { blocks: BlockMap; missing: CID[] } {
    const fromStaged = this.staged.getBlocks(cids);
    const fromSaved = this.saved.getBlocks(fromStaged.missing);
    const blocks = fromStaged.blocks;
    blocks.addMap(fromSaved.blocks);
    return {
      blocks,
      missing: fromSaved.missing,
    };
  }

  has(cid: CID): boolean {
    return (this.staged.has(cid)) || (this.saved.has(cid));
  }
}

export default SyncStorage;
