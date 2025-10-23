import type { DidDocument } from "@atp/common";

export { didDocument } from "@atp/common";
export type { DidDocument } from "@atp/common";

/**
 * Options for a combined handle and did resolver.
 * @property timeout - Timeout in milliseconds for resolving handles.
 * @property plcUrl - URL of the PLC registry or mirror used for the `did:plc` method.
 * @property didCache - Cache for storing recently resolved DID documents.
 * @property backupNameservers - List of backup nameservers to use for handle resolution.
 */
export type IdentityResolverOpts = {
  timeout?: number;
  plcUrl?: string;
  didCache?: DidCache;
  backupNameservers?: string[];
};

/**
 * Options for a handle resolver.
 * @property timeout - Timeout in milliseconds for resolving handles.
 * @property backupNameservers - List of backup nameservers to use if the primary DNS nameservers fails.
 */
export type HandleResolverOpts = {
  timeout?: number;
  backupNameservers?: string[];
};

/**
 * Options for a DID resolver.
 * @property timeout - Timeout in milliseconds for resolving DIDs.
 * @property plcUrl - URL of the PLC registry or mirror used for the `did:plc` method.
 * @property didCache - Cache for storing recently resolved DID documents.
 */
export type DidResolverOpts = {
  timeout?: number;
  plcUrl?: string;
  didCache?: DidCache;
};

/**
 * Data associated with an AT Protocol repository.
 * @property did - The decentralized identifier of the repository. Never changes.
 * @property signingKey - The public key used for signing records and operations.
 * @property handle - The domain used for representing the repository to users, can change over time.
 * @property pds - The URL of the repository's personal data server, where the repository's data is stored.
 */
export type AtprotoData = {
  did: string;
  signingKey: string;
  handle: string;
  pds: string;
};

/**
 * Stored when caching resolved DID documents.
 * @property did - Decentralized identifier of the repository
 * @property doc - The resolved DID document
 * @property updatedAt - Timestamp of when the cache entry was last updated
 * @property stale - Whether the cache entry is too old and needs to be refreshed
 * @property expired - Whether the cache entry has expired and should be removed
 */
export type CacheResult = {
  did: string;
  doc: DidDocument;
  updatedAt: number;
  stale: boolean;
  expired: boolean;
};

/**
 * An optional configured cache for caching resolved
 * did documents and getting the cached did docs.
 */
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
