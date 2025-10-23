import { DAY, HOUR } from "@atp/common";
import type { CacheResult, DidCache, DidDocument } from "../types.ts";

/**
 * Value stored in cache for a DID doc
 * @prop doc - DID Document object
 * @prop updatedAt - Last time DID doc cached was updated
 */
type CacheVal = {
  doc: DidDocument;
  updatedAt: number;
};

export class MemoryCache implements DidCache {
  public staleTTL: number;
  public maxTTL: number;
  constructor(staleTTL?: number, maxTTL?: number) {
    this.staleTTL = staleTTL ?? HOUR;
    this.maxTTL = maxTTL ?? DAY;
  }

  public cache: Map<string, CacheVal> = new Map();

  cacheDid(did: string, doc: DidDocument): void {
    this.cache.set(did, { doc, updatedAt: Date.now() });
  }

  async refreshCache(
    did: string,
    getDoc: () => Promise<DidDocument | null>,
  ): Promise<void> {
    const doc = await getDoc();
    if (doc) {
      this.cacheDid(did, doc);
    }
  }

  checkCache(did: string): CacheResult | null {
    const val = this.cache.get(did);
    if (!val) return null;
    const now = Date.now();
    const expired = now > val.updatedAt + this.maxTTL;
    const stale = now > val.updatedAt + this.staleTTL;
    return {
      ...val,
      did,
      stale,
      expired,
    };
  }

  clearEntry(did: string): void {
    this.cache.delete(did);
  }

  clear(): void {
    this.cache.clear();
  }
}
