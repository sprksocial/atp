import { MINUTE } from "@atp/common";
import { Secp256k1Keypair } from "@atproto/crypto";
import type { LexiconDoc } from "@atproto/lexicon";
import { XrpcClient, XRPCError } from "@atp/xrpc";
import * as xrpcServer from "../mod.ts";

import {
  basicAuthHeaders,
  closeServer,
  createBasicAuth,
  createServer,
} from "./_util.ts";
import {
  assert,
  assertEquals,
  assertObjectMatch,
  assertRejects,
} from "@std/assert";

const LEXICONS: LexiconDoc[] = [
  {
    lexicon: 1,
    id: "io.example.authTest",
    defs: {
      main: {
        type: "procedure",
        input: {
          encoding: "application/json",
          schema: {
            type: "object",
            properties: {
              present: { type: "boolean", const: true },
            },
          },
        },
        output: {
          encoding: "application/json",
          schema: {
            type: "object",
            properties: {
              username: { type: "string" },
              original: { type: "string" },
            },
          },
        },
      },
    },
  },
];

let server: ReturnType<typeof xrpcServer.createServer>;
let s: Deno.HttpServer;
let client: XrpcClient;

type AuthTestResponse = {
  username: string | undefined;
  original: string | undefined;
};

Deno.test.beforeAll(async () => {
  server = xrpcServer.createServer(LEXICONS);

  server.method("io.example.authTest", {
    auth: createBasicAuth({ username: "admin", password: "password" }),
    handler: (ctx: xrpcServer.HandlerContext) => {
      const authResult = ctx.auth as xrpcServer.AuthResult | undefined;
      const credentials = authResult?.credentials as
        | { username: string }
        | undefined;
      const artifacts = authResult?.artifacts as
        | { original: string }
        | undefined;
      return {
        encoding: "application/json",
        body: {
          username: credentials?.username,
          original: artifacts?.original,
        } satisfies AuthTestResponse,
      };
    },
  });

  s = await createServer(server);
  const port = (s as Deno.HttpServer & { port: number }).port;
  client = new XrpcClient(`http://localhost:${port}`, LEXICONS);
});

Deno.test.afterAll(async () => {
  await closeServer(s);
});

Deno.test("creates and validates service auth headers", async () => {
  const keypair = await Secp256k1Keypair.create();
  const iss = "did:example:alice";
  const aud = "did:example:bob";
  const token = await xrpcServer.createServiceJwt({
    iss,
    aud,
    keypair,
    lxm: null,
  });
  const validated = await xrpcServer.verifyJwt(
    token,
    null,
    null,
    () => keypair.did(),
  );
  assertEquals(validated.iss, iss);
  assertEquals(validated.aud, aud);
  // should expire within the minute when no exp is provided
  assert(validated.exp > Date.now() / 1000);
  assert(validated.exp < Date.now() / 1000 + 60);
  assert(typeof validated.jti === "string");
  assert(validated.lxm === undefined);
});

Deno.test("creates and validates service auth headers bound to a particular method", async () => {
  const keypair = await Secp256k1Keypair.create();
  const iss = "did:example:alice";
  const aud = "did:example:bob";
  const lxm = "com.atproto.repo.createRecord";
  const token = await xrpcServer.createServiceJwt({
    iss,
    aud,
    keypair,
    lxm,
  });
  const validated = await xrpcServer.verifyJwt(
    token,
    null,
    lxm,
    () => keypair.did(),
  );
  assertEquals(validated.iss, iss);
  assertEquals(validated.aud, aud);
  assertEquals(validated.lxm, lxm);
});

Deno.test("fails on bad auth before invalid request payload", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  try {
    await client.call(
      "io.example.authTest",
      {},
      { present: false },
      {
        headers: basicAuthHeaders({
          username: "admin",
          password: "wrong",
        }),
      },
    );
    throw new Error("Didnt throw");
  } catch (e) {
    assert(e instanceof XRPCError);
    assert(!e.success);
    assertEquals(e.error, "AuthenticationRequired");
    assertEquals(e.message, "Authentication Required");
    assertEquals(e.status, 401);
  }
});

Deno.test("fails on invalid request payload after good auth", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  try {
    await client.call(
      "io.example.authTest",
      {},
      { present: false },
      {
        headers: basicAuthHeaders({
          username: "admin",
          password: "password",
        }),
      },
    );
    throw new Error("Didnt throw");
  } catch (e) {
    assert(e instanceof XRPCError);
    assert(!e.success);
    assertEquals(e.error, "InvalidRequest");
    assertEquals(e.message, "Input/present must be true");
    assertEquals(e.status, 400);
  }
});

Deno.test("succeeds on good auth and payload", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const res = await client.call(
    "io.example.authTest",
    {},
    { present: true },
    {
      headers: basicAuthHeaders({
        username: "admin",
        password: "password",
      }),
    },
  );
  assert(res.success);
  assertEquals(res.data, {
    username: "admin",
    original: "YWRtaW46cGFzc3dvcmQ=",
  });
});

Deno.test("fails on expired jwt", async () => {
  const keypair = await Secp256k1Keypair.create();
  const jwt = await xrpcServer.createServiceJwt({
    aud: "did:example:aud",
    iss: "did:example:iss",
    keypair,
    exp: Math.floor((Date.now() - MINUTE) / 1000),
    lxm: null,
  });
  await assertRejects(
    () =>
      xrpcServer.verifyJwt(
        jwt,
        "did:example:aud",
        null,
        () => keypair.did(),
      ),
    Error,
    "jwt expired",
  );
});

Deno.test("fails on bad audience", async () => {
  const keypair = await Secp256k1Keypair.create();
  const jwt = await xrpcServer.createServiceJwt({
    aud: "did:example:aud1",
    iss: "did:example:iss",
    keypair,
    lxm: null,
  });
  await assertRejects(
    () =>
      xrpcServer.verifyJwt(
        jwt,
        "did:example:aud2",
        null,
        () => keypair.did(),
      ),
    Error,
    "jwt audience does not match service did",
  );
});

Deno.test("fails on bad lxm", async () => {
  const keypair = await Secp256k1Keypair.create();
  const jwt = await xrpcServer.createServiceJwt({
    aud: "did:example:aud1",
    iss: "did:example:iss",
    keypair,
    lxm: "com.atproto.repo.createRecord",
  });
  await assertRejects(
    () =>
      xrpcServer.verifyJwt(
        jwt,
        "did:example:aud1",
        "com.atproto.repo.putRecord",
        () => keypair.did(),
      ),
    Error,
    "bad jwt lexicon method",
  );
});

Deno.test("fails on null lxm when lxm is required", async () => {
  const keypair = await Secp256k1Keypair.create();
  const jwt = await xrpcServer.createServiceJwt({
    aud: "did:example:aud1",
    iss: "did:example:iss",
    keypair,
    lxm: null,
  });
  await assertRejects(
    () =>
      xrpcServer.verifyJwt(
        jwt,
        "did:example:aud1",
        "com.atproto.repo.putRecord",
        () => keypair.did(),
      ),
    Error,
    "missing jwt lexicon method",
  );
});

Deno.test("refreshes key on verification failure", async () => {
  const keypair1 = await Secp256k1Keypair.create();
  const keypair2 = await Secp256k1Keypair.create();
  const jwt = await xrpcServer.createServiceJwt({
    aud: "did:example:aud",
    iss: "did:example:iss",
    keypair: keypair2,
    lxm: null,
  });
  let usedKeypair1 = false;
  let usedKeypair2 = false;
  const tryVerify = await xrpcServer.verifyJwt(
    jwt,
    "did:example:aud",
    null,
    (_did, forceRefresh) => {
      if (forceRefresh) {
        usedKeypair2 = true;
        return keypair2.did();
      } else {
        usedKeypair1 = true;
        return keypair1.did();
      }
    },
  );
  assertObjectMatch(tryVerify, {
    aud: "did:example:aud",
    iss: "did:example:iss",
  });
  assert(usedKeypair1);
  assert(usedKeypair2);
});
