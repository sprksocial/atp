import type { LexiconDoc } from "@atproto/lexicon";
import { XrpcClient } from "@atproto/xrpc";
import * as xrpcServer from "../mod.ts";
import { closeServer, createServer } from "./_util.ts";
import { assertEquals, assertExists } from "@std/assert";

const LEXICONS: LexiconDoc[] = [
  {
    lexicon: 1,
    id: "io.example.pingOne",
    defs: {
      main: {
        type: "query",
        parameters: {
          type: "params",
          properties: {
            message: { type: "string" },
          },
        },
        output: {
          encoding: "text/plain",
        },
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.pingTwo",
    defs: {
      main: {
        type: "query",
        parameters: {
          type: "params",
          properties: {
            message: { type: "string" },
          },
        },
        output: {
          encoding: "application/octet-stream",
        },
      },
    },
  },
  {
    lexicon: 1,
    id: "io.example.pingThree",
    defs: {
      main: {
        type: "query",
        parameters: {
          type: "params",
          properties: {
            message: { type: "string" },
          },
        },
        output: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["message"],
            properties: { message: { type: "string" } },
          },
        },
      },
    },
  },
];

Deno.test({
  name: "Queries",
  async fn() {
    // Setup
    const server = xrpcServer.createServer(LEXICONS);
    server.method(
      "io.example.pingOne",
      (ctx: { params: xrpcServer.Params }) => {
        return { encoding: "text/plain", body: ctx.params.message };
      },
    );
    server.method(
      "io.example.pingTwo",
      (ctx: { params: xrpcServer.Params }) => {
        return {
          encoding: "application/octet-stream",
          body: new TextEncoder().encode(String(ctx.params.message)),
        };
      },
    );
    server.method(
      "io.example.pingThree",
      (ctx: { params: xrpcServer.Params }) => {
        return {
          encoding: "application/json",
          body: { message: ctx.params.message },
          headers: { "x-test-header-name": "test-value" },
        };
      },
    );

    // Create server and client
    const s = await createServer(server);
    const port = (s as Deno.HttpServer & { port: number }).port;
    const client = new XrpcClient(`http://localhost:${port}`, LEXICONS);

    try {
      Deno.test("serves requests", async () => {
        const res1 = await client.call("io.example.pingOne", {
          message: "hello world",
        });
        assertExists(res1.success);
        assertEquals(res1.headers["content-type"], "text/plain; charset=utf-8");
        assertEquals(res1.data, "hello world");

        const res2 = await client.call("io.example.pingTwo", {
          message: "hello world",
        });
        assertExists(res2.success);
        assertEquals(res2.headers["content-type"], "application/octet-stream");
        assertEquals(new TextDecoder().decode(res2.data), "hello world");

        const res3 = await client.call("io.example.pingThree", {
          message: "hello world",
        });
        assertExists(res3.success);
        assertEquals(
          res3.headers["content-type"],
          "application/json; charset=utf-8",
        );
        assertEquals(res3.data?.message, "hello world");
        assertEquals(res3.headers["x-test-header-name"], "test-value");
      });
    } finally {
      // Cleanup
      await closeServer(s);
    }
  },
});
