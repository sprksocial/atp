import type { DidDocument } from "@atp/common";

export { didDocument } from "@atp/common";
export type { DidDocument } from "@atp/common";

export type IdentityResolverOpts = {
  timeout?: number;
  plcUrl?: string;
  didCache?: DidCache;
  backupNameservers?: string[];
};

export type HandleResolverOpts = {
  timeout?: number;
  backupNameservers?: string[];
};

export type DidResolverOpts = {
  timeout?: number;
  plcUrl?: string;
  didCache?: DidCache;
};

export type AtprotoData = {
  did: string;
  signingKey: string;
  handle: string;
  pds: string;
};

export type CacheResult = {
  did: string;
  doc: DidDocument;
  updatedAt: number;
  stale: boolean;
  expired: boolean;
};

export interface DidCache {
  cacheDid(
    did: string,
    doc: DidDocument,
    prevResult?: CacheResult,
  ): void;
  checkCache(did: string): CacheResult | null;
  refreshCache(
    did: string,
    getDoc: () => Promise<DidDocument | null>,
    prevResult?: CacheResult,
  ): Promise<void>;
  clearEntry(did: string): void;
  clear(): void;
}
