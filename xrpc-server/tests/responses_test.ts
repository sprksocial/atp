import { byteIterableToStream } from "@atp/common";
import type { LexiconDoc } from "@atp/lexicon";
import { XrpcClient } from "@atp/xrpc";
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

async function setupServer() {
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

  const s = await createServer(server);
  const port = (s as Deno.HttpServer & { port: number }).port;
  const client = new XrpcClient(`http://localhost:${port}`, LEXICONS);

  return { server: s, client };
}

Deno.test("returns readable streams of bytes", async () => {
  const { server, client } = await setupServer();
  try {
    const res = await client.call("io.example.readableStream", {
      shouldErr: false,
    });
    const expected = new Uint8Array([0, 1, 2, 3, 4]);
    assertEquals(res.data, expected);
  } finally {
    await closeServer(server);
  }
});

Deno.test("handles errs on readable streams of bytes", async () => {
  const { server, client } = await setupServer();
  try {
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
  } finally {
    await closeServer(server);
  }
});
