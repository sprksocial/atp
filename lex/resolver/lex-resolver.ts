import type { CID } from "multiformats/cid";
import { resolveTxt as resolveTxtWithNode } from "node:dns/promises";
import { type AtprotoData, type DidCache, DidResolver } from "@atp/identity";
import {
  assertDid,
  assertRecordKey,
  type DidString,
  type RecordKeyString,
} from "../external.ts";
import * as l from "../external.ts";
import {
  type LexiconDocument,
  lexiconDocumentSchema,
} from "../document/mod.ts";
import {
  def as repoDef,
  MemoryBlockstore,
  MST,
  readCarWithRoot,
  verifyCommitSig,
} from "@atp/repo";
import { AtUri, ensureValidDid, NSID } from "@atp/syntax";
import { LexResolverError } from "./lex-resolver-error.ts";

const LEXICON_COLLECTION = "com.atproto.lexicon.schema";

const getRecordQuery = l.query(
  "com.atproto.sync.getRecord",
  l.params({
    did: l.string({ format: "did" }),
    collection: l.string({ format: "nsid" }),
    rkey: l.string({ format: "record-key" }),
  }),
  l.payload("application/vnd.ipld.car"),
);

type MaybePromise<T> = Promise<T> | T;

export type LexResolverResult = {
  uri: AtUri;
  cid: CID;
  lexicon: LexiconDocument;
};

export type LexResolverFetchResult = {
  cid: CID;
  lexicon: LexiconDocument;
};

export type LexResolverHooks = {
  onResolveAuthority?(data: { nsid: NSID }): MaybePromise<string | void>;
  onResolveAuthorityResult?(
    data: { nsid: NSID; did: string },
  ): MaybePromise<void>;
  onResolveAuthorityError?(
    data: { nsid: NSID; err: unknown },
  ): MaybePromise<void>;
  onFetch?(data: { uri: AtUri }): MaybePromise<LexResolverFetchResult | void>;
  onFetchResult?(data: {
    uri: AtUri;
    cid: CID;
    lexicon: LexiconDocument;
  }): MaybePromise<void>;
  onFetchError?(data: { uri: AtUri; err: unknown }): MaybePromise<void>;
};

export type TxtResolver = (domain: string) => Promise<string[][]>;

type DenoResolveTxt = (
  domain: string,
  recordType: "TXT",
) => Promise<string[][]>;

export type LexResolverDidResolver = {
  resolveAtprotoData(
    did: string,
    forceRefresh?: boolean,
  ): Promise<AtprotoData>;
};

export type LexResolverOptions = {
  timeout?: number;
  plcUrl?: string;
  didCache?: DidCache;
  fetch?: typeof globalThis.fetch;
  hooks?: LexResolverHooks;
  didResolver?: LexResolverDidResolver;
  resolveTxt?: TxtResolver;
};

export type LexResolverFetchOptions = {
  signal?: AbortSignal;
  forceRefresh?: boolean;
  noCache?: boolean;
};

export type DefaultTxtResolverOptions = {
  denoResolveDns?: DenoResolveTxt | null;
  nodeResolveTxt?: TxtResolver;
};

export { AtUri, NSID };
export type { CID, LexiconDocument };

export class LexResolver {
  protected readonly didResolver: LexResolverDidResolver;
  protected readonly resolveTxt: TxtResolver;

  constructor(protected readonly options: LexResolverOptions = {}) {
    const { timeout = 3000, plcUrl, didCache } = options;
    this.didResolver = options.didResolver ??
      new DidResolver({ timeout, plcUrl, didCache });
    this.resolveTxt = options.resolveTxt ?? defaultResolveTxt;
  }

  async get(
    nsidStr: NSID | string,
    options?: LexResolverFetchOptions,
  ): Promise<LexResolverResult> {
    const uri = await this.resolve(nsidStr);
    return this.fetch(uri, options);
  }

  async resolve(nsidStr: NSID | string): Promise<AtUri> {
    const nsid = NSID.from(nsidStr);

    const hookedDid = await this.options.hooks?.onResolveAuthority?.({ nsid });
    if (hookedDid !== undefined) {
      ensureValidDid(hookedDid);
      return AtUri.make(hookedDid, LEXICON_COLLECTION, nsid.toString());
    }

    const did = await this.resolveLexiconAuthority(nsid).then(
      async (resolvedDid) => {
        await this.options.hooks?.onResolveAuthorityResult?.({
          nsid,
          did: resolvedDid,
        });
        return resolvedDid;
      },
      async (err) => {
        await this.options.hooks?.onResolveAuthorityError?.({ nsid, err });
        throw err;
      },
    );

    return AtUri.make(did, LEXICON_COLLECTION, nsid.toString());
  }

  async fetch(
    uriStr: AtUri | string,
    options?: LexResolverFetchOptions,
  ): Promise<LexResolverResult> {
    const uri = typeof uriStr === "string" ? new AtUri(uriStr) : uriStr;

    const hookedResult = await this.options.hooks?.onFetch?.({ uri });
    if (hookedResult !== undefined) {
      return { uri, ...validateLexiconResult(uri, hookedResult) };
    }

    const fetched = await this.fetchLexiconUri(uri, options).then(
      async (result) => {
        const validated = validateLexiconResult(uri, result);
        await this.options.hooks?.onFetchResult?.({ uri, ...validated });
        return validated;
      },
      async (err) => {
        await this.options.hooks?.onFetchError?.({ uri, err });
        throw err;
      },
    );

    return { uri, ...fetched };
  }

  protected async resolveLexiconAuthority(nsid: NSID): Promise<string> {
    try {
      const did = parseDomainTxtDid(
        await this.resolveTxt(`_lexicon.${nsid.authority}`),
      );
      ensureValidDid(did);
      return did;
    } catch (cause) {
      throw new LexResolverError(
        nsid,
        `Failed to resolve lexicon DID authority for ${nsid}`,
        { cause },
      );
    }
  }

  protected async fetchLexiconUri(
    uri: AtUri,
    options?: LexResolverFetchOptions,
  ): Promise<LexResolverFetchResult> {
    const { did, nsid } = parseLexiconUri(uri);

    const atprotoData = await this.didResolver.resolveAtprotoData(
      did,
      options?.forceRefresh,
    ).catch((cause) => {
      throw new LexResolverError(
        nsid,
        `Failed to resolve DID document for ${did}`,
        { cause },
      );
    });

    if (!atprotoData.signingKey || !atprotoData.pds) {
      throw new LexResolverError(
        nsid,
        `No atproto PDS service endpoint or signing key found in ${did} DID document`,
      );
    }

    const didParam = did;
    const rkey = nsid.toString();
    assertDid(didParam);
    assertRecordKey(rkey);

    const response = await fetchGetRecord({
      service: atprotoData.pds,
      fetch: this.options.fetch,
      did: didParam as DidString,
      collection: LEXICON_COLLECTION,
      rkey: rkey as RecordKeyString,
      noCache: options?.noCache,
      signal: options?.signal,
    }).catch((cause) => {
      throw new LexResolverError(nsid, `Failed to fetch Record ${uri}`, {
        cause,
      });
    });

    return verifyRecordProof(
      response,
      did,
      atprotoData.signingKey,
      LEXICON_COLLECTION,
      nsid.toString(),
    ).catch((cause) => {
      throw new LexResolverError(
        nsid,
        `Failed to verify Lexicon record proof at ${uri}`,
        { cause },
      );
    });
  }
}

export function createDefaultResolveTxt(
  options: DefaultTxtResolverOptions = {},
): TxtResolver {
  const denoResolveDns = options.denoResolveDns === undefined
    ? getDenoResolveDns()
    : options.denoResolveDns;

  if (denoResolveDns) {
    return (domain) => denoResolveDns(domain, "TXT");
  }

  const nodeResolveTxt = options.nodeResolveTxt ?? resolveTxtWithNode;
  return (domain) => nodeResolveTxt(domain);
}

const defaultResolveTxt = createDefaultResolveTxt();

function getDenoResolveDns(): DenoResolveTxt | undefined {
  if (typeof Deno === "undefined") {
    return undefined;
  }

  return (domain, recordType) => Deno.resolveDns(domain, recordType);
}

function parseDomainTxtDid(records: string[][]): string {
  const didLines = records
    .map((chunks) => chunks.join(""))
    .filter((value) => value.startsWith("did="));

  if (didLines.length === 1) {
    return didLines[0].slice(4);
  }

  throw didLines.length > 1
    ? new Error("Multiple DIDs found in DNS TXT records")
    : new Error("No DID found in DNS TXT records");
}

type FetchGetRecordOptions = {
  service: string;
  fetch?: typeof globalThis.fetch;
  did: DidString;
  collection: string;
  rkey: RecordKeyString;
  noCache?: boolean;
  signal?: AbortSignal;
};

async function fetchGetRecord(
  options: FetchGetRecordOptions,
): Promise<Uint8Array> {
  const fetchFn = options.fetch ?? globalThis.fetch;
  if (typeof fetchFn !== "function") {
    throw new TypeError("fetch() is not available in this environment");
  }

  const params = {
    did: options.did,
    collection: options.collection,
    rkey: options.rkey,
  };
  const result = getRecordQuery.parameters.safeParse(params);
  if (!result.success) {
    throw result.error;
  }

  const url = new URL(
    `/xrpc/${encodeURIComponent(getRecordQuery.nsid)}?${
      getRecordQuery.parameters.toURLSearchParams(result.value).toString()
    }`,
    options.service,
  );
  const headers = new Headers();

  if (getRecordQuery.output.encoding !== undefined) {
    headers.set("accept", getRecordQuery.output.encoding);
  }

  if (options.noCache) {
    headers.set("cache-control", "no-cache");
  }

  const response = await fetchFn(url, {
    method: "get",
    headers,
    redirect: "follow",
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(
      `Unexpected response ${response.status} ${response.statusText}`,
    );
  }

  const contentType = response.headers.get("content-type");
  const expected = getRecordQuery.output.encoding;
  if (expected !== undefined && !matchesEncoding(expected, contentType)) {
    throw new TypeError(
      `Unexpected content-type ${contentType ?? "null"} for ${getRecordQuery.nsid}`,
    );
  }

  return new Uint8Array(await response.arrayBuffer());
}

function matchesEncoding(expected: string, actual: string | null): boolean {
  if (actual == null) {
    return false;
  }

  return actual === expected || actual.startsWith(`${expected};`);
}

function parseLexiconUri(uri: AtUri): { did: string; nsid: NSID } {
  const nsid = NSID.from(uri.rkey);

  if (uri.collection !== LEXICON_COLLECTION) {
    throw new LexResolverError(
      nsid,
      `URI collection is not ${LEXICON_COLLECTION}: ${uri}`,
    );
  }

  try {
    ensureValidDid(uri.host);
    return { did: uri.host, nsid };
  } catch (cause) {
    throw new LexResolverError(nsid, `URI host is not a DID ${uri}`, { cause });
  }
}

function validateLexiconResult(
  uri: AtUri,
  result: LexResolverFetchResult,
): LexResolverFetchResult {
  const nsid = NSID.from(uri.rkey);
  const validation = lexiconDocumentSchema.safeParse(result.lexicon);

  if (!validation.success) {
    throw new LexResolverError(nsid, `Invalid Lexicon document at ${uri}`, {
      cause: validation.error,
    });
  }

  if (validation.value.id !== uri.rkey) {
    throw new LexResolverError(
      nsid,
      `Invalid document id "${validation.value.id}" at ${uri}`,
    );
  }

  return {
    cid: result.cid,
    lexicon: validation.value,
  };
}

async function verifyRecordProof(
  car: Uint8Array,
  did: string,
  signingKey: string,
  collection: string,
  rkey: string,
): Promise<LexResolverFetchResult> {
  const { root, blocks } = await readCarWithRoot(car);
  const blockstore = new MemoryBlockstore(blocks);

  const commit = blockstore.readObj(root, repoDef.commit);
  if (commit.did !== did) {
    throw new Error(`Invalid repo did: ${commit.did}`);
  }

  const validSig = verifyCommitSig(commit, signingKey);
  if (!validSig) {
    throw new Error(`Invalid signature on commit: ${root.toString()}`);
  }

  const mst = MST.load(blockstore, (commit as { data: CID }).data);
  const cid = await mst.get(`${collection}/${rkey}`);
  if (!cid) {
    throw new Error("Record not found in proof");
  }

  const record = blockstore.readRecord(cid);
  if (record.$type !== collection) {
    throw new Error(
      `Invalid record type: expected ${collection}, got ${record.$type}`,
    );
  }

  return {
    cid,
    lexicon: record as LexiconDocument,
  };
}
