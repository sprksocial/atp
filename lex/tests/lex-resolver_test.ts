import { cidForCbor, streamToBuffer } from "@atp/common";
import * as crypto from "@atp/crypto";
import { getRecords, MemoryBlockstore, Repo, WriteOpAction } from "@atp/repo";
import { AtUri } from "@atp/syntax";
import { assertEquals, assertInstanceOf, assertRejects } from "@std/assert";
import { LexResolver, LexResolverError } from "../resolver/mod.ts";
import { createDefaultResolveTxt } from "../resolver/lex-resolver.ts";

const collection = "com.atproto.lexicon.schema";
const nsid = "app.bsky.feed.post";

type ProofFixture = {
  car: Uint8Array;
  cid: string;
  did: string;
  pds: string;
  signingKey: string;
  lexicon: Record<string, unknown>;
};

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
};

const createLexiconRecord = (
  id: string,
): Record<string, unknown> => ({
  $type: collection,
  lexicon: 1,
  id,
  defs: {
    main: {
      type: "query",
    },
  },
});

const createProofFixture = async (
  record = createLexiconRecord(nsid),
): Promise<ProofFixture> => {
  const storage = new MemoryBlockstore();
  const keypair = crypto.Secp256k1Keypair.create();
  const did = "did:plc:resolvertest";
  const repo = await Repo.create(storage, did, keypair, [{
    action: WriteOpAction.Create,
    collection,
    rkey: nsid,
    record,
  }]);
  const car = await streamToBuffer(getRecords(storage, repo.cid, [{
    collection,
    rkey: nsid,
  }]));
  const fetched = await repo.data.get(`${collection}/${nsid}`);
  if (!fetched) {
    throw new Error("expected cid");
  }
  return {
    car,
    cid: fetched.toString(),
    did,
    pds: "https://pds.test",
    signingKey: keypair.did(),
    lexicon: record,
  };
};

Deno.test("get resolves and fetches lexicons through xrpc", async () => {
  const fixture = await createProofFixture();
  const calls: { forceRefresh?: boolean; url?: string } = {};
  const events: string[] = [];

  const resolver = new LexResolver({
    didResolver: {
      resolveAtprotoData(did, forceRefresh) {
        assertEquals(did, fixture.did);
        calls.forceRefresh = forceRefresh;
        return Promise.resolve({
          did,
          handle: "resolver.test",
          pds: fixture.pds,
          signingKey: fixture.signingKey,
        });
      },
    },
    resolveTxt(domain) {
      assertEquals(domain, "_lexicon.feed.bsky.app");
      return Promise.resolve([[`did=${fixture.did}`]]);
    },
    fetch: ((input, init) => {
      const url = input instanceof URL ? input : new URL(String(input));
      const headers = new Headers(init?.headers);
      calls.url = url.toString();
      assertEquals(init?.method, "get");
      assertEquals(headers.get("accept"), "application/vnd.ipld.car");
      assertEquals(headers.get("cache-control"), "no-cache");
      return Promise.resolve(
        new Response(toArrayBuffer(fixture.car), {
          headers: { "content-type": "application/vnd.ipld.car" },
        }),
      );
    }) as typeof fetch,
    hooks: {
      onResolveAuthorityResult() {
        events.push("resolve");
      },
      onFetchResult() {
        events.push("fetch");
      },
    },
  });

  const result = await resolver.get(nsid, {
    forceRefresh: true,
    noCache: true,
  });

  assertEquals(
    calls.url,
    "https://pds.test/xrpc/com.atproto.sync.getRecord?" +
      "did=did%3Aplc%3Aresolvertest&collection=com.atproto.lexicon.schema" +
      "&rkey=app.bsky.feed.post",
  );
  assertEquals(calls.forceRefresh, true);
  assertEquals(
    result.uri.toString(),
    `at://${fixture.did}/${collection}/${nsid}`,
  );
  assertEquals(result.cid.toString(), fixture.cid);
  assertEquals(result.lexicon.id, nsid);
  assertEquals(events, ["resolve", "fetch"]);
});

Deno.test("resolve and fetch hooks can short-circuit the network path", async () => {
  const uri = AtUri.make("did:plc:hooked", collection, nsid);
  const cid = await cidForCbor({ ok: true });
  const lexicon = createLexiconRecord(nsid);

  const resolver = new LexResolver({
    didResolver: {
      resolveAtprotoData() {
        throw new Error("did resolver should not be called");
      },
    },
    resolveTxt() {
      throw new Error("dns should not be called");
    },
    hooks: {
      onResolveAuthority({ nsid }) {
        assertEquals(nsid.toString(), "app.bsky.feed.post");
        return "did:plc:hooked";
      },
      onFetch({ uri }) {
        assertEquals(
          uri.toString(),
          `at://did:plc:hooked/${collection}/${nsid}`,
        );
        return {
          cid,
          lexicon: lexicon as never,
        };
      },
    },
  });

  const resolved = await resolver.resolve(nsid);
  const fetched = await resolver.fetch(uri);

  assertEquals(resolved.toString(), uri.toString());
  assertEquals(fetched.cid.toString(), cid.toString());
  assertEquals(fetched.lexicon.id, nsid);
});

Deno.test("resolve wraps dns failures in LexResolverError", async () => {
  const seen: unknown[] = [];

  const resolver = new LexResolver({
    resolveTxt() {
      return Promise.resolve([["v=spf1 -all"]]);
    },
    hooks: {
      onResolveAuthorityError({ err }) {
        seen.push(err);
      },
    },
  });

  const error = await assertRejects(
    () => resolver.resolve(nsid),
    LexResolverError,
  );

  assertEquals(error.nsid.toString(), nsid);
  assertEquals(seen.length, 1);
});

Deno.test("createDefaultResolveTxt prefers Deno DNS when available", async () => {
  const calls: Array<[string, "TXT"]> = [];
  const resolveTxt = createDefaultResolveTxt({
    denoResolveDns(domain, recordType) {
      calls.push([domain, recordType]);
      return Promise.resolve([["did=did:plc:deno"]]);
    },
    nodeResolveTxt() {
      throw new Error("node dns should not be called");
    },
  });

  const records = await resolveTxt("_lexicon.feed.bsky.app");

  assertEquals(calls, [["_lexicon.feed.bsky.app", "TXT"]]);
  assertEquals(records, [["did=did:plc:deno"]]);
});

Deno.test("createDefaultResolveTxt falls back to Node DNS when Deno DNS is unavailable", async () => {
  const calls: string[] = [];
  const resolveTxt = createDefaultResolveTxt({
    denoResolveDns: null,
    nodeResolveTxt(domain) {
      calls.push(domain);
      return Promise.resolve([["did=did:plc:node"]]);
    },
  });

  const records = await resolveTxt("_lexicon.feed.bsky.app");

  assertEquals(calls, ["_lexicon.feed.bsky.app"]);
  assertEquals(records, [["did=did:plc:node"]]);
});

Deno.test("fetch wraps proof verification failures in LexResolverError", async () => {
  const fixture = await createProofFixture();
  const seen: unknown[] = [];

  const resolver = new LexResolver({
    didResolver: {
      resolveAtprotoData(did) {
        return Promise.resolve({
          did,
          handle: "resolver.test",
          pds: fixture.pds,
          signingKey: "did:key:zWrongKey",
        });
      },
    },
    fetch: (() => {
      return Promise.resolve(
        new Response(toArrayBuffer(fixture.car), {
          headers: { "content-type": "application/vnd.ipld.car" },
        }),
      );
    }) as typeof fetch,
    hooks: {
      onFetchError({ err }) {
        seen.push(err);
      },
    },
  });

  const error = await assertRejects(
    () => resolver.fetch(`at://${fixture.did}/${collection}/${nsid}`),
    LexResolverError,
  );

  assertEquals(error.nsid.toString(), nsid);
  assertEquals(seen.length, 1);
});

Deno.test("fetch rejects lexicons with mismatched ids", async () => {
  const fixture = await createProofFixture(
    createLexiconRecord("app.bsky.feed.like"),
  );

  const resolver = new LexResolver({
    didResolver: {
      resolveAtprotoData(did) {
        return Promise.resolve({
          did,
          handle: "resolver.test",
          pds: fixture.pds,
          signingKey: fixture.signingKey,
        });
      },
    },
    fetch: (() => {
      return Promise.resolve(
        new Response(toArrayBuffer(fixture.car), {
          headers: { "content-type": "application/vnd.ipld.car" },
        }),
      );
    }) as typeof fetch,
  });

  const error = await assertRejects(
    () => resolver.fetch(`at://${fixture.did}/${collection}/${nsid}`),
    LexResolverError,
  );

  assertEquals(error.nsid.toString(), nsid);
});

Deno.test("fetch rejects non-lexicon collections", async () => {
  const resolver = new LexResolver({
    didResolver: {
      resolveAtprotoData() {
        throw new Error("did resolver should not be called");
      },
    },
  });

  const error = await assertRejects(
    () =>
      resolver.fetch(
        "at://did:plc:resolvertest/app.bsky.feed.post/app.bsky.feed.like",
      ),
    LexResolverError,
  );

  assertInstanceOf(error, LexResolverError);
});
