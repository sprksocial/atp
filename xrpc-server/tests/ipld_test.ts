import { CID } from "multiformats/cid";
import type { LexiconDoc } from "@atp/lexicon";
import { XrpcClient } from "@atp/xrpc";
import * as xrpcServer from "../mod.ts";
import { closeServer, createServer } from "./_util.ts";
import { assertEquals, assertExists } from "@std/assert";

const LEXICONS: LexiconDoc[] = [
  {
    lexicon: 1,
    id: "io.example.ipld",
    defs: {
      main: {
        type: "procedure",
        input: {
          encoding: "application/json",
          schema: {
            type: "object",
            properties: {
              cid: {
                type: "cid-link",
              },
              bytes: {
                type: "bytes",
              },
            },
          },
        },
        output: {
          encoding: "application/json",
          schema: {
            type: "object",
            properties: {
              cid: {
                type: "cid-link",
              },
              bytes: {
                type: "bytes",
              },
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

Deno.test.beforeAll(async () => {
  server = xrpcServer.createServer(LEXICONS);
  s = await createServer(server);
  server.method(
    "io.example.ipld",
    (ctx: xrpcServer.HandlerContext) => {
      const body = ctx.input?.body as { cid: unknown; bytes: unknown };
      const asCid = CID.asCID(body.cid);
      if (!(asCid instanceof CID)) {
        throw new Error("expected cid");
      }
      const bytes = body.bytes;
      if (!(bytes instanceof Uint8Array)) {
        throw new Error("expected bytes");
      }
      return {
        encoding: "application/json",
        body: {
          cid: asCid,
          bytes: bytes,
        },
      };
    },
  );

  const port = (s as Deno.HttpServer & { port: number }).port;
  client = new XrpcClient(`http://localhost:${port}`, LEXICONS);
});

Deno.test.afterAll(async () => {
  await closeServer(s);
});

Deno.test("can send and receive ipld vals", {
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const cid = CID.parse(
    "bafyreidfayvfuwqa7qlnopdjiqrxzs6blmoeu4rujcjtnci5beludirz2a",
  );
  const bytes = new Uint8Array([0, 1, 2, 3]);
  const res = await client.call(
    "io.example.ipld",
    {},
    {
      cid,
      bytes,
    },
    { encoding: "application/json" },
  );
  assertExists(res.success);
  assertEquals(
    res.headers["content-type"],
    "application/json",
  );
  assertExists(cid.equals(res.data.cid));
  assertEquals(bytes, res.data.bytes);
});
