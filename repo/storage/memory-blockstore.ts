import type { CID } from "multiformats/cid";
import { BlockMap } from "../block-map.ts";
import type { CommitData } from "../types.ts";
import { ReadableBlockstore } from "./readable-blockstore.ts";
import type { RepoStorage } from "./types.ts";

export class MemoryBlockstore extends ReadableBlockstore
  implements RepoStorage {
  blocks: BlockMap;
  root: CID | null = null;
  rev: string | null = null;

  constructor(blocks?: BlockMap) {
    super();
    this.blocks = new BlockMap();
    if (blocks) {
      this.blocks.addMap(blocks);
    }
  }

  getRoot(): CID | null {
    return this.root;
  }

  getBytes(cid: CID): Uint8Array | null {
    return this.blocks.get(cid) || null;
  }

  has(cid: CID): boolean {
    return this.blocks.has(cid);
  }

  getBlocks(cids: CID[]): { blocks: BlockMap; missing: CID[] } {
    return this.blocks.getMany(cids);
  }

  putBlock(cid: CID, block: Uint8Array): void {
    this.blocks.set(cid, block);
  }

  putMany(blocks: BlockMap): void {
    this.blocks.addMap(blocks);
  }

  updateRoot(cid: CID, rev: string): void {
    this.root = cid;
    this.rev = rev;
  }

  applyCommit(commit: CommitData): void {
    this.root = commit.cid;
    const rmCids = commit.removedCids.toList();
    for (const cid of rmCids) {
      this.blocks.delete(cid);
    }
    commit.newBlocks.forEach((bytes, cid) => {
      this.blocks.set(cid, bytes);
    });
  }

  sizeInBytes(): number {
    let total = 0;
    this.blocks.forEach((bytes) => {
      total += bytes.byteLength;
    });
    return total;
  }

  destroy(): void {
    this.blocks.clear();
  }
}

export default MemoryBlockstore;
