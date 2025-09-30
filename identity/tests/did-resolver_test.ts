import * as plc from "@did-plc/lib";
import { Database as DidPlcDb, PlcServer } from "@did-plc/server";
import getPort from "get-port";
// deno-lint-ignore no-import-prefix no-unversioned-import
import { Secp256k1Keypair } from "npm:@atproto/crypto";
import { type DidDocument, DidResolver } from "../mod.ts";
import { DidWebDb } from "./web/db.ts";
import { DidWebServer } from "./web/server.ts";
import { assertEquals, assertRejects } from "@std/assert";

let close: () => Promise<void>;
let webServer: DidWebServer;

let plcUrl: string;
let resolver: DidResolver;

Deno.test.beforeAll(async () => {
  const webDb = DidWebDb.memory();
  webServer = DidWebServer.create(webDb, await getPort());

  const plcDB = DidPlcDb.mock();
  const plcPort = await getPort();
  const plcServer = PlcServer.create({ db: plcDB, port: plcPort });
  await plcServer.start();

  plcUrl = "http://localhost:" + plcPort;
  resolver = new DidResolver({ plcUrl });

  close = async () => {
    await webServer.close();
    await plcServer.destroy();
  };
});

Deno.test.afterAll(async () => {
  await close();
});

const handle = "alice.test";
const pds = "https://service.test";
let signingKey: Secp256k1Keypair;
let rotationKey: Secp256k1Keypair;
let webDid: string;
let plcDid: string;
let didWebDoc: DidDocument;
let didPlcDoc: DidDocument;

Deno.test({
  name: "creates the did on did:web & did:plc",
  async fn() {
    signingKey = await Secp256k1Keypair.create();
    rotationKey = await Secp256k1Keypair.create();
    const client = new plc.Client(plcUrl);
    plcDid = await client.createDid({
      signingKey: signingKey.did(),
      handle,
      pds,
      rotationKeys: [rotationKey.did()],
      signer: rotationKey,
    });
    didPlcDoc = await client.getDocument(plcDid);
    const domain = encodeURIComponent(`localhost:${webServer.port}`);
    webDid = `did:web:${domain}`;
    didWebDoc = {
      ...didPlcDoc,
      id: webDid,
    };

    webServer.put(didWebDoc);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "resolve valid did:web",
  async fn() {
    const didRes = await resolver.ensureResolve(webDid);
    assertEquals(didRes, didWebDoc);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "resolve valid atpData from did:web",
  async fn() {
    const atpData = await resolver.resolveAtprotoData(webDid);
    assertEquals(atpData.did, webDid);
    assertEquals(atpData.handle, handle);
    assertEquals(atpData.pds, pds);
    assertEquals(atpData.signingKey, signingKey.did());
    assertEquals(atpData.handle, handle);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "throws on malformed did:webs",
  async fn() {
    await assertRejects(() => resolver.ensureResolve(`did:web:asdf`), Error);
    await assertRejects(() => resolver.ensureResolve(`did:web:`), Error);
    await assertRejects(() => resolver.ensureResolve(``), Error);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "throws on did:web with path components",
  async fn() {
    await assertRejects(
      () => resolver.ensureResolve(`did:web:example.com:u:bob`),
      Error,
    );
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "resolve valid did:plc",
  async fn() {
    const didRes = await resolver.ensureResolve(plcDid);
    assertEquals(didRes, didPlcDoc);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "resolve valid atpData from did:plc",
  async fn() {
    const atpData = await resolver.resolveAtprotoData(plcDid);
    assertEquals(atpData.did, plcDid);
    assertEquals(atpData.handle, handle);
    assertEquals(atpData.pds, pds);
    assertEquals(atpData.signingKey, signingKey.did());
    assertEquals(atpData.handle, handle);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "throws on malformed did:plc",
  async fn() {
    await assertRejects(() => resolver.ensureResolve(`did:plc:asdf`), Error);
    await assertRejects(() => resolver.ensureResolve(`did:plc`), Error);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
