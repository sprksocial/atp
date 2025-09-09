import { CID } from "multiformats/cid";
import type { LexiconDoc } from "@atproto/lexicon";
import { XrpcClient } from "@atproto/xrpc";
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

Deno.test({
  name: "IPLD Values",
  async fn() {
    // Setup
    const server = xrpcServer.createServer(LEXICONS);
    const s = await createServer(server);
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
        return { encoding: "application/json", body: ctx.input?.body };
      },
    );

    // Setup server and client
    const port = (s as Deno.HttpServer & { port: number }).port;
    const client = new XrpcClient(`http://localhost:${port}`, LEXICONS);

    try {
      Deno.test("can send and receive ipld vals", async () => {
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
          "application/json; charset=utf-8",
        );
        assertExists(cid.equals(res.data.cid));
        assertEquals(bytes, res.data.bytes);
      });
    } finally {
      // Cleanup
      await closeServer(s);
    }
  },
});
