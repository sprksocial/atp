import * as plc from "@did-plc/lib";
import { Database as DidPlcDb, PlcServer } from "@did-plc/server";
import getPort from "get-port";
import { wait } from "@atp/common";
// deno-lint-ignore no-import-prefix no-unversioned-import
import { Secp256k1Keypair } from "npm:@atproto/crypto";
import { DidResolver } from "../mod.ts";
import { MemoryCache } from "../did/memory-cache.ts";
import { assert, assertEquals } from "@std/assert";

let close: () => Promise<void>;
let plcUrl: string;
let did: string;

let didCache: MemoryCache;
let didResolver: DidResolver;

Deno.test.beforeAll(async () => {
  const plcDB = DidPlcDb.mock();
  const plcPort = await getPort();
  const plcServer = PlcServer.create({ db: plcDB, port: plcPort });
  await plcServer.start();

  plcUrl = "http://localhost:" + plcPort;

  const signingKey = await Secp256k1Keypair.create();
  const rotationKey = await Secp256k1Keypair.create();
  const plcClient = new plc.Client(plcUrl);
  did = await plcClient.createDid({
    signingKey: signingKey.did(),
    handle: "alice.test",
    pds: "https://bsky.social",
    rotationKeys: [rotationKey.did()],
    signer: rotationKey,
  });

  didCache = new MemoryCache();
  didResolver = new DidResolver({ plcUrl, didCache });

  close = async () => {
    await plcServer.destroy();
  };
});

Deno.test.afterAll(async () => {
  await close();
});

Deno.test({
  name: "caches dids on lookup",
  async fn() {
    const resolved = await didResolver.resolve(did);
    assertEquals(resolved?.id, did);

    const cached = didResolver.cache?.checkCache(did);
    assertEquals(cached?.did, did);
    assertEquals(cached?.doc, resolved);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "clears cache and repopulates",
  async fn() {
    didResolver.cache?.clear();
    await didResolver.resolve(did);

    const cached = didResolver.cache?.checkCache(did);
    assertEquals(cached?.did, did);
    assertEquals(cached?.doc.id, did);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "accurately reports stale dids & refreshes the cache",
  async fn() {
    const didCache = new MemoryCache(1);
    const shortCacheResolver = new DidResolver({ plcUrl, didCache });
    const doc = await shortCacheResolver.resolve(did);

    // let's mess with the cached doc so we get something different
    didCache.cacheDid(did, { ...doc, id: "did:example:alice" });
    await wait(5);

    // first check the cache & see that we have the stale value
    const cached = shortCacheResolver.cache?.checkCache(did);
    assert(cached?.stale);
    assertEquals(cached?.doc.id, "did:example:alice");
    // see that the resolver gives us the stale value while it revalidates
    const staleGet = await shortCacheResolver.resolve(did);
    assertEquals(staleGet?.id, "did:example:alice");

    // since it revalidated, ensure we have the new value
    const updatedCache = shortCacheResolver.cache?.checkCache(did);
    assertEquals(updatedCache?.doc.id, did);
    const updatedGet = await shortCacheResolver.resolve(did);
    assertEquals(updatedGet?.id, did);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "does not return expired dids & refreshes the cache",
  async fn() {
    const didCache = new MemoryCache(0, 1);
    const shortExpireResolver = new DidResolver({ plcUrl, didCache });
    const doc = await shortExpireResolver.resolve(did);

    // again, we mess with the cached doc so we get something different
    didCache.cacheDid(did, { ...doc, id: "did:example:alice" });
    await wait(5);

    // see that the resolver does not return expired value & instead force refreshes
    const staleGet = await shortExpireResolver.resolve(did);
    assertEquals(staleGet?.id, did);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
