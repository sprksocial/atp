import { byteIterableToStream } from "@atp/common";
import type { LexiconDoc } from "@atproto/lexicon";
import { XrpcClient } from "@atproto/xrpc";
import * as xrpcServer from "../mod.ts";
import { closeServer, createServer } from "./_util.ts";
import { assertEquals, assertInstanceOf } from "@std/assert";

const LEXICONS: LexiconDoc[] = [
  {
    lexicon: 1,
    id: "io.example.readableStream",
    defs: {
      main: {
        type: "query",
        parameters: {
          type: "params",
          properties: {
            shouldErr: { type: "boolean" },
          },
        },
        output: {
          encoding: "application/vnd.ipld.car",
        },
      },
    },
  },
];

Deno.test({
  name: "Responses",
  async fn() {
    // Setup
    const server = xrpcServer.createServer(LEXICONS);
    server.method(
      "io.example.readableStream",
      (ctx: { params: xrpcServer.Params }) => {
        async function* iter(): AsyncIterable<Uint8Array> {
          for (let i = 0; i < 5; i++) {
            yield new Uint8Array([i]);
          }
          if (ctx.params.shouldErr) {
            throw new Error("error");
          }
        }
        return {
          encoding: "application/vnd.ipld.car",
          body: byteIterableToStream(iter()),
        };
      },
    );

    // Create server and client
    const s = await createServer(server);
    const port = (s as Deno.HttpServer & { port: number }).port;
    const client = new XrpcClient(`http://localhost:${port}`, LEXICONS);

    try {
      Deno.test("returns readable streams of bytes", async () => {
        const res = await client.call("io.example.readableStream", {
          shouldErr: false,
        });
        const expected = new Uint8Array([0, 1, 2, 3, 4]);
        assertEquals(res.data, expected);
      });

      Deno.test("handles errs on readable streams of bytes", async () => {
        const originalConsoleError = console.error;
        console.error = () => {}; // Suppress expected error log

        let err: unknown;
        try {
          await client.call("io.example.readableStream", {
            shouldErr: true,
          });
        } catch (e) {
          err = e;
        }
        assertInstanceOf(err, Error);

        console.error = originalConsoleError; // Restore
      });
    } finally {
      // Cleanup
      await closeServer(s);
    }
  },
});
